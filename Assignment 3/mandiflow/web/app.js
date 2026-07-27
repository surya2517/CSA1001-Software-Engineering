// =====================================================================
// MandiFlow — app logic. Talks to real Supabase auth + database.
// Fill in config.js with your project URL + anon key before running.
// =====================================================================
const supabaseClient = window.supabase.createClient(
  window.MANDIFLOW_SUPABASE_URL,
  window.MANDIFLOW_SUPABASE_ANON_KEY
);

let currentProfile = null; // row from public.profiles, or null if logged out
let authMode = 'login';

// ---------- Toasts ----------
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const cls = type === 'success' ? 'bg-emerald-900 text-emerald-100' : (type === 'error' ? 'bg-red-900 text-red-100' : 'bg-slate-900 text-white');
  toast.className = `p-3 rounded-xl ${cls} shadow-lg text-xs max-w-sm`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ---------- Tabs ----------
function switchTab(tab) {
  document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
  document.getElementById('view' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.remove('hidden');
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  if (tab === 'prices') renderPrices();
  if (tab === 'arbitrage') renderPools();
  if (tab === 'trader') renderTraderListings();
  if (tab === 'shopkeeper') renderShopInventory();
  if (tab === 'admin') renderAdminQueue();
}

// =====================================================================
// AUTH
// =====================================================================
function openAuthModal() { document.getElementById('authModal').classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('authModal').classList.add('hidden'); }

function setAuthMode(mode) {
  authMode = mode;
  document.getElementById('authModalTitle').innerText = mode === 'login' ? 'Login' : 'Create Account';
  document.getElementById('authSubmitBtn').innerText = mode === 'login' ? 'Login' : 'Sign Up';
  document.getElementById('authModeLoginBtn').className = 'flex-1 py-2 ' + (mode === 'login' ? 'bg-emerald-600 text-white' : '');
  document.getElementById('authModeSignupBtn').className = 'flex-1 py-2 ' + (mode === 'signup' ? 'bg-emerald-600 text-white' : '');
  document.getElementById('signupRoleWrap').classList.toggle('hidden', mode !== 'signup');
  document.getElementById('signupNameWrap').classList.toggle('hidden', mode !== 'signup');
}

async function handleAuthSubmit() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const errEl = document.getElementById('authError');
  errEl.classList.add('hidden');

  if (!email || !password) {
    errEl.innerText = 'Email and password are required.';
    errEl.classList.remove('hidden');
    return;
  }

  if (authMode === 'signup') {
    const full_name = document.getElementById('authName').value.trim() || 'New User';
    const role = document.getElementById('authRole').value;
    const { error } = await supabaseClient.auth.signUp({
      email, password,
      options: { data: { full_name, role } }
    });
    if (error) { errEl.innerText = error.message; errEl.classList.remove('hidden'); return; }
    showToast('Account created! Check your email to confirm, then log in.', 'success');
    setAuthMode('login');
  } else {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) { errEl.innerText = error.message; errEl.classList.remove('hidden'); return; }
    closeAuthModal();
    await refreshSession();
    showToast('Logged in.', 'success');
  }
}

async function logout() {
  await supabaseClient.auth.signOut();
  currentProfile = null;
  renderAuthArea();
  switchTab('prices');
}

async function refreshSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', session.user.id).single();
    currentProfile = profile;
  } else {
    currentProfile = null;
  }
  renderAuthArea();
}

function renderAuthArea() {
  const el = document.getElementById('authArea');
  if (currentProfile) {
    el.innerHTML = `
      <div class="text-right hidden sm:block">
        <div class="text-xs font-bold">${currentProfile.full_name}</div>
        <div class="text-[10px] text-emerald-700 font-semibold">${currentProfile.role}${currentProfile.verified ? ' &middot; verified' : ''}</div>
      </div>
      <button onclick="logout()" class="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl">Logout</button>`;
  } else {
    el.innerHTML = `<button onclick="openAuthModal()" class="bg-slate-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl">Login / Register</button>`;
  }
}

// Farmer/shopkeeper/trader can request admin verification of their license
async function requestVerification() {
  if (!currentProfile) return showToast('Log in first.', 'error');
  const { error } = await supabaseClient.from('verification_requests').insert({ profile_id: currentProfile.id });
  if (error) return showToast(error.message, 'error');
  showToast('Verification request submitted to Admin.', 'success');
}

// =====================================================================
// TAB 1: MARKET RATES
// =====================================================================
async function renderPrices() {
  const grid = document.getElementById('cropGrid');
  grid.innerHTML = '<p class="text-xs text-slate-500 col-span-full">Loading live rates...</p>';

  const { data, error } = await supabaseClient
    .from('crop_prices')
    .select('*, crops(name, emoji, category), mandis(name, district, state)')
    .order('price_date', { ascending: false });

  if (error) { grid.innerHTML = `<p class="text-xs text-red-600 col-span-full">${error.message}</p>`; return; }

  const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const filtered = data.filter(r => !q || r.crops?.name?.toLowerCase().includes(q));

  if (!filtered.length) { grid.innerHTML = '<p class="text-xs text-slate-500 col-span-full">No matching crops. Add rows to crop_prices in Supabase.</p>'; return; }

  grid.innerHTML = filtered.map(r => `
    <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
      <div class="flex items-center justify-between">
        <span class="text-2xl">${r.crops?.emoji || '🌾'}</span>
        <span class="text-[10px] bg-slate-100 px-2 py-1 rounded font-bold">${r.mandis?.district || ''}, ${r.mandis?.state || ''}</span>
      </div>
      <h3 class="font-bold mt-2">${r.crops?.name || r.crop_id}</h3>
      <p class="text-[11px] text-slate-500">${r.mandis?.name || ''}</p>
      <div class="mt-3 flex items-baseline justify-between">
        <span class="text-xl font-black text-emerald-700">₹${r.grade_a}<span class="text-xs font-normal text-slate-500">/kg (Grade A)</span></span>
      </div>
      <div class="text-[11px] text-slate-500 mt-1">Grade B: ₹${r.grade_b}/kg &middot; Arrivals: ${r.arrivals_tons} tons</div>
    </div>`).join('');
}

// =====================================================================
// TAB 2: ARBITRAGE / LOGISTICS POOLS
// =====================================================================
async function renderPools() {
  const el = document.getElementById('poolsContainer');
  el.innerHTML = '<p class="text-xs text-slate-500">Loading pools...</p>';
  const { data, error } = await supabaseClient.from('logistics_pools').select('*').order('created_at', { ascending: false });
  if (error) { el.innerHTML = `<p class="text-xs text-red-600">${error.message}</p>`; return; }

  el.innerHTML = data.map(p => {
    const pct = Math.min(100, Math.round((p.filled_tons / p.capacity_tons) * 100));
    return `
    <div class="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
      <div class="flex items-center justify-between text-xs">
        <div>
          <h4 class="font-bold">${p.vehicle_number}</h4>
          <p class="text-slate-500 text-[11px]">${p.route_from} → ${p.route_to}</p>
        </div>
        <span class="bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded text-[11px]">${p.filled_tons} / ${p.capacity_tons} Tons</span>
      </div>
      <div class="w-full bg-slate-100 rounded-full h-3"><div class="bg-emerald-500 h-full rounded-full" style="width:${pct}%"></div></div>
      <div class="flex items-center justify-between pt-2 border-t">
        <span class="text-xs text-slate-600">Floor Price: ₹${p.floor_price}/kg</span>
        <button onclick="joinPool('${p.id}')" class="bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg text-xs">Reserve Slot</button>
      </div>
    </div>`;
  }).join('') || '<p class="text-xs text-slate-500">No active pools yet.</p>';
}

async function joinPool(poolId) {
  if (!currentProfile) return showToast('Log in as a farmer first.', 'error');
  const weightStr = prompt('How many tons of produce are you booking?');
  const weight = parseFloat(weightStr);
  if (!weight || weight <= 0) return;
  const { error } = await supabaseClient.from('pool_bookings').insert({
    pool_id: poolId, farmer_id: currentProfile.id, weight_tons: weight, escrow_status: 'locked'
  });
  if (error) return showToast(error.message, 'error');
  showToast('Slot reserved and booked into the truck pool!', 'success');
  renderPools();
}

// =====================================================================
// TAB 3: TRADER DESK & ESCROW
// =====================================================================
async function renderTraderListings() {
  const el = document.getElementById('traderListings');
  el.innerHTML = '<p class="text-xs text-slate-500">Loading listings...</p>';
  const { data, error } = await supabaseClient.from('trader_listings').select('*, crops(name, emoji)').order('created_at', { ascending: false });
  if (error) { el.innerHTML = `<p class="text-xs text-red-600">${error.message}</p>`; return; }

  el.innerHTML = data.map(l => `
    <div class="bg-white rounded-xl p-4 border border-slate-200 space-y-2">
      <div class="flex justify-between items-center">
        <h4 class="font-bold text-sm">${l.crops?.emoji || ''} ${l.batch_name}</h4>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded ${l.escrow_status === 'released' ? 'bg-emerald-100 text-emerald-800' : l.escrow_status === 'locked' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}">${l.escrow_status}</span>
      </div>
      <p class="text-xs text-slate-600">${l.quantity_kg} kg @ ₹${l.price_per_kg}/kg</p>
      <div class="flex gap-2 text-xs">
        <button onclick="lockEscrow('${l.id}', ${l.quantity_kg * l.price_per_kg})" class="flex-1 bg-slate-900 text-white font-bold py-2 rounded-lg">Lock Escrow</button>
        <button onclick="releaseEscrow('${l.id}')" class="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-lg">Release Payout</button>
      </div>
    </div>`).join('') || '<p class="text-xs text-slate-500">No listings yet.</p>';
}

async function openTraderListingForm() {
  if (!currentProfile) return showToast('Log in as a trader first.', 'error');
  if (currentProfile.role !== 'trader') return showToast('Only trader accounts can create listings.', 'error');
  if (!currentProfile.verified) return showToast('Your trader account is not verified yet — request verification from an admin.', 'error');

  const batch_name = prompt('Batch name (e.g. Tomato Batch #45)');
  if (!batch_name) return;
  const crop_id = prompt('Crop id (tomato / onion / chili / potato / wheat)');
  const quantity_kg = parseFloat(prompt('Quantity (kg)'));
  const price_per_kg = parseFloat(prompt('Price per kg (₹)'));
  const { error } = await supabaseClient.from('trader_listings').insert({
    trader_id: currentProfile.id, batch_name, crop_id, quantity_kg, price_per_kg
  });
  if (error) return showToast(error.message, 'error');
  showToast('Listing created.', 'success');
  renderTraderListings();
}

async function lockEscrow(id, amount) {
  const { error } = await supabaseClient.from('trader_listings').update({ escrow_amount: amount, escrow_status: 'locked' }).eq('id', id);
  if (error) return showToast(error.message, 'error');
  showToast(`₹${amount.toLocaleString('en-IN')} locked in escrow.`, 'success');
  renderTraderListings();
}

async function releaseEscrow(id) {
  const { error } = await supabaseClient.from('trader_listings').update({ escrow_status: 'released', moisture_verified: true }).eq('id', id);
  if (error) return showToast(error.message, 'error');
  showToast('Escrow released via instant payout.', 'success');
  renderTraderListings();
}

// =====================================================================
// TAB 4: SHOPKEEPER INVENTORY
// =====================================================================
async function renderShopInventory() {
  const body = document.getElementById('shopInventoryBody');
  body.innerHTML = '<tr><td class="p-3 text-xs text-slate-500" colspan="5">Loading...</td></tr>';
  const { data, error } = await supabaseClient.from('shopkeeper_inventory').select('*, crops(name, emoji)').order('updated_at', { ascending: false });
  if (error) { body.innerHTML = `<tr><td class="p-3 text-xs text-red-600" colspan="5">${error.message}</td></tr>`; return; }

  body.innerHTML = data.map(item => {
    const margin = item.wholesale_rate ? Math.round(((item.retail_rate - item.wholesale_rate) / item.wholesale_rate) * 100) : 0;
    return `<tr>
      <td class="p-3">${item.crops?.emoji || ''} ${item.crops?.name || item.crop_id}</td>
      <td class="p-3">₹${item.wholesale_rate}/kg</td>
      <td class="p-3 font-bold text-emerald-700">₹${item.retail_rate}/kg</td>
      <td class="p-3">${item.stock_kg} kg</td>
      <td class="p-3"><span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">+${margin}%</span></td>
    </tr>`;
  }).join('') || '<tr><td class="p-3 text-xs text-slate-500" colspan="5">No inventory listed yet.</td></tr>';
}

async function openShopItemForm() {
  if (!currentProfile) return showToast('Log in as a shopkeeper first.', 'error');
  if (currentProfile.role !== 'shopkeeper') return showToast('Only shopkeeper accounts can add inventory.', 'error');
  if (!currentProfile.verified) return showToast('Your shop is not verified yet — request verification from an admin.', 'error');

  const crop_id = prompt('Crop id (tomato / onion / chili / potato / wheat)');
  const wholesale_rate = parseFloat(prompt('Wholesale mandi buy rate (₹/kg)'));
  const retail_rate = parseFloat(prompt('Your retail selling price (₹/kg)'));
  const stock_kg = parseFloat(prompt('Current stock (kg)'));
  const { error } = await supabaseClient.from('shopkeeper_inventory').insert({
    shopkeeper_id: currentProfile.id, crop_id, wholesale_rate, retail_rate, stock_kg
  });
  if (error) return showToast(error.message, 'error');
  showToast('Retail item added.', 'success');
  renderShopInventory();
}

// =====================================================================
// TAB 5: ADMIN VERIFICATION
// =====================================================================
async function renderAdminQueue() {
  const body = document.getElementById('adminVerificationTable');
  if (!currentProfile || currentProfile.role !== 'admin') {
    body.innerHTML = '<tr><td class="p-3 text-xs text-slate-500" colspan="5">Admin login required.</td></tr>';
    return;
  }
  body.innerHTML = '<tr><td class="p-3 text-xs text-slate-500" colspan="5">Loading...</td></tr>';
  const { data, error } = await supabaseClient
    .from('verification_requests')
    .select('*, profiles(full_name, role, mobile, license_number)')
    .eq('status', 'pending');
  if (error) { body.innerHTML = `<tr><td class="p-3 text-xs text-red-600" colspan="5">${error.message}</td></tr>`; return; }

  body.innerHTML = data.map(r => `
    <tr>
      <td class="p-3">${r.profiles?.full_name}</td>
      <td class="p-3">${r.profiles?.role}</td>
      <td class="p-3">${r.profiles?.mobile || '—'}</td>
      <td class="p-3">${r.profiles?.license_number || '—'}</td>
      <td class="p-3 space-x-2">
        <button onclick="reviewRequest('${r.id}', 'approved')" class="text-emerald-700 font-bold">Approve</button>
        <button onclick="reviewRequest('${r.id}', 'rejected')" class="text-red-600 font-bold">Reject</button>
      </td>
    </tr>`).join('') || '<tr><td class="p-3 text-xs text-slate-500" colspan="5">No pending requests.</td></tr>';
}

async function reviewRequest(id, status) {
  const { error } = await supabaseClient.from('verification_requests').update({
    status, reviewed_by: currentProfile.id, reviewed_at: new Date().toISOString()
  }).eq('id', id);
  if (error) return showToast(error.message, 'error');
  showToast(`Request ${status}.`, 'success');
  renderAdminQueue();
}

// =====================================================================
// BOOTSTRAP
// =====================================================================
supabaseClient.auth.onAuthStateChange(() => refreshSession());
refreshSession().then(() => switchTab('prices'));

# MandiFlow — Backend, Web, and Mobile

This turns the original static mockup into a real, working system:

```
mandiflow/
├── database/schema.sql   ← run once in Supabase
├── web/                  ← works on any laptop browser, right now
└── mobile/               ← React Native (Expo) app, for iOS/Android app stores
```

Both `web/` and `mobile/` talk to the **same Supabase project** — same users,
same login, same live data. A price a shopkeeper edits on their phone shows
up on the laptop site instantly.

---

## Step 1 — Database (5 minutes)

1. Go to https://supabase.com/dashboard → your project (or create a new free one).
2. Left sidebar → **SQL Editor** → **New query**.
3. Open `database/schema.sql` from this folder, copy all of it, paste it in, click **Run**.
4. Left sidebar → **Table Editor** — you should now see `profiles`, `crops`,
   `crop_prices`, `mandis`, `logistics_pools`, `pool_bookings`,
   `trader_listings`, `shopkeeper_inventory`, `verification_requests`, all
   pre-filled with the same sample crops/mandis from the original mockup.
5. Left sidebar → **Settings → API**. Copy the **Project URL** and the
   **anon public** key — you'll paste these into both the web and mobile app
   next.

⚠️ Use the **anon public** key, never the `service_role` key, in `web/` or
`mobile/` — the service_role key bypasses all the security rules and must
never leave your server.

---

## Step 2 — Web app (works immediately, no build step)

1. Open `web/config.js` and paste in your Project URL + anon key:
   ```js
   window.MANDIFLOW_SUPABASE_URL = "https://xxxxx.supabase.co";
   window.MANDIFLOW_SUPABASE_ANON_KEY = "eyJhbGc...";
   ```
2. Open `web/index.html` directly in a browser, or serve the folder with
   any static host (Vercel, Netlify, GitHub Pages, or just double-click it).
3. Click **Login / Register** → **Sign Up**, pick a role (farmer, shopkeeper,
   trader, admin), create an account. Supabase will email a confirmation
   link — click it, then log in.
4. To try the full flow: sign up as **admin** once, then sign up a second
   test account as **shopkeeper** or **trader**. Log in as admin → **Admin
   Verification** tab → approve the pending account. Only after that can a
   shopkeeper/trader add inventory or listings (this mirrors the license
   verification your original design called for).

This is also installable as a home-screen app on a phone (there's a
`manifest.json` already wired in) — open it in Chrome on Android or Safari
on iOS and use "Add to Home Screen." That's a genuine app-like experience
with zero app-store review, useful for pilots while the native app below
goes through submission.

---

## Step 3 — Mobile app (React Native / Expo, for the App Store & Play Store)

### Run it on your own phone first (no store needed)
```bash
cd mobile
npm install
npx expo start
```
Scan the QR code with the **Expo Go** app (App Store / Play Store) on your
phone. Before that works, paste your Supabase URL + anon key into
`mobile/src/lib/supabase.js` (same two values as Step 2).

### Build for the actual app stores
This requires accounts I can't create for you:
- An **Apple Developer** account ($99/yr) to submit to the App Store
- A **Google Play Console** account ($25 one-time) to submit to Play

Once you have those:
```bash
npm install -g eas-cli
eas login
eas build:configure
```
Then, from inside `mobile/`:
```bash
npm run build:android   # produces an .aab for Play Console
npm run build:ios       # produces a build for App Store Connect
npm run submit:android  # uploads it to Play Console
npm run submit:ios      # uploads it to App Store Connect
```
Before your first build, edit `mobile/app.json` and change
`com.yourcompany.mandiflow` to your own reverse-domain identifier (e.g.
`com.mandiflow.app`) for both `ios.bundleIdentifier` and `android.package`.

EAS Build runs in Expo's cloud, so you don't need Xcode or Android Studio
installed locally even for the iOS build.

---

## What's wired for real vs. what's still a stub

| Feature | Status |
|---|---|
| Login/signup per role, sessions | Real (Supabase Auth) |
| Market rates, mandi/crop data | Real (Postgres tables, RLS) |
| Truck pool booking + fill tracking | Real (DB trigger updates capacity) |
| Trader escrow lock/release | Real DB state; **no real payment processor wired** — this flips a status flag, it does not move money. Wiring Razorpay/UPI is a separate integration once you have a payment gateway account. |
| Shopkeeper inventory CRUD | Real |
| Admin verification approve/reject | Real (flips `profiles.verified` via trigger) |
| Voice search, price chart forecasting, SMS/language switching | Cosmetic in the original mockup — not touched; wire these up if/when you want them backed by a real speech or forecasting API |

---

## Security note
Row Level Security is on for every table. Shopkeepers/traders can only
write their own rows, and only once an admin has approved them. Reference
data (crops, mandis, prices, pools) is publicly readable but only
admin-writable. Read `database/schema.sql` top to bottom if you want to
change who can do what.

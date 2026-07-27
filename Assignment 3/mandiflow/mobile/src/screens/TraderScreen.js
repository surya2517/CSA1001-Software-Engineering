import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, Modal } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export default function TraderScreen() {
  const { profile } = useAuth();
  const [listings, setListings] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ batch_name: '', crop_id: '', quantity_kg: '', price_per_kg: '' });

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('trader_listings').select('*, crops(name, emoji)').order('created_at', { ascending: false });
    if (!error) setListings(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createListing() {
    if (!profile) return Alert.alert('Login required', 'Log in as a trader first.');
    if (profile.role !== 'trader') return Alert.alert('Not allowed', 'Only trader accounts can create listings.');
    if (!profile.verified) return Alert.alert('Not verified', 'Ask an admin to verify your trader account first.');
    const { error } = await supabase.from('trader_listings').insert({
      trader_id: profile.id,
      batch_name: form.batch_name,
      crop_id: form.crop_id,
      quantity_kg: parseFloat(form.quantity_kg) || 0,
      price_per_kg: parseFloat(form.price_per_kg) || 0,
    });
    setFormOpen(false);
    setForm({ batch_name: '', crop_id: '', quantity_kg: '', price_per_kg: '' });
    if (error) return Alert.alert('Error', error.message);
    load();
  }

  async function lockEscrow(item) {
    const amount = item.quantity_kg * item.price_per_kg;
    const { error } = await supabase.from('trader_listings').update({ escrow_amount: amount, escrow_status: 'locked' }).eq('id', item.id);
    if (error) return Alert.alert('Error', error.message);
    load();
  }

  async function releaseEscrow(item) {
    const { error } = await supabase.from('trader_listings').update({ escrow_status: 'released', moisture_verified: true }).eq('id', item.id);
    if (error) return Alert.alert('Error', error.message);
    load();
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.newBtn} onPress={() => setFormOpen(true)}>
        <Text style={styles.newBtnText}>+ New Listing</Text>
      </TouchableOpacity>

      <FlatList
        data={listings}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.batch}>{item.crops?.emoji} {item.batch_name}</Text>
            <Text style={styles.details}>{item.quantity_kg} kg @ ₹{item.price_per_kg}/kg · {item.escrow_status}</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.lockBtn} onPress={() => lockEscrow(item)}><Text style={styles.btnText}>Lock Escrow</Text></TouchableOpacity>
              <TouchableOpacity style={styles.releaseBtn} onPress={() => releaseEscrow(item)}><Text style={styles.btnText}>Release Payout</Text></TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No listings yet.</Text>}
      />

      <Modal visible={formOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>New Trader Listing</Text>
            <TextInput style={styles.input} placeholder="Batch name" value={form.batch_name} onChangeText={t => setForm({ ...form, batch_name: t })} />
            <TextInput style={styles.input} placeholder="Crop id (tomato/onion/...)" value={form.crop_id} onChangeText={t => setForm({ ...form, crop_id: t })} />
            <TextInput style={styles.input} placeholder="Quantity (kg)" keyboardType="numeric" value={form.quantity_kg} onChangeText={t => setForm({ ...form, quantity_kg: t })} />
            <TextInput style={styles.input} placeholder="Price per kg (₹)" keyboardType="numeric" value={form.price_per_kg} onChangeText={t => setForm({ ...form, price_per_kg: t })} />
            <TouchableOpacity style={styles.newBtn} onPress={createListing}><Text style={styles.newBtnText}>Create</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setFormOpen(false)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  newBtn: { backgroundColor: '#059669', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  batch: { fontWeight: '700', fontSize: 13 },
  details: { fontSize: 11, color: '#64748b', marginTop: 2, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  lockBtn: { flex: 1, backgroundColor: '#0f172a', padding: 10, borderRadius: 8, alignItems: 'center' },
  releaseBtn: { flex: 1, backgroundColor: '#059669', padding: 10, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#64748b', fontSize: 12, marginTop: 30 },
  modalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontWeight: '700', fontSize: 14, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, marginBottom: 10, fontSize: 13 },
  cancel: { textAlign: 'center', color: '#64748b', marginTop: 10, fontSize: 12 },
});

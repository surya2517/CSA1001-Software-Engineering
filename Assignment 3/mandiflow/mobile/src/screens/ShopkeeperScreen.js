import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, Modal } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export default function ShopkeeperScreen() {
  const { profile } = useAuth();
  const [items, setItems] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ crop_id: '', wholesale_rate: '', retail_rate: '', stock_kg: '' });

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('shopkeeper_inventory').select('*, crops(name, emoji)').order('updated_at', { ascending: false });
    if (!error) setItems(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addItem() {
    if (!profile) return Alert.alert('Login required', 'Log in as a shopkeeper first.');
    if (profile.role !== 'shopkeeper') return Alert.alert('Not allowed', 'Only shopkeeper accounts can add inventory.');
    if (!profile.verified) return Alert.alert('Not verified', 'Ask an admin to verify your shop first.');
    const { error } = await supabase.from('shopkeeper_inventory').insert({
      shopkeeper_id: profile.id,
      crop_id: form.crop_id,
      wholesale_rate: parseFloat(form.wholesale_rate) || 0,
      retail_rate: parseFloat(form.retail_rate) || 0,
      stock_kg: parseFloat(form.stock_kg) || 0,
    });
    setFormOpen(false);
    setForm({ crop_id: '', wholesale_rate: '', retail_rate: '', stock_kg: '' });
    if (error) return Alert.alert('Error', error.message);
    load();
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.newBtn} onPress={() => setFormOpen(true)}>
        <Text style={styles.newBtnText}>+ Add Retail Item</Text>
      </TouchableOpacity>

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const margin = item.wholesale_rate ? Math.round(((item.retail_rate - item.wholesale_rate) / item.wholesale_rate) * 100) : 0;
          return (
            <View style={styles.card}>
              <Text style={styles.name}>{item.crops?.emoji} {item.crops?.name}</Text>
              <Text style={styles.details}>Wholesale ₹{item.wholesale_rate}/kg → Retail ₹{item.retail_rate}/kg · {item.stock_kg} kg stock · +{margin}%</Text>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No inventory listed yet.</Text>}
      />

      <Modal visible={formOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Retail Item</Text>
            <TextInput style={styles.input} placeholder="Crop id (tomato/onion/...)" value={form.crop_id} onChangeText={t => setForm({ ...form, crop_id: t })} />
            <TextInput style={styles.input} placeholder="Wholesale rate (₹/kg)" keyboardType="numeric" value={form.wholesale_rate} onChangeText={t => setForm({ ...form, wholesale_rate: t })} />
            <TextInput style={styles.input} placeholder="Retail rate (₹/kg)" keyboardType="numeric" value={form.retail_rate} onChangeText={t => setForm({ ...form, retail_rate: t })} />
            <TextInput style={styles.input} placeholder="Stock (kg)" keyboardType="numeric" value={form.stock_kg} onChangeText={t => setForm({ ...form, stock_kg: t })} />
            <TouchableOpacity style={styles.newBtn} onPress={addItem}><Text style={styles.newBtnText}>Add</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setFormOpen(false)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  newBtn: { backgroundColor: '#4f46e5', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  name: { fontWeight: '700', fontSize: 13 },
  details: { fontSize: 11, color: '#64748b', marginTop: 4 },
  empty: { textAlign: 'center', color: '#64748b', fontSize: 12, marginTop: 30 },
  modalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontWeight: '700', fontSize: 14, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, marginBottom: 10, fontSize: 13 },
  cancel: { textAlign: 'center', color: '#64748b', marginTop: 10, fontSize: 12 },
});

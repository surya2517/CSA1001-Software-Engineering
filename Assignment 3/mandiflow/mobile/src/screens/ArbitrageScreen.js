import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, TextInput } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export default function ArbitrageScreen() {
  const { profile } = useAuth();
  const [pools, setPools] = useState([]);
  const [modalPool, setModalPool] = useState(null);
  const [weight, setWeight] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('logistics_pools').select('*').order('created_at', { ascending: false });
    if (!error) setPools(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function confirmJoin() {
    if (!profile) return Alert.alert('Login required', 'Log in as a farmer to reserve a slot.');
    const w = parseFloat(weight);
    if (!w || w <= 0) return;
    const { error } = await supabase.from('pool_bookings').insert({
      pool_id: modalPool.id, farmer_id: profile.id, weight_tons: w, escrow_status: 'locked',
    });
    setModalPool(null);
    setWeight('');
    if (error) return Alert.alert('Error', error.message);
    Alert.alert('Booked', 'Your produce slot has been reserved in the truck.');
    load();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={pools}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const pct = Math.min(100, Math.round((item.filled_tons / item.capacity_tons) * 100));
          return (
            <View style={styles.card}>
              <Text style={styles.vehicle}>{item.vehicle_number}</Text>
              <Text style={styles.route}>{item.route_from} → {item.route_to}</Text>
              <View style={styles.barBg}><View style={[styles.barFill, { width: `${pct}%` }]} /></View>
              <Text style={styles.fill}>{item.filled_tons} / {item.capacity_tons} tons filled · Floor ₹{item.floor_price}/kg</Text>
              <TouchableOpacity style={styles.joinBtn} onPress={() => setModalPool(item)}>
                <Text style={styles.joinText}>Reserve Slot</Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No active pools yet.</Text>}
      />

      <Modal visible={!!modalPool} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reserve slot in {modalPool?.vehicle_number}</Text>
            <TextInput style={styles.input} placeholder="Weight in tons" keyboardType="numeric" value={weight} onChangeText={setWeight} />
            <TouchableOpacity style={styles.joinBtn} onPress={confirmJoin}><Text style={styles.joinText}>Confirm Booking</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setModalPool(null)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  vehicle: { fontWeight: '800', fontSize: 14 },
  route: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  barBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 8, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: '#10b981' },
  fill: { fontSize: 11, color: '#475569', marginTop: 6, marginBottom: 8 },
  joinBtn: { backgroundColor: '#059669', padding: 10, borderRadius: 10, alignItems: 'center' },
  joinText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  empty: { textAlign: 'center', color: '#64748b', fontSize: 12, marginTop: 30 },
  modalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontWeight: '700', fontSize: 14, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, marginBottom: 12, fontSize: 13 },
  cancel: { textAlign: 'center', color: '#64748b', marginTop: 10, fontSize: 12 },
});

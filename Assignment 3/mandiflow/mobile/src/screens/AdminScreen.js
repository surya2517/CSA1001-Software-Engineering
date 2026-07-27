import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export default function AdminScreen() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState([]);

  const load = useCallback(async () => {
    if (!profile || profile.role !== 'admin') return;
    const { data, error } = await supabase
      .from('verification_requests')
      .select('*, profiles(full_name, role, mobile, license_number)')
      .eq('status', 'pending');
    if (!error) setRequests(data);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  async function review(id, status) {
    const { error } = await supabase.from('verification_requests').update({
      status, reviewed_by: profile.id, reviewed_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) return Alert.alert('Error', error.message);
    load();
  }

  if (!profile || profile.role !== 'admin') {
    return <View style={styles.container}><Text style={styles.empty}>Admin login required.</Text></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.profiles?.full_name} · {item.profiles?.role}</Text>
            <Text style={styles.details}>{item.profiles?.mobile || '—'} · License: {item.profiles?.license_number || '—'}</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.approveBtn} onPress={() => review(item.id, 'approved')}><Text style={styles.btnText}>Approve</Text></TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => review(item.id, 'rejected')}><Text style={styles.btnText}>Reject</Text></TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No pending requests.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  name: { fontWeight: '700', fontSize: 13 },
  details: { fontSize: 11, color: '#64748b', marginTop: 2, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  approveBtn: { flex: 1, backgroundColor: '#059669', padding: 10, borderRadius: 8, alignItems: 'center' },
  rejectBtn: { flex: 1, backgroundColor: '#dc2626', padding: 10, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#64748b', fontSize: 12, marginTop: 30 },
});

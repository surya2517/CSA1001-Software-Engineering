import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, RefreshControl } from 'react-native';
import { supabase } from '../lib/supabase';

export default function PricesScreen() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const { data, error } = await supabase
      .from('crop_prices')
      .select('*, crops(name, emoji), mandis(name, district, state)')
      .order('price_date', { ascending: false });
    if (!error) setRows(data);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r => !query || r.crops?.name?.toLowerCase().includes(query.toLowerCase()));

  return (
    <View style={styles.container}>
      <TextInput style={styles.search} placeholder="Search crop..." value={query} onChangeText={setQuery} />
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.emoji}>{item.crops?.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cropName}>{item.crops?.name}</Text>
              <Text style={styles.mandi}>{item.mandis?.name} · {item.mandis?.district}, {item.mandis?.state}</Text>
            </View>
            <Text style={styles.price}>₹{item.grade_a}/kg</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No prices yet — add rows in Supabase → crop_prices.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  search: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, marginBottom: 12, fontSize: 13 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  emoji: { fontSize: 26, marginRight: 10 },
  cropName: { fontWeight: '700', fontSize: 14 },
  mandi: { fontSize: 11, color: '#64748b' },
  price: { fontWeight: '800', color: '#047857', fontSize: 16 },
  empty: { textAlign: 'center', color: '#64748b', fontSize: 12, marginTop: 30 },
});

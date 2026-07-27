import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../lib/AuthContext';

const ROLES = ['user', 'farmer', 'shopkeeper', 'trader', 'admin'];

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('user');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email || !password) return Alert.alert('Missing info', 'Email and password are required.');
    setBusy(true);
    const { error } = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password, fullName || 'New User', role);
    setBusy(false);
    if (error) return Alert.alert('Error', error.message);
    if (mode === 'signup') Alert.alert('Check your email', 'Confirm your account, then log in.');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>MandiFlow</Text>
      <Text style={styles.subtitle}>{mode === 'login' ? 'Log in to your account' : 'Create an account'}</Text>

      <View style={styles.toggleRow}>
        <TouchableOpacity onPress={() => setMode('login')} style={[styles.toggleBtn, mode === 'login' && styles.toggleActive]}>
          <Text style={mode === 'login' ? styles.toggleTextActive : styles.toggleText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMode('signup')} style={[styles.toggleBtn, mode === 'signup' && styles.toggleActive]}>
          <Text style={mode === 'signup' ? styles.toggleTextActive : styles.toggleText}>Sign Up</Text>
        </TouchableOpacity>
      </View>

      {mode === 'signup' && (
        <>
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Ramesh Kumar" />
          <Text style={styles.label}>Role</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={role} onValueChange={setRole}>
              {ROLES.map(r => <Picker.Item key={r} label={r} value={r} />)}
            </Picker>
          </View>
        </>
      )}

      <Text style={styles.label}>Email</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Text style={styles.label}>Password</Text>
      <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

      <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={busy}>
        <Text style={styles.submitText}>{busy ? 'Please wait...' : (mode === 'login' ? 'Login' : 'Sign Up')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, flexGrow: 1, justifyContent: 'center', backgroundColor: '#f8fafc' },
  title: { fontSize: 28, fontWeight: '800', color: '#059669', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 20 },
  toggleRow: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  toggleBtn: { flex: 1, padding: 10, alignItems: 'center' },
  toggleActive: { backgroundColor: '#059669' },
  toggleText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  toggleTextActive: { fontSize: 12, fontWeight: '700', color: '#fff' },
  label: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, fontSize: 13 },
  pickerWrap: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10 },
  submitBtn: { backgroundColor: '#059669', padding: 14, borderRadius: 12, marginTop: 20, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});

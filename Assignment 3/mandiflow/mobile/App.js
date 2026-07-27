import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/lib/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import PricesScreen from './src/screens/PricesScreen';
import ArbitrageScreen from './src/screens/ArbitrageScreen';
import TraderScreen from './src/screens/TraderScreen';
import ShopkeeperScreen from './src/screens/ShopkeeperScreen';
import AdminScreen from './src/screens/AdminScreen';

const Tab = createBottomTabNavigator();

function TopBar() {
  const { profile, signOut } = useAuth();
  return (
    <View style={styles.topBar}>
      <Text style={styles.brand}>MandiFlow</Text>
      {profile && (
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.logout}>{profile.full_name} · Logout</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function MainTabs() {
  return (
    <>
      <TopBar />
      <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#059669' }}>
        <Tab.Screen name="Rates" component={PricesScreen} />
        <Tab.Screen name="Logistics" component={ArbitrageScreen} />
        <Tab.Screen name="Trader" component={TraderScreen} />
        <Tab.Screen name="Shopkeeper" component={ShopkeeperScreen} />
        <Tab.Screen name="Admin" component={AdminScreen} />
      </Tab.Navigator>
    </>
  );
}

function Root() {
  const { profile, loading } = useAuth();
  // This build requires login before showing any tab. If you'd rather let
  // guests browse Market Rates without an account, swap this for a version
  // where MainTabs renders regardless of `profile`, and each screen prompts
  // for login only when the user tries to book/list/approve something
  // (that's how the web app in /web is built).
  if (loading) return null;
  return profile ? <MainTabs /> : (
    <>
      <TopBarGuest />
      <AuthScreen />
    </>
  );
}

function TopBarGuest() {
  return (
    <View style={styles.topBar}>
      <Text style={styles.brand}>MandiFlow</Text>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <Root />
          <StatusBar style="dark" />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 18, fontWeight: '800', color: '#059669' },
  logout: { fontSize: 11, color: '#64748b' },
});

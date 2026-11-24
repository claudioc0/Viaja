import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { colors } from '../../src/utils/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '800' },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Buscar Viagens',
          tabBarLabel: 'Buscar',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>🚌</Text>,
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'Minhas Passagens',
          tabBarLabel: 'Passagens',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>🎫</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Meu Perfil',
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}

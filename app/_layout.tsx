import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { COLORS } from '../constants/theme';
import FloatingTimer from '../components/FloatingTimer';

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.bg },
          headerTintColor: COLORS.textPrimary,
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: COLORS.bg },
        }}
      />
      <FloatingTimer />
    </View>
  );
}

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { initOfflineDB } from '../src/utils/offlineStorage';
import { registerForPushNotifications, setupNotificationListeners } from '../src/utils/notifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 30,
      retry: 1,
    },
  },
});

function AuthGuard() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    // Initialize offline DB
    initOfflineDB().catch(console.error);

    // Setup push notifications
    registerForPushNotifications().catch(console.error);

    // Setup notification listeners
    const cleanup = setupNotificationListeners();
    return cleanup;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="scanner"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Scan Barcode',
            headerStyle: { backgroundColor: '#0369a1' },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen
          name="product/[id]"
          options={{
            presentation: 'card',
            headerShown: true,
            headerTitle: 'Product Detail',
            headerStyle: { backgroundColor: '#fff' },
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </QueryClientProvider>
  );
}

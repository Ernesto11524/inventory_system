import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// expo-device polyfill via Constants
const isDevice = Constants.isDevice ?? true;
import { Platform } from 'react-native';
import { apiPost } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('stock-alerts', {
        name: 'Stock Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0ea5e9',
      });
    }

    // Register token with backend
    try {
      await apiPost('/users/push-token', { token });
    } catch {
      // Silent fail - token registration is non-critical
    }

    return token;
  } catch (err) {
    console.error('Failed to get push token:', err);
    return null;
  }
}

export function setupNotificationListeners() {
  const sub1 = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received:', notification);
  });

  const sub2 = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (data?.type === 'low_stock' || data?.type === 'out_of_stock') {
      // Navigate to product - handled in root layout
    }
  });

  return () => {
    sub1.remove();
    sub2.remove();
  };
}

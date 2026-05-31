"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RootLayout;
const react_1 = require("react");
const expo_router_1 = require("expo-router");
const react_query_1 = require("@tanstack/react-query");
const expo_status_bar_1 = require("expo-status-bar");
const authStore_1 = require("../src/store/authStore");
const offlineStorage_1 = require("../src/utils/offlineStorage");
const notifications_1 = require("../src/utils/notifications");
const queryClient = new react_query_1.QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 2,
            gcTime: 1000 * 60 * 30,
            retry: 1,
        },
    },
});
function AuthGuard() {
    const { isAuthenticated } = (0, authStore_1.useAuthStore)();
    const router = (0, expo_router_1.useRouter)();
    const segments = (0, expo_router_1.useSegments)();
    (0, react_1.useEffect)(() => {
        const inAuthGroup = segments[0] === '(auth)';
        if (!isAuthenticated && !inAuthGroup) {
            router.replace('/(auth)/login');
        }
        else if (isAuthenticated && inAuthGroup) {
            router.replace('/(tabs)');
        }
    }, [isAuthenticated, segments]);
    return null;
}
function RootLayout() {
    (0, react_1.useEffect)(() => {
        // Initialize offline DB
        (0, offlineStorage_1.initOfflineDB)().catch(console.error);
        // Setup push notifications
        (0, notifications_1.registerForPushNotifications)().catch(console.error);
        // Setup notification listeners
        const cleanup = (0, notifications_1.setupNotificationListeners)();
        return cleanup;
    }, []);
    return (<react_query_1.QueryClientProvider client={queryClient}>
      <AuthGuard />
      <expo_router_1.Stack screenOptions={{ headerShown: false }}>
        <expo_router_1.Stack.Screen name="(auth)"/>
        <expo_router_1.Stack.Screen name="(tabs)"/>
        <expo_router_1.Stack.Screen name="scanner" options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Scan Barcode',
            headerStyle: { backgroundColor: '#0369a1' },
            headerTintColor: '#fff',
        }}/>
        <expo_router_1.Stack.Screen name="product/[id]" options={{
            presentation: 'card',
            headerShown: true,
            headerTitle: 'Product Detail',
            headerStyle: { backgroundColor: '#fff' },
        }}/>
      </expo_router_1.Stack>
      <expo_status_bar_1.StatusBar style="auto"/>
    </react_query_1.QueryClientProvider>);
}
//# sourceMappingURL=_layout.js.map
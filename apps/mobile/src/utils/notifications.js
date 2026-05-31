"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerForPushNotifications = registerForPushNotifications;
exports.setupNotificationListeners = setupNotificationListeners;
const Notifications = __importStar(require("expo-notifications"));
const expo_constants_1 = __importDefault(require("expo-constants"));
const react_native_1 = require("react-native");
// expo-device polyfill via Constants
const isDevice = expo_constants_1.default.isDevice ?? true;
const api_1 = require("./api");
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});
async function registerForPushNotifications() {
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
        const projectId = expo_constants_1.default.expoConfig?.extra?.eas?.projectId;
        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        if (react_native_1.Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('stock-alerts', {
                name: 'Stock Alerts',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#0ea5e9',
            });
        }
        // Register token with backend
        try {
            await (0, api_1.apiPost)('/users/push-token', { token });
        }
        catch {
            // Silent fail - token registration is non-critical
        }
        return token;
    }
    catch (err) {
        console.error('Failed to get push token:', err);
        return null;
    }
}
function setupNotificationListeners() {
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
//# sourceMappingURL=notifications.js.map
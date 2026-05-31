"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TabsLayout;
const expo_router_1 = require("expo-router");
const react_native_1 = require("react-native");
function TabIcon({ icon, focused }) {
    return (<react_native_1.Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</react_native_1.Text>);
}
function TabsLayout() {
    return (<expo_router_1.Tabs screenOptions={{
            tabBarActiveTintColor: '#0ea5e9',
            tabBarInactiveTintColor: '#9ca3af',
            tabBarStyle: {
                backgroundColor: '#fff',
                borderTopColor: '#e5e7eb',
                borderTopWidth: 1,
                paddingBottom: 8,
                paddingTop: 4,
                height: 64,
            },
            tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: '600',
            },
            headerStyle: { backgroundColor: '#fff' },
            headerTitleStyle: { fontWeight: '700', color: '#111827' },
            headerShadowVisible: false,
        }}>
      <expo_router_1.Tabs.Screen name="index" options={{
            title: 'Dashboard',
            tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused}/>,
            headerTitle: 'StockFlow',
        }}/>
      <expo_router_1.Tabs.Screen name="products" options={{
            title: 'Products',
            tabBarIcon: ({ focused }) => <TabIcon icon="📦" focused={focused}/>,
        }}/>
      <expo_router_1.Tabs.Screen name="scan" options={{
            title: 'Scan',
            tabBarIcon: ({ focused }) => <TabIcon icon="📷" focused={focused}/>,
        }}/>
      <expo_router_1.Tabs.Screen name="inventory" options={{
            title: 'Inventory',
            tabBarIcon: ({ focused }) => <TabIcon icon="🏪" focused={focused}/>,
        }}/>
      <expo_router_1.Tabs.Screen name="alerts" options={{
            title: 'Alerts',
            tabBarIcon: ({ focused }) => <TabIcon icon="🔔" focused={focused}/>,
        }}/>
    </expo_router_1.Tabs>);
}
//# sourceMappingURL=_layout.js.map
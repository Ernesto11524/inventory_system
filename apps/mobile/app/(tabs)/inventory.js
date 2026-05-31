"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = InventoryTab;
// inventory.tsx
const react_native_1 = require("react-native");
const react_query_1 = require("@tanstack/react-query");
const expo_router_1 = require("expo-router");
const api_1 = require("../../src/utils/api");
function InventoryTab() {
    const router = (0, expo_router_1.useRouter)();
    const { data, isLoading, refetch, isRefetching } = (0, react_query_1.useQuery)({
        queryKey: ['mobile-inventory'],
        queryFn: () => (0, api_1.apiGet)('/inventory/low-stock'),
        refetchInterval: 60000,
    });
    const items = data || [];
    return (<react_native_1.View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <react_native_1.View style={{
            backgroundColor: '#fff',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
        }}>
        <react_native_1.Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
          ⚠️ Low Stock Items
        </react_native_1.Text>
        <react_native_1.Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
          {items.length} item{items.length !== 1 ? 's' : ''} below minimum level
        </react_native_1.Text>
      </react_native_1.View>

      {isLoading ? (<react_native_1.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <react_native_1.ActivityIndicator color="#0ea5e9" size="large"/>
        </react_native_1.View>) : items.length === 0 ? (<react_native_1.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <react_native_1.Text style={{ fontSize: 48, marginBottom: 12 }}>✅</react_native_1.Text>
          <react_native_1.Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>All stocked up!</react_native_1.Text>
          <react_native_1.Text style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>No low stock items</react_native_1.Text>
        </react_native_1.View>) : (<react_native_1.FlatList data={items} keyExtractor={(item) => item.id} refreshControl={<react_native_1.RefreshControl refreshing={isRefetching} onRefresh={refetch}/>} renderItem={({ item }) => {
                const pct = Math.min(100, ((item.currentStock / item.minStockLevel) * 100));
                const isOut = item.currentStock <= 0;
                return (<react_native_1.TouchableOpacity onPress={() => router.push(`/product/${item.productId}`)} style={{
                        backgroundColor: '#fff',
                        marginHorizontal: 16,
                        marginTop: 10,
                        borderRadius: 14,
                        padding: 16,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 4,
                        elevation: 2,
                        borderLeftWidth: 4,
                        borderLeftColor: isOut ? '#dc2626' : '#f59e0b',
                    }}>
                <react_native_1.View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <react_native_1.View style={{ flex: 1 }}>
                    <react_native_1.Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }} numberOfLines={1}>
                      {item.productName}
                    </react_native_1.Text>
                    <react_native_1.Text style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>
                      {item.productSku}
                    </react_native_1.Text>
                  </react_native_1.View>
                  <react_native_1.View style={{
                        backgroundColor: isOut ? '#fef2f2' : '#fffbeb',
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                    <react_native_1.Text style={{ fontSize: 16, fontWeight: '800', color: isOut ? '#dc2626' : '#d97706' }}>
                      {item.currentStock}
                    </react_native_1.Text>
                    <react_native_1.Text style={{ fontSize: 10, color: '#9ca3af' }}>/ {item.minStockLevel}</react_native_1.Text>
                  </react_native_1.View>
                </react_native_1.View>
                {/* Progress bar */}
                <react_native_1.View style={{ height: 4, backgroundColor: '#f3f4f6', borderRadius: 2 }}>
                  <react_native_1.View style={{
                        height: 4,
                        backgroundColor: isOut ? '#dc2626' : '#f59e0b',
                        borderRadius: 2,
                        width: `${pct}%`,
                    }}/>
                </react_native_1.View>
              </react_native_1.TouchableOpacity>);
            }} contentContainerStyle={{ paddingBottom: 32, paddingTop: 4 }}/>)}
    </react_native_1.View>);
}
//# sourceMappingURL=inventory.js.map
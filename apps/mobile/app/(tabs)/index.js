"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardTab;
const react_native_1 = require("react-native");
const react_query_1 = require("@tanstack/react-query");
const expo_router_1 = require("expo-router");
const api_1 = require("../../src/utils/api");
const authStore_1 = require("../../src/store/authStore");
function MetricCard({ label, value, color, emoji, }) {
    return (<react_native_1.View style={{
            flex: 1,
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 16,
            marginHorizontal: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
        }}>
      <react_native_1.Text style={{ fontSize: 24, marginBottom: 8 }}>{emoji}</react_native_1.Text>
      <react_native_1.Text style={{ fontSize: 20, fontWeight: '800', color, marginBottom: 2 }}>{value}</react_native_1.Text>
      <react_native_1.Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '500' }}>{label}</react_native_1.Text>
    </react_native_1.View>);
}
function DashboardTab() {
    const { user, logout } = (0, authStore_1.useAuthStore)();
    const queryClient = (0, react_query_1.useQueryClient)();
    const router = (0, expo_router_1.useRouter)();
    const { data, isLoading, refetch, isRefetching } = (0, react_query_1.useQuery)({
        queryKey: ['mobile-metrics'],
        queryFn: () => (0, api_1.apiGet)('/inventory/summary'),
        staleTime: 1000 * 60,
    });
    const { data: recentData } = (0, react_query_1.useQuery)({
        queryKey: ['mobile-recent'],
        queryFn: () => (0, api_1.apiGet)('/stock/recent?limit=8'),
    });
    const m = data;
    const recent = recentData || [];
    const formatCurrency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
    return (<react_native_1.ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }} refreshControl={<react_native_1.RefreshControl refreshing={isRefetching} onRefresh={refetch}/>}>
      {/* Header */}
      <react_native_1.View style={{
            backgroundColor: '#0369a1',
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 32,
        }}>
        <react_native_1.View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <react_native_1.View>
            <react_native_1.Text style={{ color: '#bae6fd', fontSize: 12, fontWeight: '500' }}>
              Welcome back,
            </react_native_1.Text>
            <react_native_1.Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 2 }}>
              {user?.name}
            </react_native_1.Text>
          </react_native_1.View>
          <react_native_1.TouchableOpacity onPress={() => { logout(); }} style={{
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
        }}>
            <react_native_1.Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Sign Out</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
      </react_native_1.View>

      <react_native_1.View style={{ paddingHorizontal: 16, marginTop: -20 }}>
        {/* Metric cards */}
        {isLoading ? (<react_native_1.View style={{ height: 100, alignItems: 'center', justifyContent: 'center' }}>
            <react_native_1.ActivityIndicator color="#0ea5e9"/>
          </react_native_1.View>) : (<>
            <react_native_1.View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <MetricCard label="Total Products" value={m?.totalProducts?.toLocaleString() ?? '—'} color="#0369a1" emoji="📦"/>
              <MetricCard label="Stock Value" value={m ? formatCurrency(m.totalStockValue) : '—'} color="#059669" emoji="💰"/>
            </react_native_1.View>
            <react_native_1.View style={{ flexDirection: 'row', marginBottom: 20 }}>
              <MetricCard label="Low Stock" value={m?.lowStockCount?.toString() ?? '—'} color="#d97706" emoji="⚠️"/>
              <MetricCard label="Out of Stock" value={m?.outOfStockCount?.toString() ?? '—'} color="#dc2626" emoji="🚨"/>
            </react_native_1.View>
          </>)}

        {/* Quick actions */}
        <react_native_1.View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
        }}>
          <react_native_1.Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 }}>
            Quick Actions
          </react_native_1.Text>
          <react_native_1.View style={{ flexDirection: 'row', gap: 8 }}>
            {[
            { label: '📷 Scan', route: '/(tabs)/scan', color: '#0369a1' },
            { label: '📦 Products', route: '/(tabs)/products', color: '#059669' },
            { label: '🏪 Inventory', route: '/(tabs)/inventory', color: '#7c3aed' },
        ].map(({ label, route, color }) => (<react_native_1.TouchableOpacity key={route} onPress={() => router.push(route)} style={{
                flex: 1,
                backgroundColor: color,
                borderRadius: 12,
                padding: 12,
                alignItems: 'center',
            }}>
                <react_native_1.Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{label}</react_native_1.Text>
              </react_native_1.TouchableOpacity>))}
          </react_native_1.View>
        </react_native_1.View>

        {/* Recent activity */}
        <react_native_1.View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 16,
            marginBottom: 32,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
        }}>
          <react_native_1.Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 }}>
            Recent Activity
          </react_native_1.Text>
          {recent.length === 0 ? (<react_native_1.Text style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', paddingVertical: 20 }}>
              No recent activity
            </react_native_1.Text>) : (recent.map((entry) => (<react_native_1.View key={entry.id} style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: '#f3f4f6',
            }}>
                <react_native_1.View style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: entry.type === 'sale' ? '#f59e0b' : '#10b981',
                marginRight: 10,
            }}/>
                <react_native_1.View style={{ flex: 1 }}>
                  <react_native_1.Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }} numberOfLines={1}>
                    {entry.product?.name}
                  </react_native_1.Text>
                  <react_native_1.Text style={{ fontSize: 11, color: '#9ca3af' }}>
                    {entry.type === 'sale' ? '-' : '+'}{entry.quantity} · {entry.type}
                  </react_native_1.Text>
                </react_native_1.View>
                <react_native_1.Text style={{ fontSize: 11, color: '#9ca3af' }}>
                  {entry.performer?.name}
                </react_native_1.Text>
              </react_native_1.View>)))}
        </react_native_1.View>
      </react_native_1.View>
    </react_native_1.ScrollView>);
}
//# sourceMappingURL=index.js.map
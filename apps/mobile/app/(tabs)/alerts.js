"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AlertsTab;
const react_native_1 = require("react-native");
const react_query_1 = require("@tanstack/react-query");
const date_fns_1 = require("date-fns");
const api_1 = require("../../src/utils/api");
const api_2 = require("../../src/utils/api");
function AlertsTab() {
    const queryClient = (0, react_query_1.useQueryClient)();
    const { data, isLoading, refetch, isRefetching } = (0, react_query_1.useQuery)({
        queryKey: ['mobile-alerts'],
        queryFn: () => (0, api_1.apiGet)('/alerts?resolved=false&limit=50'),
        refetchInterval: 30000,
    });
    const resolveMutation = (0, react_query_1.useMutation)({
        mutationFn: (id) => api_2.api.patch(`/alerts/${id}/resolve`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mobile-alerts'] });
        },
    });
    const alerts = data || [];
    return (<react_native_1.View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <react_native_1.View style={{
            backgroundColor: '#fff',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
        }}>
        <react_native_1.Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
          🔔 Active Alerts
        </react_native_1.Text>
        <react_native_1.Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
          {alerts.length} unresolved alert{alerts.length !== 1 ? 's' : ''}
        </react_native_1.Text>
      </react_native_1.View>

      {isLoading ? (<react_native_1.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <react_native_1.ActivityIndicator color="#0ea5e9" size="large"/>
        </react_native_1.View>) : alerts.length === 0 ? (<react_native_1.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <react_native_1.Text style={{ fontSize: 48, marginBottom: 12 }}>✅</react_native_1.Text>
          <react_native_1.Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>All clear!</react_native_1.Text>
          <react_native_1.Text style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>No active alerts</react_native_1.Text>
        </react_native_1.View>) : (<react_native_1.FlatList data={alerts} keyExtractor={(item) => item.id} refreshControl={<react_native_1.RefreshControl refreshing={isRefetching} onRefresh={refetch}/>} renderItem={({ item }) => {
                const isOut = item.type === 'out_of_stock';
                return (<react_native_1.View style={{
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
                        flexDirection: 'row',
                        gap: 12,
                    }}>
                <react_native_1.View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: isOut ? '#fef2f2' : '#fffbeb',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                  <react_native_1.Text style={{ fontSize: 20 }}>{isOut ? '🚨' : '⚠️'}</react_native_1.Text>
                </react_native_1.View>

                <react_native_1.View style={{ flex: 1 }}>
                  <react_native_1.View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <react_native_1.View style={{
                        backgroundColor: isOut ? '#fef2f2' : '#fffbeb',
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                    }}>
                      <react_native_1.Text style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: isOut ? '#dc2626' : '#d97706',
                    }}>
                        {isOut ? 'OUT OF STOCK' : 'LOW STOCK'}
                      </react_native_1.Text>
                    </react_native_1.View>
                    <react_native_1.Text style={{ fontSize: 11, color: '#9ca3af' }}>
                      {(0, date_fns_1.format)(new Date(item.createdAt), 'MMM d, HH:mm')}
                    </react_native_1.Text>
                  </react_native_1.View>
                  <react_native_1.Text style={{ fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                    {item.product?.name}
                  </react_native_1.Text>
                  <react_native_1.Text style={{ fontSize: 12, color: '#6b7280' }} numberOfLines={2}>
                    {item.message}
                  </react_native_1.Text>
                  <react_native_1.TouchableOpacity onPress={() => react_native_1.Alert.alert('Resolve Alert', `Mark this alert as resolved?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Resolve', onPress: () => resolveMutation.mutate(item.id) },
                    ])} style={{
                        marginTop: 10,
                        backgroundColor: '#f3f4f6',
                        borderRadius: 8,
                        paddingVertical: 8,
                        alignItems: 'center',
                    }}>
                    <react_native_1.Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>
                      ✓ Mark Resolved
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>
                </react_native_1.View>
              </react_native_1.View>);
            }} contentContainerStyle={{ paddingBottom: 32, paddingTop: 4 }}/>)}
    </react_native_1.View>);
}
//# sourceMappingURL=alerts.js.map
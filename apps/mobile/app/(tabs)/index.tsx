import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { apiGet } from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';

function MetricCard({
  label, value, color, emoji,
}: {
  label: string; value: string; color: string; emoji: string;
}) {
  return (
    <View style={{
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
      <Text style={{ fontSize: 24, marginBottom: 8 }}>{emoji}</Text>
      <Text style={{ fontSize: 20, fontWeight: '800', color, marginBottom: 2 }}>{value}</Text>
      <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '500' }}>{label}</Text>
    </View>
  );
}

export default function DashboardTab() {
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['mobile-metrics'],
    queryFn: () => apiGet<any>('/inventory/summary'),
    staleTime: 1000 * 60,
  });

  const { data: recentData } = useQuery({
    queryKey: ['mobile-recent'],
    queryFn: () => apiGet<any[]>('/stock/recent?limit=8'),
  });

  const m = data;
  const recent = recentData || [];

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f9fafb' }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      {/* Header */}
      <View style={{
        backgroundColor: '#0369a1',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 32,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: '#bae6fd', fontSize: 12, fontWeight: '500' }}>
              Welcome back,
            </Text>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 2 }}>
              {user?.name}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => { logout(); }}
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: -20 }}>
        {/* Metric cards */}
        {isLoading ? (
          <View style={{ height: 100, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#0ea5e9" />
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <MetricCard
                label="Total Products"
                value={m?.totalProducts?.toLocaleString() ?? '—'}
                color="#0369a1"
                emoji="📦"
              />
              <MetricCard
                label="Stock Value"
                value={m ? formatCurrency(m.totalStockValue) : '—'}
                color="#059669"
                emoji="💰"
              />
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 20 }}>
              <MetricCard
                label="Low Stock"
                value={m?.lowStockCount?.toString() ?? '—'}
                color="#d97706"
                emoji="⚠️"
              />
              <MetricCard
                label="Out of Stock"
                value={m?.outOfStockCount?.toString() ?? '—'}
                color="#dc2626"
                emoji="🚨"
              />
            </View>
          </>
        )}

        {/* Quick actions */}
        <View style={{
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
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 }}>
            Quick Actions
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: '📷 Scan', route: '/(tabs)/scan', color: '#0369a1' },
              { label: '📦 Products', route: '/(tabs)/products', color: '#059669' },
              { label: '🏪 Inventory', route: '/(tabs)/inventory', color: '#7c3aed' },
            ].map(({ label, route, color }) => (
              <TouchableOpacity
                key={route}
                onPress={() => router.push(route as any)}
                style={{
                  flex: 1,
                  backgroundColor: color,
                  borderRadius: 12,
                  padding: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent activity */}
        <View style={{
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
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 }}>
            Recent Activity
          </Text>
          {recent.length === 0 ? (
            <Text style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', paddingVertical: 20 }}>
              No recent activity
            </Text>
          ) : (
            recent.map((entry: any) => (
              <View key={entry.id} style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: '#f3f4f6',
              }}>
                <View style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: entry.type === 'sale' ? '#f59e0b' : '#10b981',
                  marginRight: 10,
                }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }} numberOfLines={1}>
                    {entry.product?.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#9ca3af' }}>
                    {entry.type === 'sale' ? '-' : '+'}{entry.quantity} · {entry.type}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: '#9ca3af' }}>
                  {entry.performer?.name}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

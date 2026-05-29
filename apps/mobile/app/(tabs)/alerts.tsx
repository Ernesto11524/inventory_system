import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { apiGet, apiPost } from '../../src/utils/api';
import { api } from '../../src/utils/api';

export default function AlertsTab() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['mobile-alerts'],
    queryFn: () => apiGet<any[]>('/alerts?resolved=false&limit=50'),
    refetchInterval: 30000,
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/alerts/${id}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-alerts'] });
    },
  });

  const alerts = data || [];

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
      }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
          🔔 Active Alerts
        </Text>
        <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
          {alerts.length} unresolved alert{alerts.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#0ea5e9" size="large" />
        </View>
      ) : alerts.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>✅</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>All clear!</Text>
          <Text style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>No active alerts</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          renderItem={({ item }) => {
            const isOut = item.type === 'out_of_stock';
            return (
              <View style={{
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
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: isOut ? '#fef2f2' : '#fffbeb',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 20 }}>{isOut ? '🚨' : '⚠️'}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <View style={{
                      backgroundColor: isOut ? '#fef2f2' : '#fffbeb',
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}>
                      <Text style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: isOut ? '#dc2626' : '#d97706',
                      }}>
                        {isOut ? 'OUT OF STOCK' : 'LOW STOCK'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: '#9ca3af' }}>
                      {format(new Date(item.createdAt), 'MMM d, HH:mm')}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                    {item.product?.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }} numberOfLines={2}>
                    {item.message}
                  </Text>
                  <TouchableOpacity
                    onPress={() => Alert.alert(
                      'Resolve Alert',
                      `Mark this alert as resolved?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Resolve', onPress: () => resolveMutation.mutate(item.id) },
                      ],
                    )}
                    style={{
                      marginTop: 10,
                      backgroundColor: '#f3f4f6',
                      borderRadius: 8,
                      paddingVertical: 8,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>
                      ✓ Mark Resolved
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          contentContainerStyle={{ paddingBottom: 32, paddingTop: 4 }}
        />
      )}
    </View>
  );
}

// inventory.tsx
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { apiGet } from '../../src/utils/api';

export default function InventoryTab() {
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['mobile-inventory'],
    queryFn: () => apiGet<any[]>('/inventory/low-stock'),
    refetchInterval: 60000,
  });

  const items = data || [];

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
          ⚠️ Low Stock Items
        </Text>
        <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
          {items.length} item{items.length !== 1 ? 's' : ''} below minimum level
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#0ea5e9" size="large" />
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>✅</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>All stocked up!</Text>
          <Text style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>No low stock items</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          renderItem={({ item }) => {
            const pct = Math.min(100, ((item.currentStock / item.minStockLevel) * 100));
            const isOut = item.currentStock <= 0;
            return (
              <TouchableOpacity
                onPress={() => router.push(`/product/${item.productId}` as any)}
                style={{
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
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }} numberOfLines={1}>
                      {item.productName}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>
                      {item.productSku}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: isOut ? '#fef2f2' : '#fffbeb',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: isOut ? '#dc2626' : '#d97706' }}>
                      {item.currentStock}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#9ca3af' }}>/ {item.minStockLevel}</Text>
                  </View>
                </View>
                {/* Progress bar */}
                <View style={{ height: 4, backgroundColor: '#f3f4f6', borderRadius: 2 }}>
                  <View style={{
                    height: 4,
                    backgroundColor: isOut ? '#dc2626' : '#f59e0b',
                    borderRadius: 2,
                    width: `${pct}%`,
                  }} />
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingBottom: 32, paddingTop: 4 }}
        />
      )}
    </View>
  );
}

import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { apiGet } from '../../src/utils/api';
import { getCachedProducts, cacheProducts } from '../../src/utils/offlineStorage';
import type { Product } from '@inventory/shared';

function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  const stock = product.inventory?.currentStock ?? 0;
  const isOut = stock <= 0;
  const isLow = !isOut && stock < product.minStockLevel;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        marginHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View style={{
        width: 44,
        height: 44,
        backgroundColor: '#f3f4f6',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 24 }}>📦</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>
          {product.sku}
        </Text>
        {product.category && (
          <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            {product.category.name}
          </Text>
        )}
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
          ${Number(product.price).toFixed(2)}
        </Text>
        <View style={{
          backgroundColor: isOut ? '#fef2f2' : isLow ? '#fffbeb' : '#f0fdf4',
          borderRadius: 6,
          paddingHorizontal: 8,
          paddingVertical: 2,
          marginTop: 4,
        }}>
          <Text style={{
            fontSize: 11,
            fontWeight: '600',
            color: isOut ? '#dc2626' : isLow ? '#d97706' : '#059669',
          }}>
            {stock} {product.unit}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ProductsTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineProducts, setOfflineProducts] = useState<Product[]>([]);
  const router = useRouter();

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected);
    });
    // Load offline cache
    getCachedProducts().then((cached) => setOfflineProducts(cached));
    return unsub;
  }, []);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['mobile-products', search, page],
    queryFn: async () => {
      const result = await apiGet<Product[]>('/products', {
        page, limit: 30,
        search: search || undefined,
      });
      // Cache for offline
      if (Array.isArray(result)) {
        await cacheProducts(result);
      }
      return result;
    },
    enabled: isOnline,
  });

  const products = isOnline ? (data as any as Product[] || []) : offlineProducts.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {!isOnline && (
        <View style={{
          backgroundColor: '#f59e0b',
          padding: 10,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 6,
        }}>
          <Text style={{ fontSize: 12 }}>📵</Text>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
            Offline — showing cached data
          </Text>
        </View>
      )}

      {/* Search */}
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#fff',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          paddingHorizontal: 12,
        }}>
          <Text style={{ marginRight: 8 }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={(t) => { setSearch(t); setPage(1); }}
            placeholder="Search products…"
            style={{ flex: 1, paddingVertical: 12, fontSize: 15, color: '#111827' }}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#0ea5e9" size="large" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => router.push(`/product/${item.id}` as any)}
            />
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📭</Text>
              <Text style={{ color: '#6b7280', fontSize: 16 }}>No products found</Text>
            </View>
          }
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
        />
      )}
    </View>
  );
}

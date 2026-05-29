import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert,
  RefreshControl,
} from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { apiGet, apiPost } from '../../src/utils/api';

type EntryType = 'restock' | 'sale' | 'return' | 'adjustment';

const TYPE_CONFIG: Record<EntryType, { label: string; emoji: string; color: string }> = {
  restock: { label: 'Restock', emoji: '📥', color: '#059669' },
  sale:    { label: 'Sale',    emoji: '📤', color: '#d97706' },
  return:  { label: 'Return', emoji: '↩️', color: '#0284c7' },
  adjustment: { label: 'Adjust', emoji: '🔧', color: '#7c3aed' },
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryType, setEntryType] = useState<EntryType>('restock');
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');

  const { data: product, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['product-detail', id],
    queryFn: () => apiGet<any>(`/products/${id}`),
    enabled: !!id,
  });

  const { data: history } = useQuery({
    queryKey: ['product-history-mobile', id],
    queryFn: () => apiGet<any[]>(`/stock/history/${id}?limit=20`),
    enabled: !!id,
  });

  const entryMutation = useMutation({
    mutationFn: () => apiPost('/stock/entry', {
      productId: id,
      quantity: parseInt(quantity, 10),
      type: entryType,
      note: note || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['product-history-mobile', id] });
      queryClient.invalidateQueries({ queryKey: ['mobile-metrics'] });
      setShowEntryModal(false);
      setQuantity('1');
      setNote('');
      Alert.alert('✅ Success', 'Stock entry recorded');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to record entry');
    },
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#0ea5e9" size="large" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#6b7280' }}>Product not found</Text>
      </View>
    );
  }

  const stock = product.inventory?.currentStock ?? 0;
  const isOut = stock <= 0;
  const isLow = !isOut && stock < product.minStockLevel;
  const stockColor = isOut ? '#dc2626' : isLow ? '#d97706' : '#059669';
  const entries: any[] = Array.isArray(history) ? history : [];

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Product header */}
        <View style={{ backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
            <View style={{
              width: 64,
              height: 64,
              backgroundColor: '#f3f4f6',
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 32 }}>📦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>{product.name}</Text>
              <Text style={{ fontSize: 13, color: '#9ca3af', fontFamily: 'monospace', marginTop: 2 }}>
                {product.sku}
              </Text>
              {product.category && (
                <View style={{
                  marginTop: 6,
                  backgroundColor: '#eff6ff',
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  alignSelf: 'flex-start',
                }}>
                  <Text style={{ fontSize: 11, color: '#2563eb', fontWeight: '600' }}>
                    {product.category.name}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {product.description && (
            <Text style={{ marginTop: 12, fontSize: 13, color: '#6b7280', lineHeight: 18 }}>
              {product.description}
            </Text>
          )}
        </View>

        {/* Stats grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10 }}>
          {[
            { label: 'Current Stock', value: `${stock} ${product.unit}`, color: stockColor },
            { label: 'Min Level', value: `${product.minStockLevel} ${product.unit}`, color: '#374151' },
            { label: 'Sell Price', value: `$${Number(product.price).toFixed(2)}`, color: '#374151' },
            { label: 'Cost Price', value: `$${Number(product.costPrice).toFixed(2)}`, color: '#374151' },
          ].map(({ label, value, color }) => (
            <View key={label} style={{
              flex: 1,
              minWidth: '45%',
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 14,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 3,
              elevation: 2,
            }}>
              <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{label}</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color }}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Stock entry button */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setShowEntryModal(true)}
            style={{
              backgroundColor: '#0369a1',
              borderRadius: 14,
              padding: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 18 }}>📊</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Record Stock Entry</Text>
          </TouchableOpacity>
        </View>

        {/* Stock history */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 10 }}>
            Recent Stock Entries
          </Text>
          {entries.length === 0 ? (
            <View style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 24,
              alignItems: 'center',
            }}>
              <Text style={{ color: '#9ca3af', fontSize: 14 }}>No stock entries yet</Text>
            </View>
          ) : (
            entries.map((entry: any) => {
              const cfg = TYPE_CONFIG[entry.type as EntryType] || TYPE_CONFIG.adjustment;
              const isOut = entry.type === 'sale';
              return (
                <View key={entry.id} style={{
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 3,
                  elevation: 1,
                }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: isOut ? '#fffbeb' : '#f0fdf4',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 18 }}>{cfg.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: cfg.color }}>
                        {isOut ? '-' : '+'}{entry.quantity} {product.unit}
                      </Text>
                      <View style={{
                        backgroundColor: isOut ? '#fffbeb' : '#f0fdf4',
                        borderRadius: 4,
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: cfg.color }}>
                          {cfg.label.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    {entry.note && (
                      <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }} numberOfLines={1}>
                        {entry.note}
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 11, color: '#6b7280' }}>{entry.performer?.name}</Text>
                    <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                      {format(new Date(entry.createdAt), 'MMM d, HH:mm')}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Stock Entry Modal */}
      <Modal visible={showEntryModal} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: 40,
          }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 20 }}>
              Record Stock Entry
            </Text>

            {/* Type selector */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Entry Type</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {(Object.keys(TYPE_CONFIG) as EntryType[]).map((t) => {
                const cfg = TYPE_CONFIG[t];
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setEntryType(t)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      alignItems: 'center',
                      backgroundColor: entryType === t ? cfg.color : '#f3f4f6',
                      borderWidth: 1,
                      borderColor: entryType === t ? cfg.color : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{cfg.emoji}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: entryType === t ? '#fff' : '#6b7280', marginTop: 2 }}>
                      {cfg.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quantity */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Quantity</Text>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              style={{
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 12,
                padding: 14,
                fontSize: 16,
                color: '#111827',
                marginBottom: 12,
              }}
            />

            {/* Note */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Note (optional)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Add a note…"
              placeholderTextColor="#9ca3af"
              style={{
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 12,
                padding: 14,
                fontSize: 15,
                color: '#111827',
                marginBottom: 20,
              }}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => { setShowEntryModal(false); setQuantity('1'); setNote(''); }}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  borderRadius: 12,
                  padding: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => entryMutation.mutate()}
                disabled={entryMutation.isPending}
                style={{
                  flex: 2,
                  backgroundColor: TYPE_CONFIG[entryType].color,
                  borderRadius: 12,
                  padding: 14,
                  alignItems: 'center',
                }}
              >
                {entryMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                    {TYPE_CONFIG[entryType].emoji} Record Entry
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

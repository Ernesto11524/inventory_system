"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProductDetailScreen;
const react_native_1 = require("react-native");
const react_1 = require("react");
const expo_router_1 = require("expo-router");
const react_query_1 = require("@tanstack/react-query");
const date_fns_1 = require("date-fns");
const api_1 = require("../../src/utils/api");
const TYPE_CONFIG = {
    restock: { label: 'Restock', emoji: '📥', color: '#059669' },
    sale: { label: 'Sale', emoji: '📤', color: '#d97706' },
    return: { label: 'Return', emoji: '↩️', color: '#0284c7' },
    adjustment: { label: 'Adjust', emoji: '🔧', color: '#7c3aed' },
};
function ProductDetailScreen() {
    const { id } = (0, expo_router_1.useLocalSearchParams)();
    const router = (0, expo_router_1.useRouter)();
    const queryClient = (0, react_query_1.useQueryClient)();
    const [showEntryModal, setShowEntryModal] = (0, react_1.useState)(false);
    const [entryType, setEntryType] = (0, react_1.useState)('restock');
    const [quantity, setQuantity] = (0, react_1.useState)('1');
    const [note, setNote] = (0, react_1.useState)('');
    const { data: product, isLoading, refetch, isRefetching } = (0, react_query_1.useQuery)({
        queryKey: ['product-detail', id],
        queryFn: () => (0, api_1.apiGet)(`/products/${id}`),
        enabled: !!id,
    });
    const { data: history } = (0, react_query_1.useQuery)({
        queryKey: ['product-history-mobile', id],
        queryFn: () => (0, api_1.apiGet)(`/stock/history/${id}?limit=20`),
        enabled: !!id,
    });
    const entryMutation = (0, react_query_1.useMutation)({
        mutationFn: () => (0, api_1.apiPost)('/stock/entry', {
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
            react_native_1.Alert.alert('✅ Success', 'Stock entry recorded');
        },
        onError: (err) => {
            react_native_1.Alert.alert('Error', err.response?.data?.message || 'Failed to record entry');
        },
    });
    if (isLoading) {
        return (<react_native_1.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <react_native_1.ActivityIndicator color="#0ea5e9" size="large"/>
      </react_native_1.View>);
    }
    if (!product) {
        return (<react_native_1.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <react_native_1.Text style={{ color: '#6b7280' }}>Product not found</react_native_1.Text>
      </react_native_1.View>);
    }
    const stock = product.inventory?.currentStock ?? 0;
    const isOut = stock <= 0;
    const isLow = !isOut && stock < product.minStockLevel;
    const stockColor = isOut ? '#dc2626' : isLow ? '#d97706' : '#059669';
    const entries = Array.isArray(history) ? history : [];
    return (<react_native_1.View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <react_native_1.ScrollView refreshControl={<react_native_1.RefreshControl refreshing={isRefetching} onRefresh={refetch}/>}>
        {/* Product header */}
        <react_native_1.View style={{ backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
          <react_native_1.View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
            <react_native_1.View style={{
            width: 64,
            height: 64,
            backgroundColor: '#f3f4f6',
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
        }}>
              <react_native_1.Text style={{ fontSize: 32 }}>📦</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.View style={{ flex: 1 }}>
              <react_native_1.Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>{product.name}</react_native_1.Text>
              <react_native_1.Text style={{ fontSize: 13, color: '#9ca3af', fontFamily: 'monospace', marginTop: 2 }}>
                {product.sku}
              </react_native_1.Text>
              {product.category && (<react_native_1.View style={{
                marginTop: 6,
                backgroundColor: '#eff6ff',
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 2,
                alignSelf: 'flex-start',
            }}>
                  <react_native_1.Text style={{ fontSize: 11, color: '#2563eb', fontWeight: '600' }}>
                    {product.category.name}
                  </react_native_1.Text>
                </react_native_1.View>)}
            </react_native_1.View>
          </react_native_1.View>

          {product.description && (<react_native_1.Text style={{ marginTop: 12, fontSize: 13, color: '#6b7280', lineHeight: 18 }}>
              {product.description}
            </react_native_1.Text>)}
        </react_native_1.View>

        {/* Stats grid */}
        <react_native_1.View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10 }}>
          {[
            { label: 'Current Stock', value: `${stock} ${product.unit}`, color: stockColor },
            { label: 'Min Level', value: `${product.minStockLevel} ${product.unit}`, color: '#374151' },
            { label: 'Sell Price', value: `$${Number(product.price).toFixed(2)}`, color: '#374151' },
            { label: 'Cost Price', value: `$${Number(product.costPrice).toFixed(2)}`, color: '#374151' },
        ].map(({ label, value, color }) => (<react_native_1.View key={label} style={{
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
              <react_native_1.Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{label}</react_native_1.Text>
              <react_native_1.Text style={{ fontSize: 16, fontWeight: '700', color }}>{value}</react_native_1.Text>
            </react_native_1.View>))}
        </react_native_1.View>

        {/* Stock entry button */}
        <react_native_1.View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <react_native_1.TouchableOpacity onPress={() => setShowEntryModal(true)} style={{
            backgroundColor: '#0369a1',
            borderRadius: 14,
            padding: 16,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
        }}>
            <react_native_1.Text style={{ fontSize: 18 }}>📊</react_native_1.Text>
            <react_native_1.Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Record Stock Entry</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>

        {/* Stock history */}
        <react_native_1.View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          <react_native_1.Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 10 }}>
            Recent Stock Entries
          </react_native_1.Text>
          {entries.length === 0 ? (<react_native_1.View style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 24,
                alignItems: 'center',
            }}>
              <react_native_1.Text style={{ color: '#9ca3af', fontSize: 14 }}>No stock entries yet</react_native_1.Text>
            </react_native_1.View>) : (entries.map((entry) => {
            const cfg = TYPE_CONFIG[entry.type] || TYPE_CONFIG.adjustment;
            const isOut = entry.type === 'sale';
            return (<react_native_1.View key={entry.id} style={{
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
                  <react_native_1.View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: isOut ? '#fffbeb' : '#f0fdf4',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <react_native_1.Text style={{ fontSize: 18 }}>{cfg.emoji}</react_native_1.Text>
                  </react_native_1.View>
                  <react_native_1.View style={{ flex: 1 }}>
                    <react_native_1.View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <react_native_1.Text style={{ fontSize: 13, fontWeight: '700', color: cfg.color }}>
                        {isOut ? '-' : '+'}{entry.quantity} {product.unit}
                      </react_native_1.Text>
                      <react_native_1.View style={{
                    backgroundColor: isOut ? '#fffbeb' : '#f0fdf4',
                    borderRadius: 4,
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                }}>
                        <react_native_1.Text style={{ fontSize: 10, fontWeight: '600', color: cfg.color }}>
                          {cfg.label.toUpperCase()}
                        </react_native_1.Text>
                      </react_native_1.View>
                    </react_native_1.View>
                    {entry.note && (<react_native_1.Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }} numberOfLines={1}>
                        {entry.note}
                      </react_native_1.Text>)}
                  </react_native_1.View>
                  <react_native_1.View style={{ alignItems: 'flex-end' }}>
                    <react_native_1.Text style={{ fontSize: 11, color: '#6b7280' }}>{entry.performer?.name}</react_native_1.Text>
                    <react_native_1.Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                      {(0, date_fns_1.format)(new Date(entry.createdAt), 'MMM d, HH:mm')}
                    </react_native_1.Text>
                  </react_native_1.View>
                </react_native_1.View>);
        }))}
        </react_native_1.View>
      </react_native_1.ScrollView>

      {/* Stock Entry Modal */}
      <react_native_1.Modal visible={showEntryModal} transparent animationType="slide">
        <react_native_1.View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <react_native_1.View style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: 40,
        }}>
            <react_native_1.Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 20 }}>
              Record Stock Entry
            </react_native_1.Text>

            {/* Type selector */}
            <react_native_1.Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Entry Type</react_native_1.Text>
            <react_native_1.View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {Object.keys(TYPE_CONFIG).map((t) => {
            const cfg = TYPE_CONFIG[t];
            return (<react_native_1.TouchableOpacity key={t} onPress={() => setEntryType(t)} style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: entryType === t ? cfg.color : '#f3f4f6',
                    borderWidth: 1,
                    borderColor: entryType === t ? cfg.color : 'transparent',
                }}>
                    <react_native_1.Text style={{ fontSize: 16 }}>{cfg.emoji}</react_native_1.Text>
                    <react_native_1.Text style={{ fontSize: 10, fontWeight: '600', color: entryType === t ? '#fff' : '#6b7280', marginTop: 2 }}>
                      {cfg.label}
                    </react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
        })}
            </react_native_1.View>

            {/* Quantity */}
            <react_native_1.Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Quantity</react_native_1.Text>
            <react_native_1.TextInput value={quantity} onChangeText={setQuantity} keyboardType="number-pad" style={{
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 12,
            padding: 14,
            fontSize: 16,
            color: '#111827',
            marginBottom: 12,
        }}/>

            {/* Note */}
            <react_native_1.Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Note (optional)</react_native_1.Text>
            <react_native_1.TextInput value={note} onChangeText={setNote} placeholder="Add a note…" placeholderTextColor="#9ca3af" style={{
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 12,
            padding: 14,
            fontSize: 15,
            color: '#111827',
            marginBottom: 20,
        }}/>

            <react_native_1.View style={{ flexDirection: 'row', gap: 10 }}>
              <react_native_1.TouchableOpacity onPress={() => { setShowEntryModal(false); setQuantity('1'); setNote(''); }} style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 12,
            padding: 14,
            alignItems: 'center',
        }}>
                <react_native_1.Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</react_native_1.Text>
              </react_native_1.TouchableOpacity>
              <react_native_1.TouchableOpacity onPress={() => entryMutation.mutate()} disabled={entryMutation.isPending} style={{
            flex: 2,
            backgroundColor: TYPE_CONFIG[entryType].color,
            borderRadius: 12,
            padding: 14,
            alignItems: 'center',
        }}>
                {entryMutation.isPending ? (<react_native_1.ActivityIndicator color="#fff"/>) : (<react_native_1.Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                    {TYPE_CONFIG[entryType].emoji} Record Entry
                  </react_native_1.Text>)}
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.Modal>
    </react_native_1.View>);
}
//# sourceMappingURL=%5Bid%5D.js.map
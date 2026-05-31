"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProductsTab;
const react_native_1 = require("react-native");
const react_1 = require("react");
const react_query_1 = require("@tanstack/react-query");
const expo_router_1 = require("expo-router");
const netinfo_1 = __importDefault(require("@react-native-community/netinfo"));
const api_1 = require("../../src/utils/api");
const offlineStorage_1 = require("../../src/utils/offlineStorage");
function ProductCard({ product, onPress }) {
    const stock = product.inventory?.currentStock ?? 0;
    const isOut = stock <= 0;
    const isLow = !isOut && stock < product.minStockLevel;
    return (<react_native_1.TouchableOpacity onPress={onPress} style={{
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
        }}>
      <react_native_1.View style={{
            width: 44,
            height: 44,
            backgroundColor: '#f3f4f6',
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
        }}>
        <react_native_1.Text style={{ fontSize: 24 }}>📦</react_native_1.Text>
      </react_native_1.View>

      <react_native_1.View style={{ flex: 1 }}>
        <react_native_1.Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }} numberOfLines={1}>
          {product.name}
        </react_native_1.Text>
        <react_native_1.Text style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>
          {product.sku}
        </react_native_1.Text>
        {product.category && (<react_native_1.Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            {product.category.name}
          </react_native_1.Text>)}
      </react_native_1.View>

      <react_native_1.View style={{ alignItems: 'flex-end' }}>
        <react_native_1.Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
          ${Number(product.price).toFixed(2)}
        </react_native_1.Text>
        <react_native_1.View style={{
            backgroundColor: isOut ? '#fef2f2' : isLow ? '#fffbeb' : '#f0fdf4',
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 2,
            marginTop: 4,
        }}>
          <react_native_1.Text style={{
            fontSize: 11,
            fontWeight: '600',
            color: isOut ? '#dc2626' : isLow ? '#d97706' : '#059669',
        }}>
            {stock} {product.unit}
          </react_native_1.Text>
        </react_native_1.View>
      </react_native_1.View>
    </react_native_1.TouchableOpacity>);
}
function ProductsTab() {
    const [search, setSearch] = (0, react_1.useState)('');
    const [page, setPage] = (0, react_1.useState)(1);
    const [isOnline, setIsOnline] = (0, react_1.useState)(true);
    const [offlineProducts, setOfflineProducts] = (0, react_1.useState)([]);
    const router = (0, expo_router_1.useRouter)();
    (0, react_1.useEffect)(() => {
        const unsub = netinfo_1.default.addEventListener((state) => {
            setIsOnline(!!state.isConnected);
        });
        // Load offline cache
        (0, offlineStorage_1.getCachedProducts)().then((cached) => setOfflineProducts(cached));
        return unsub;
    }, []);
    const { data, isLoading, refetch, isRefetching } = (0, react_query_1.useQuery)({
        queryKey: ['mobile-products', search, page],
        queryFn: async () => {
            const result = await (0, api_1.apiGet)('/products', {
                page, limit: 30,
                search: search || undefined,
            });
            // Cache for offline
            if (Array.isArray(result)) {
                await (0, offlineStorage_1.cacheProducts)(result);
            }
            return result;
        },
        enabled: isOnline,
    });
    const products = isOnline ? (data || []) : offlineProducts.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));
    return (<react_native_1.View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {!isOnline && (<react_native_1.View style={{
                backgroundColor: '#f59e0b',
                padding: 10,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
            }}>
          <react_native_1.Text style={{ fontSize: 12 }}>📵</react_native_1.Text>
          <react_native_1.Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
            Offline — showing cached data
          </react_native_1.Text>
        </react_native_1.View>)}

      {/* Search */}
      <react_native_1.View style={{ padding: 16, paddingBottom: 8 }}>
        <react_native_1.View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fff',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            paddingHorizontal: 12,
        }}>
          <react_native_1.Text style={{ marginRight: 8 }}>🔍</react_native_1.Text>
          <react_native_1.TextInput value={search} onChangeText={(t) => { setSearch(t); setPage(1); }} placeholder="Search products…" style={{ flex: 1, paddingVertical: 12, fontSize: 15, color: '#111827' }} placeholderTextColor="#9ca3af"/>
        </react_native_1.View>
      </react_native_1.View>

      {isLoading ? (<react_native_1.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <react_native_1.ActivityIndicator color="#0ea5e9" size="large"/>
        </react_native_1.View>) : (<react_native_1.FlatList data={products} keyExtractor={(item) => item.id} renderItem={({ item }) => (<ProductCard product={item} onPress={() => router.push(`/product/${item.id}`)}/>)} refreshControl={<react_native_1.RefreshControl refreshing={isRefetching} onRefresh={refetch}/>} ListEmptyComponent={<react_native_1.View style={{ alignItems: 'center', paddingTop: 60 }}>
              <react_native_1.Text style={{ fontSize: 40, marginBottom: 12 }}>📭</react_native_1.Text>
              <react_native_1.Text style={{ color: '#6b7280', fontSize: 16 }}>No products found</react_native_1.Text>
            </react_native_1.View>} contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}/>)}
    </react_native_1.View>);
}
//# sourceMappingURL=products.js.map
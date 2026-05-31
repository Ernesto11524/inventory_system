"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ScannerTab;
const react_1 = require("react");
const react_native_1 = require("react-native");
const expo_camera_1 = require("expo-camera");
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("../../src/utils/api");
const offlineStorage_1 = require("../../src/utils/offlineStorage");
const authStore_1 = require("../../src/store/authStore");
const expo_router_1 = require("expo-router");
function ScannerTab() {
    const [permission, requestPermission] = (0, expo_camera_1.useCameraPermissions)();
    const [scanned, setScanned] = (0, react_1.useState)(false);
    const [product, setProduct] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [showModal, setShowModal] = (0, react_1.useState)(false);
    const [quantity, setQuantity] = (0, react_1.useState)('1');
    const [note, setNote] = (0, react_1.useState)('');
    const [mode, setMode] = (0, react_1.useState)('in');
    const [submitting, setSubmitting] = (0, react_1.useState)(false);
    const queryClient = (0, react_query_1.useQueryClient)();
    const { user } = (0, authStore_1.useAuthStore)();
    const router = (0, expo_router_1.useRouter)();
    if (!permission) {
        return (<react_native_1.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <react_native_1.ActivityIndicator color="#0ea5e9"/>
      </react_native_1.View>);
    }
    if (!permission.granted) {
        return (<react_native_1.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <react_native_1.Text style={{ fontSize: 40, marginBottom: 16 }}>📷</react_native_1.Text>
        <react_native_1.Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
          Camera Access Required
        </react_native_1.Text>
        <react_native_1.Text style={{ color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>
          StockFlow needs camera access to scan product barcodes.
        </react_native_1.Text>
        <react_native_1.TouchableOpacity onPress={requestPermission} style={{
                backgroundColor: '#0ea5e9',
                borderRadius: 12,
                paddingHorizontal: 24,
                paddingVertical: 14,
            }}>
          <react_native_1.Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Grant Permission</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>);
    }
    const handleBarCodeScanned = async ({ type, data: barcode }) => {
        if (scanned || loading)
            return;
        setScanned(true);
        setLoading(true);
        try {
            const productData = await (0, api_1.apiGet)(`/products/barcode/${barcode}`);
            setProduct(productData);
            setShowModal(true);
        }
        catch (err) {
            react_native_1.Alert.alert('Product Not Found', `No product found with barcode: ${barcode}`, [{ text: 'OK', onPress: () => setScanned(false) }]);
        }
        finally {
            setLoading(false);
        }
    };
    const handleSubmitEntry = async () => {
        const qty = parseInt(quantity, 10);
        if (!qty || qty < 1) {
            react_native_1.Alert.alert('Error', 'Please enter a valid quantity');
            return;
        }
        setSubmitting(true);
        const entryType = mode === 'in' ? 'restock' : 'sale';
        try {
            await (0, api_1.apiPost)('/stock/entry', {
                productId: product.id,
                quantity: qty,
                type: entryType,
                note: note || `Quick ${mode === 'in' ? 'stock-in' : 'stock-out'} via mobile scan`,
            });
            queryClient.invalidateQueries({ queryKey: ['mobile-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['mobile-products'] });
            react_native_1.Alert.alert('✅ Success', `${mode === 'in' ? 'Added' : 'Removed'} ${qty} units of ${product.name}`, [{
                    text: 'Scan Another',
                    onPress: () => {
                        setShowModal(false);
                        setProduct(null);
                        setQuantity('1');
                        setNote('');
                        setScanned(false);
                    },
                }]);
        }
        catch (err) {
            // If offline, save pending entry
            if (!err.response) {
                await (0, offlineStorage_1.savePendingEntry)({
                    id: `pending-${Date.now()}`,
                    productId: product.id,
                    quantity: qty,
                    type: entryType,
                    note,
                });
                react_native_1.Alert.alert('📱 Saved Offline', 'Entry saved and will sync when online.', [{ text: 'OK', onPress: () => { setShowModal(false); setScanned(false); } }]);
            }
            else {
                react_native_1.Alert.alert('Error', err.response?.data?.message || 'Failed to record entry');
            }
        }
        finally {
            setSubmitting(false);
        }
    };
    return (<react_native_1.View style={{ flex: 1, backgroundColor: '#000' }}>
      <expo_camera_1.CameraView style={{ flex: 1 }} facing="back" onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
        }}>
        {/* Scanner overlay */}
        <react_native_1.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {loading && (<react_native_1.View style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: 12,
                padding: 20,
                alignItems: 'center',
            }}>
              <react_native_1.ActivityIndicator color="#0ea5e9" size="large"/>
              <react_native_1.Text style={{ color: '#fff', marginTop: 8 }}>Looking up product…</react_native_1.Text>
            </react_native_1.View>)}

          {/* Scan frame */}
          {!loading && !scanned && (<react_native_1.View style={{
                width: 260,
                height: 180,
                borderWidth: 2,
                borderColor: '#0ea5e9',
                borderRadius: 16,
                position: 'relative',
            }}>
              {/* Corner accents */}
              {[
                { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
                { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
                { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
                { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
            ].map((style, i) => (<react_native_1.View key={i} style={{
                    position: 'absolute',
                    width: 30,
                    height: 30,
                    borderColor: '#0ea5e9',
                    ...style,
                }}/>))}
            </react_native_1.View>)}

          {/* Mode toggle */}
          <react_native_1.View style={{
            flexDirection: 'row',
            backgroundColor: 'rgba(0,0,0,0.6)',
            borderRadius: 12,
            padding: 4,
            marginTop: 32,
            gap: 4,
        }}>
            {[
            { key: 'in', label: '📥 Stock In', color: '#10b981' },
            { key: 'out', label: '📤 Stock Out', color: '#f59e0b' },
        ].map(({ key, label, color }) => (<react_native_1.TouchableOpacity key={key} onPress={() => setMode(key)} style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: mode === key ? color : 'transparent',
            }}>
                <react_native_1.Text style={{
                color: mode === key ? '#fff' : 'rgba(255,255,255,0.6)',
                fontWeight: '600',
                fontSize: 14,
            }}>
                  {label}
                </react_native_1.Text>
              </react_native_1.TouchableOpacity>))}
          </react_native_1.View>

          <react_native_1.Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 12, textAlign: 'center' }}>
            Point camera at barcode to scan
          </react_native_1.Text>
        </react_native_1.View>
      </expo_camera_1.CameraView>

      {/* Product modal */}
      <react_native_1.Modal visible={showModal} transparent animationType="slide">
        <react_native_1.View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <react_native_1.View style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: 40,
        }}>
            <react_native_1.View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 }}>
              <react_native_1.View style={{
            width: 50,
            height: 50,
            backgroundColor: '#f3f4f6',
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
        }}>
                <react_native_1.Text style={{ fontSize: 24 }}>📦</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.View style={{ flex: 1 }}>
                <react_native_1.Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }} numberOfLines={2}>
                  {product?.name}
                </react_native_1.Text>
                <react_native_1.Text style={{ fontSize: 13, color: '#6b7280', fontFamily: 'monospace' }}>
                  {product?.sku}
                </react_native_1.Text>
                <react_native_1.View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  <react_native_1.Text style={{
            fontSize: 12,
            color: (product?.inventory?.currentStock ?? 0) <= 0 ? '#dc2626' :
                (product?.inventory?.currentStock ?? 0) < product?.minStockLevel ? '#d97706' : '#059669',
            fontWeight: '600',
        }}>
                    Stock: {product?.inventory?.currentStock ?? 0} {product?.unit}
                  </react_native_1.Text>
                </react_native_1.View>
              </react_native_1.View>
            </react_native_1.View>

            <react_native_1.View style={{ marginBottom: 16 }}>
              <react_native_1.Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                Mode: {mode === 'in' ? '📥 Stock In (Restock)' : '📤 Stock Out (Sale)'}
              </react_native_1.Text>

              <react_native_1.Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                Quantity
              </react_native_1.Text>
              <react_native_1.TextInput value={quantity} onChangeText={setQuantity} keyboardType="number-pad" style={{
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 12,
            padding: 14,
            fontSize: 16,
            color: '#111827',
            marginBottom: 12,
        }}/>

              <react_native_1.Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                Note (optional)
              </react_native_1.Text>
              <react_native_1.TextInput value={note} onChangeText={setNote} placeholder="Add a note…" style={{
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 12,
            padding: 14,
            fontSize: 15,
            color: '#111827',
        }}/>
            </react_native_1.View>

            <react_native_1.View style={{ flexDirection: 'row', gap: 10 }}>
              <react_native_1.TouchableOpacity onPress={() => { setShowModal(false); setProduct(null); setScanned(false); }} style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 12,
            padding: 14,
            alignItems: 'center',
        }}>
                <react_native_1.Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</react_native_1.Text>
              </react_native_1.TouchableOpacity>
              <react_native_1.TouchableOpacity onPress={handleSubmitEntry} disabled={submitting} style={{
            flex: 2,
            backgroundColor: mode === 'in' ? '#059669' : '#d97706',
            borderRadius: 12,
            padding: 14,
            alignItems: 'center',
        }}>
                {submitting ? (<react_native_1.ActivityIndicator color="#fff"/>) : (<react_native_1.Text style={{ color: '#fff', fontWeight: '700' }}>
                    {mode === 'in' ? '📥 Add Stock' : '📤 Remove Stock'}
                  </react_native_1.Text>)}
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.Modal>
    </react_native_1.View>);
}
//# sourceMappingURL=scan.js.map
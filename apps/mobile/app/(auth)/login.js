"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoginScreen;
const react_native_1 = require("react-native");
const react_1 = require("react");
const authStore_1 = require("../../src/store/authStore");
const api_1 = require("../../src/utils/api");
function LoginScreen() {
    const { login } = (0, authStore_1.useAuthStore)();
    const [email, setEmail] = (0, react_1.useState)('');
    const [password, setPassword] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [showPassword, setShowPassword] = (0, react_1.useState)(false);
    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            react_native_1.Alert.alert('Error', 'Please enter email and password');
            return;
        }
        setLoading(true);
        try {
            const data = await (0, api_1.apiPost)('/auth/login', { email: email.trim(), password });
            login(data.user, data.tokens.accessToken, data.tokens.refreshToken);
        }
        catch (err) {
            const message = err.response?.data?.message || 'Login failed. Please check your credentials.';
            react_native_1.Alert.alert('Login Failed', message);
        }
        finally {
            setLoading(false);
        }
    };
    return (<react_native_1.KeyboardAvoidingView behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <react_native_1.ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" style={{ backgroundColor: '#0c4a6e' }}>
        <react_native_1.View style={{
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingVertical: 40,
            minHeight: 600,
        }}>
          {/* Logo */}
          <react_native_1.View style={{ alignItems: 'center', marginBottom: 40 }}>
            <react_native_1.View style={{
            width: 64,
            height: 64,
            backgroundColor: '#0ea5e9',
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
        }}>
              <react_native_1.Text style={{ fontSize: 28 }}>📦</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.Text style={{ fontSize: 28, fontWeight: '800', color: '#fff' }}>StockFlow</react_native_1.Text>
            <react_native_1.Text style={{ fontSize: 14, color: '#7dd3fc', marginTop: 4 }}>
              Inventory Management
            </react_native_1.Text>
          </react_native_1.View>

          {/* Form card */}
          <react_native_1.View style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 20,
            padding: 24,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)',
        }}>
            <react_native_1.Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 20 }}>
              Sign in
            </react_native_1.Text>

            <react_native_1.View style={{ marginBottom: 16 }}>
              <react_native_1.Text style={{ fontSize: 13, fontWeight: '500', color: '#bae6fd', marginBottom: 6 }}>
                Email address
              </react_native_1.Text>
              <react_native_1.TextInput value={email} onChangeText={setEmail} placeholder="admin@inventory.com" placeholderTextColor="rgba(255,255,255,0.3)" keyboardType="email-address" autoCapitalize="none" autoComplete="email" style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)',
            borderRadius: 12,
            padding: 14,
            color: '#fff',
            fontSize: 15,
        }}/>
            </react_native_1.View>

            <react_native_1.View style={{ marginBottom: 24 }}>
              <react_native_1.Text style={{ fontSize: 13, fontWeight: '500', color: '#bae6fd', marginBottom: 6 }}>
                Password
              </react_native_1.Text>
              <react_native_1.View style={{ position: 'relative' }}>
                <react_native_1.TextInput value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="rgba(255,255,255,0.3)" secureTextEntry={!showPassword} autoComplete="password" style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)',
            borderRadius: 12,
            padding: 14,
            paddingRight: 50,
            color: '#fff',
            fontSize: 15,
        }}/>
                <react_native_1.TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{
            position: 'absolute',
            right: 14,
            top: 14,
        }}>
                  <react_native_1.Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18 }}>
                    {showPassword ? '🙈' : '👁️'}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>
            </react_native_1.View>

            <react_native_1.TouchableOpacity onPress={handleLogin} disabled={loading} style={{
            backgroundColor: loading ? '#0284c7' : '#0ea5e9',
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
        }}>
              {loading ? (<react_native_1.ActivityIndicator color="#fff"/>) : (<react_native_1.Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                  Sign in
                </react_native_1.Text>)}
            </react_native_1.TouchableOpacity>

            {/* Demo credentials */}
            <react_native_1.View style={{
            marginTop: 20,
            padding: 14,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: 10,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
        }}>
              <react_native_1.Text style={{ color: '#7dd3fc', fontSize: 11, fontWeight: '600', marginBottom: 6 }}>
                DEMO CREDENTIALS
              </react_native_1.Text>
              <react_native_1.Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                Admin: admin@inventory.com / Admin@1234
              </react_native_1.Text>
              <react_native_1.Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>
                Staff: staff@inventory.com / Staff@1234
              </react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.ScrollView>
    </react_native_1.KeyboardAvoidingView>);
}
//# sourceMappingURL=login.js.map
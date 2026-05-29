import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useState } from 'react';
import { useAuthStore } from '../../src/store/authStore';
import { apiPost } from '../../src/utils/api';

export default function LoginScreen() {
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const data = await apiPost<any>('/auth/login', { email: email.trim(), password });
      login(data.user, data.tokens.accessToken, data.tokens.refreshToken);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login failed. Please check your credentials.';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: '#0c4a6e' }}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingVertical: 40,
          minHeight: 600,
        }}>
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <View style={{
              width: 64,
              height: 64,
              backgroundColor: '#0ea5e9',
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}>
              <Text style={{ fontSize: 28 }}>📦</Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff' }}>StockFlow</Text>
            <Text style={{ fontSize: 14, color: '#7dd3fc', marginTop: 4 }}>
              Inventory Management
            </Text>
          </View>

          {/* Form card */}
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 20,
            padding: 24,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)',
          }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 20 }}>
              Sign in
            </Text>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#bae6fd', marginBottom: 6 }}>
                Email address
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="admin@inventory.com"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                  borderRadius: 12,
                  padding: 14,
                  color: '#fff',
                  fontSize: 15,
                }}
              />
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#bae6fd', marginBottom: 6 }}>
                Password
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderRadius: 12,
                    padding: 14,
                    paddingRight: 50,
                    color: '#fff',
                    fontSize: 15,
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: 14,
                  }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18 }}>
                    {showPassword ? '🙈' : '👁️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={{
                backgroundColor: loading ? '#0284c7' : '#0ea5e9',
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                  Sign in
                </Text>
              )}
            </TouchableOpacity>

            {/* Demo credentials */}
            <View style={{
              marginTop: 20,
              padding: 14,
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
            }}>
              <Text style={{ color: '#7dd3fc', fontSize: 11, fontWeight: '600', marginBottom: 6 }}>
                DEMO CREDENTIALS
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                Admin: admin@inventory.com / Admin@1234
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>
                Staff: staff@inventory.com / Staff@1234
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

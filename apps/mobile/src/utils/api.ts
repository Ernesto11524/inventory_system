import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let queue: Array<{ resolve: (t: string) => void; reject: (e: any) => void }> = [];

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      const { refreshToken, setTokens, logout } = useAuthStore.getState();
      if (!refreshToken) { logout(); return Promise.reject(error); }
      try {
        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken });
        const { accessToken: na, refreshToken: nr } = data.data.tokens;
        setTokens(na, nr);
        queue.forEach(({ resolve }) => resolve(na));
        queue = [];
        return api(original);
      } catch (e) {
        queue.forEach(({ reject }) => reject(e));
        queue = [];
        logout();
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export const apiGet = async <T>(url: string, params?: object): Promise<T> => {
  const { data } = await api.get(url, { params });
  return data.data as T;
};

export const apiPost = async <T>(url: string, body?: object): Promise<T> => {
  const { data } = await api.post(url, body);
  return data.data as T;
};

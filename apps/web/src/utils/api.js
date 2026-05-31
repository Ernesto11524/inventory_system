import axios from 'axios';
import { useAuthStore } from '../store/authStore';
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export const api = axios.create({
    baseURL: `${BASE_URL}/api`,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: false,
});
// Request interceptor — attach access token
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
// Response interceptor — handle 401 and token refresh
let isRefreshing = false;
let failedQueue = [];
function processQueue(error, token = null) {
    failedQueue.forEach((prom) => {
        if (error)
            prom.reject(error);
        else
            prom.resolve(token);
    });
    failedQueue = [];
}
api.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return api(originalRequest);
            });
        }
        originalRequest._retry = true;
        isRefreshing = true;
        const { refreshToken, setTokens, logout } = useAuthStore.getState();
        if (!refreshToken) {
            logout();
            return Promise.reject(error);
        }
        try {
            const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken });
            const { accessToken: newAccess, refreshToken: newRefresh } = data.data.tokens;
            setTokens(newAccess, newRefresh);
            api.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
            processQueue(null, newAccess);
            return api(originalRequest);
        }
        catch (refreshError) {
            processQueue(refreshError, null);
            logout();
            return Promise.reject(refreshError);
        }
        finally {
            isRefreshing = false;
        }
    }
    return Promise.reject(error);
});
export async function get(url, params) {
    const { data } = await api.get(url, { params });
    return data;
}
export async function post(url, body) {
    const { data } = await api.post(url, body);
    return data;
}
export async function put(url, body) {
    const { data } = await api.put(url, body);
    return data;
}
export async function patch(url, body) {
    const { data } = await api.patch(url, body);
    return data;
}
export async function del(url) {
    const { data } = await api.delete(url);
    return data;
}
export async function postForm(url, formData) {
    const { data } = await api.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
}
//# sourceMappingURL=api.js.map
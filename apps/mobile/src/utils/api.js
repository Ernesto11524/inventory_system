"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiPost = exports.apiGet = exports.api = void 0;
const axios_1 = __importDefault(require("axios"));
const authStore_1 = require("../store/authStore");
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
exports.api = axios_1.default.create({
    baseURL: `${BASE_URL}/api`,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
});
exports.api.interceptors.request.use((config) => {
    const token = authStore_1.useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
let isRefreshing = false;
let queue = [];
exports.api.interceptors.response.use((r) => r, async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                queue.push({ resolve, reject });
            }).then((token) => {
                original.headers.Authorization = `Bearer ${token}`;
                return (0, exports.api)(original);
            });
        }
        original._retry = true;
        isRefreshing = true;
        const { refreshToken, setTokens, logout } = authStore_1.useAuthStore.getState();
        if (!refreshToken) {
            logout();
            return Promise.reject(error);
        }
        try {
            const { data } = await axios_1.default.post(`${BASE_URL}/api/auth/refresh`, { refreshToken });
            const { accessToken: na, refreshToken: nr } = data.data.tokens;
            setTokens(na, nr);
            queue.forEach(({ resolve }) => resolve(na));
            queue = [];
            return (0, exports.api)(original);
        }
        catch (e) {
            queue.forEach(({ reject }) => reject(e));
            queue = [];
            logout();
            return Promise.reject(e);
        }
        finally {
            isRefreshing = false;
        }
    }
    return Promise.reject(error);
});
const apiGet = async (url, params) => {
    const { data } = await exports.api.get(url, { params });
    return data.data;
};
exports.apiGet = apiGet;
const apiPost = async (url, body) => {
    const { data } = await exports.api.post(url, body);
    return data.data;
};
exports.apiPost = apiPost;
//# sourceMappingURL=api.js.map
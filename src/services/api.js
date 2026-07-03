// src/services/api.js
import axios from "axios";
import { getAccessToken, getRefreshToken, clearToken, saveToken } from "../utils/tokenStorage.js";
import { refresh } from "./refreshService.js";

const API_URL = "https://wo365ovs53.execute-api.ap-southeast-1.amazonaws.com";

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Thường token hết hạn server trả 401, nhưng backend của bạn trả 400 thì giữ nguyên
        if (error.response?.status === 400 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const response = await refresh(getRefreshToken());
                saveToken(response);
                originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                clearToken();
                // Dùng location.href an toàn hơn gọi router trong interceptor
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
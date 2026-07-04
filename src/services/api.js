import axios from "axios";
import { getAccessToken, getRefreshToken, clearToken, saveToken } from "../utils/tokenStorage.js";
import { refresh } from "./refreshService.js";

const API_URL = "https://wo365ovs53.execute-api.ap-southeast-1.amazonaws.com";

const api = axios.create({
    baseURL: API_URL,
    timeout: 30000,
    headers: { "Content-Type": "application/json" }
});

// Biến kiểm soát trạng thái hàng đợi refresh token
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
    refreshSubscribers.push(cb);
};

const onRefreshed = (token) => {
    refreshSubscribers.map((cb) => cb(token));
    refreshSubscribers = [];
};

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
        const status = error.response?.status;

        if ([400, 401, 403].includes(status) && !originalRequest._retry) {
            originalRequest._retry = true;
            const currentRefreshToken = getRefreshToken();

            if (!currentRefreshToken) {
                clearToken();
                window.location.href = '/login';
                return Promise.reject(error);
            }

            // Nếu chưa có tiến trình nào đi làm mới token, tiến hành gọi API refresh
            if (!isRefreshing) {
                isRefreshing = true;
                refresh(currentRefreshToken)
                    .then((refreshData) => {
                        isRefreshing = false;
                        const newAccessToken = refreshData?.accessToken || refreshData?.token || refreshData?.data?.accessToken;
                        const newRefreshToken = refreshData?.refreshToken || refreshData?.data?.refreshToken || currentRefreshToken;

                        if (newAccessToken) {
                            saveToken({ accessToken: newAccessToken, refreshToken: newRefreshToken });
                            onRefreshed(newAccessToken); // Thông báo cho các request đang xếp hàng
                        }
                    })
                    .catch((refreshError) => {
                        isRefreshing = false;
                        clearToken();
                        window.location.href = '/login';
                        return Promise.reject(refreshError);
                    });
            }

            // Các request đến sau sẽ được đưa vào hàng đợi chờ gán token mới
            return new Promise((resolve) => {
                subscribeTokenRefresh((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    resolve(api(originalRequest));
                });
            });
        }
        return Promise.reject(error);
    }
);

export default api;
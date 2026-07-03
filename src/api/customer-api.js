import api from '../services/api.js';

const CUSTOMER_ENDPOINT = "/customers";

// Khai báo biến lưu trữ cache
let cachedCustomers = null;

export const customerApi = {
    async getAll(forceReload = false) {
        // Nếu đã có cache và không bắt buộc reload -> Trả về cache ngay lập tức
        if (cachedCustomers && !forceReload) return cachedCustomers;

        const response = await api.get(CUSTOMER_ENDPOINT);
        cachedCustomers = response; // Lưu vào cache
        return cachedCustomers;
    },
    async create(payload) {
        const res = await api.post(CUSTOMER_ENDPOINT, payload);
        cachedCustomers = null; // Xóa cache khi có dữ liệu mới
        return res;
    },
    async update(customerId, payload) {
        const res = await api.put(`${CUSTOMER_ENDPOINT}/${customerId}`, payload);
        cachedCustomers = null; // Xóa cache
        return res;
    },
    async remove(customerId) {
        const res = await api.delete(`${CUSTOMER_ENDPOINT}/${customerId}`);
        cachedCustomers = null; // Xóa cache
        return res;
    },
};

export const getAllCustomers = async () => {
    // Dùng chung cache với hàm trên
    const response = await customerApi.getAll();
    return response.data || response;
};
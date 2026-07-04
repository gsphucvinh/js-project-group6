import api from "./api.js";

let cachedCustomers = null;

const customerService = {
    async getAll(forceReload = false) {
        if (cachedCustomers && !forceReload) return cachedCustomers;

        const response = await api.get("/customers");
        cachedCustomers = response.data?.data || response.data || [];
        return cachedCustomers;
    },
    async create(payload) {
        const res = await api.post("/customers", payload);
        cachedCustomers = null; // Xóa cache
        return res.data;
    },
    async update(id, payload) {
        const res = await api.put(`/customers/${id}`, payload);
        cachedCustomers = null; // Xóa cache
        return res.data;
    },
    async remove(id) {
        const res = await api.delete(`/customers/${id}`);
        cachedCustomers = null; // Xóa cache
        return res.data;
    }
};

export default customerService;
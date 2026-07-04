import api from "./api.js";

let cachedOrders = null;

const orderService = {
    async getAll(forceReload = false) {
        if (cachedOrders && !forceReload) return cachedOrders;

        const { data } = await api.get("/orders");
        cachedOrders = Array.isArray(data) ? data : (data.data || []);
        return cachedOrders;
    },
    async create(payload) {
        const res = await api.post("/orders", payload);
        cachedOrders = null; // Xóa cache
        return res.data;
    },
    async update(id, data) {
        const res = await api.put(`/orders/${id}`, data);
        cachedOrders = null; // Xóa cache
        return res.data;
    }
};

export default orderService;
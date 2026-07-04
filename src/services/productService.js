import api from "./api.js";

let cachedProducts = null;

const productService = {
    async getAll(forceReload = false) {
        if (cachedProducts && !forceReload) return cachedProducts;

        const { data } = await api.get("/products");
        cachedProducts = Array.isArray(data) ? data : (data.data || []);
        return cachedProducts;
    },
    async getById(id) {
        const { data } = await api.get(`/products/${id}`);
        return data;
    },
    async create(payload) {
        const res = await api.post("/products", payload);
        cachedProducts = null; // Xóa cache ngay khi có hành động thêm mới
        return res.data;
    },
    async update(id, payload) {
        const res = await api.put(`/products/${id}`, payload);
        cachedProducts = null; // Xóa cache ngay khi có hành động chỉnh sửa
        return res.data;
    },
    async delete(id) {
        const res = await api.delete(`/products/${id}`);
        cachedProducts = null; // Xóa cache ngay khi có hành động xóa
        return res.data;
    }
};

export default productService;
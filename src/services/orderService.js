import { getAllOrders, createOrder, updateOrder } from '../api/order-api.js';

let cachedOrders = null;

const orderService = {
    getAll: async (forceReload = false) => {
        if (cachedOrders && !forceReload) return cachedOrders;
        cachedOrders = await getAllOrders();
        return cachedOrders;
    },
    create: async (data) => {
        const res = await createOrder(data);
        cachedOrders = null; // Xóa cache
        return res;
    },
    update: async (id, data) => {
        const res = await updateOrder(id, data);
        cachedOrders = null; // Xóa cache
        return res;
    }
};

export default orderService;
import api from '../services/api.js';

// Lấy toàn bộ danh sách đơn hàng
const getAllOrders = async () => {
    const response = await api.get('/orders');
    return response.data || [];
};

// Tạo đơn hàng mới
const createOrder = async (orderData) => {
    const response = await api.post('/orders', orderData);
    return response.data;
};

// Cập nhật trạng thái đơn hàng
const updateOrder = async (id, orderData) => {
    const response = await api.put(`/orders/${id}`, orderData);
    return response.data;
};

export { getAllOrders, createOrder, updateOrder };

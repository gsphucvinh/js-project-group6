// src/api/product-api.js
import api from '../services/api.js';

const PRODUCT_ENDPOINT = '/products';

export const getAllProducts = async () => {
    const response = await api.get(PRODUCT_ENDPOINT);
    return response.data || [];
};

export const getProductById = async (id) => {
    const response = await api.get(`${PRODUCT_ENDPOINT}/${id}`);
    return response.data;
};

export const createProduct = async (productData) => {
    const response = await api.post(PRODUCT_ENDPOINT, productData);
    return response.data;
};

export const updateProduct = async (id, productData) => {
    const response = await api.put(`${PRODUCT_ENDPOINT}/${id}`, productData);
    return response.data;
};

export const deleteProduct = async (id) => {
    const response = await api.delete(`${PRODUCT_ENDPOINT}/${id}`);
    return response.data;
};
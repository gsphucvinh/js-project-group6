import api from "./api.js";

let cachedProducts = null;

const getAll = async (forceReload = false) => {
    if (cachedProducts && !forceReload) return cachedProducts;

    const response = await api.get("/products");
    cachedProducts = response.data;
    return cachedProducts;
};

// Gọi hàm này sau khi Xóa / Thêm / Sửa sản phẩm (nếu file view gọi trực tiếp qua service)
const clearCache = () => {
    cachedProducts = null;
};

const productService = {
    getAll,
    clearCache
};

export default productService;
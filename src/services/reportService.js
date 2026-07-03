import api from "./api";

const getOrder = async () => {
    const response = await api.get("/orders");
    return response.data;
};

export { getOrder };
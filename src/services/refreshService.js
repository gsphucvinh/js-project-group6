import axios from "axios";

const refresh = async (refreshToken) => {

    const response = await axios.post(
        "https://wo365ovs53.execute-api.ap-southeast-1.amazonaws.com/auth/refresh-token",
        {
            refreshToken
        },
        {
            headers: {
                "Content-Type": "application/json"
            }
        }
    );

    return response.data;
};


export {
    refresh
};
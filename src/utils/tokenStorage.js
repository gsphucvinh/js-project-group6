
//Tên chung của key
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

//Lưu token
const saveToken = ({accessToken, refreshToken}) => {
    if(!accessToken || !refreshToken) throw new Error("Token không hợp lệ");
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}


//Lấy access token
const getAccessToken = () =>{
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}

const getRefreshToken = () =>{
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

const clearToken = () =>{
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.clear()
}

const isLoginIn = ()=>{
    return !!getAccessToken()
}

export {
    saveToken,
    getAccessToken,
    getRefreshToken,
    clearToken,
    isLoginIn,
};
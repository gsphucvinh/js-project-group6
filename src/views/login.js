import { login } from "../services/authService.js";
import router from "../router";

const render = () => {
    return `
        <div class="login-container">
            <h2>Đăng nhập</h2>

            <form id="login-form">
                <div>
                    <label>Email</label>
                    <input
                        type="email"
                        id="email"
                        placeholder="Nhập email"
                    >
                </div>

                <div>
                    <label>Password</label>
                    <input
                        type="password"
                        id="password"
                        placeholder="Nhập password"
                    >
                </div>

                <button type="submit">
                    Đăng nhập
                </button>
            </form>

            <div id="login-error"></div>
        </div>
    `;
};

const showPopupError = (message) => {
    const errorElement = document.getElementById("login-error");

    errorElement.textContent = message;
};

const handleLogin = async (e) => {
    e.preventDefault();

    const email = document
        .getElementById("email")
        .value
        .trim();

    const password = document
        .getElementById("password")
        .value
        .trim();

    // Validate
    if (!email || !password) {
        showPopupError(
            "Email và mật khẩu không được để trống"
        );
        return;
    }

    try {
        await login({
            email,
            password
        });

        router.navigate("/dashboard");
        console.log("Đăng nhập thành công");

    } catch (error) {
        showPopupError(
            error.response?.data?.message ||
            "Đăng nhập thất bại"
        );
    }
};

const init = () => {
    const form = document.getElementById("login-form");

    form.addEventListener(
        "submit",
        handleLogin
    );
};


export default {render,init};
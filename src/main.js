// src/main.js
import router from "./router/index.js";
import './style.css';

// Import Views
import loginPage from "./views/login.js";
import dashboardPage from "./views/dashboard.js";
import orderPage from "./views/orders.js";
import reportPage from "./views/reports.js";
import productsPage from "./views/products.js";
import customersPage from "./views/customers.js";

// Import Utils
import { logout } from "./services/authService.js";
import { isLoginIn } from "./utils/tokenStorage.js";

window.router = router;

const appContainer = document.getElementById("app");

// 1. Hàm vẽ khung Sidebar và Header chung
const renderAdminLayout = () => {
    if (!document.getElementById("sidebar")) {
        appContainer.innerHTML = `
            <aside class="sidebar" id="sidebar">
                <div>
                    <h2>ShopAdmin</h2>
                    <ul>
                        <li data-path="/dashboard"><a href="/dashboard" data-navigo><i class="fas fa-home"></i> Tổng quan</a></li>
                        <li data-path="/products"><a href="/products" data-navigo><i class="fas fa-box"></i> Sản phẩm</a></li>
                        <li data-path="/orders"><a href="/orders" data-navigo><i class="fas fa-shopping-cart"></i> Đơn hàng</a></li>
                        <li data-path="/customers"><a href="/customers" data-navigo><i class="fas fa-users"></i> Khách hàng</a></li>
                        <li data-path="/reports"><a href="/reports" data-navigo><i class="fas fa-chart-line"></i> Báo cáo</a></li>
                    </ul>
                </div>
                <div>
                    <button id="logout-btn" class="btn-logout"><i class="fas fa-sign-out-alt"></i> Đăng xuất</button>
                </div>
            </aside>
            <main id="main-content" class="main-content"></main>
        `;
        document.getElementById("logout-btn").addEventListener("click", () => {
            if (confirm("Bạn có chắc chắn muốn đăng xuất?")) { logout(); router.navigate("/login"); }
        });
    }
};

// Khớp class active dựa trên tham số chủ động truyền từ Router
const updateSidebarActiveState = (activePath) => {
    if (!activePath) return;

    document.querySelectorAll('#sidebar ul li').forEach(li => {
        li.classList.remove('active');
        li.querySelector('a')?.classList.remove('active');
    });

    document.querySelectorAll('#sidebar ul li').forEach(li => {
        const tabPath = li.getAttribute('data-path');
        // Định vị chính xác trang Dashboard hoặc các trang con cấp 2 bắt đầu bằng Path cha
        const isActive = tabPath === '/dashboard' ? activePath === '/dashboard' : activePath.startsWith(tabPath);

        if (isActive) {
            li.classList.add('active');
            li.querySelector('a')?.classList.add('active');
        }
    });
};

// Tìm đến hàm loadAppPage trong src/main.js và cập nhật đoạn đầu tiên:

import { refresh } from "./services/refreshService.js"; // Bổ sung dòng import này ở đầu file main.js nếu chưa có
import { getAccessToken, getRefreshToken, clearToken, saveToken } from "./utils/tokenStorage.js";

const loadAppPage = async (pageModule, requiresAuth = true, data = null, activePath = null) => {
    let token = getAccessToken();
    const rToken = getRefreshToken();

    // TÌNH HUỐNG NÂNG CAO: Access Token hết hạn/bị xoá do F5 trang nhưng Refresh Token vẫn còn hiệu lực
    if (requiresAuth && !token && rToken) {
        try {
            // Chạy ngầm xin cấp lại cặp token mới trước khi xác định quyền vào trang
            const refreshData = await refresh(rToken);
            const newAccessToken = refreshData?.accessToken || refreshData?.token || refreshData?.data?.accessToken;
            const newRefreshToken = refreshData?.refreshToken || refreshData?.data?.refreshToken || rToken;

            if (newAccessToken) {
                saveToken({ accessToken: newAccessToken, refreshToken: newRefreshToken });
                token = newAccessToken; // Cập nhật lại biến token hiện hành để vượt qua vòng kiểm tra bên dưới
            }
        } catch (err) {
            console.error("Silent refresh thất bại khi tải lại trang:", err);
            clearToken(); // Refresh token hỏng -> Xoá bộ nhớ và ép về Login
            router.navigate("/login");
            return;
        }
    }

    // Kiểm tra phân quyền điều hướng (Giữ nguyên logic bảo mật của bạn)
    if (requiresAuth && !token) {
        router.navigate("/login");
        return;
    }

    if (!requiresAuth && token) {
        router.navigate("/dashboard");
        return;
    }

    // Tiến hành vẽ layout Admin nếu mọi điều kiện hợp lệ
    if (requiresAuth) {
        document.body.classList.remove("is-logged-out");
        renderAdminLayout();
        updateSidebarActiveState(activePath);
        const mainContent = document.getElementById("main-content");

        mainContent.innerHTML = pageModule.render(data);
        if (pageModule.init) await pageModule.init(data);
    } else {
        document.body.classList.add("is-logged-out");
        appContainer.innerHTML = pageModule.render();
        if (pageModule.init) await pageModule.init();
    }

    router.updatePageLinks();
};

router
    .on("/", () => loadAppPage(dashboardPage, true, null, "/dashboard"))
    .on("/login", () => loadAppPage(loginPage, false))
    .on("/dashboard", () => loadAppPage(dashboardPage, true, null, "/dashboard"))

    // Nhóm Products: Dù ở trang danh sách hay form thêm/sửa thì menu "Sản phẩm" vẫn sáng
    .on("/products", () => loadAppPage(productsPage, true, null, "/products"))
    .on("/products/add", () => loadAppPage(productsPage, true, { mode: 'add' }, "/products"))
    .on("/products/edit/:id", (match) => loadAppPage(productsPage, true, { mode: 'edit', id: match.data.id }, "/products"))

    .on("/orders", () => loadAppPage(orderPage, true, null, "/orders"))

    // Nhóm Customers: Menu "Khách hàng" luôn luôn sáng khi ở trong các đường dẫn này
    .on("/customers", () => loadAppPage(customersPage, true, null, "/customers"))
    .on("/customers/create", () => loadAppPage(customersPage, true, { mode: 'add' }, "/customers"))
    .on("/customers/edit/:id", (match) => loadAppPage(customersPage, true, { mode: 'edit', id: match.data.id }, "/customers"))

    .on("/reports", () => loadAppPage(reportPage, true, null, "/reports"))
    .resolve();
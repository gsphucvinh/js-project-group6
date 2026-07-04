import { customerApi } from "../api/./customer-api.js";
import { clearToken as clearAuthSession } from "../utils/tokenStorage.js";
import customerService from "../services/customerService.js";

// PAGE STATE
const customerState = {
    customers: [],
    search: "",
    tier: "all",
    loading: false,
    error: "",
};

// ==========================================
// 1. CHUẨN HOÁ GIAO DIỆN (RENDER)
// ==========================================
const render = (data) => {
    // Trả về bộ khung tuỳ theo mode (List, Add, Edit)
    if (data?.mode === 'add' || data?.mode === 'edit') {
        return `<div id="customer-form-root" class="page-container">
            <div class="page-header">
                <h2><i class="fas fa-spinner fa-spin"></i> Đang tải...</h2>
            </div>
        </div>`;
    }

    // Giao diện danh sách mặc định
    return `
        <div id="customer-list-root" class="page-container">
            <header>
                <div class="search-bar">
                    <input type="text" id="customerSearchInput" placeholder="Tìm tên, email hoặc số điện thoại..." value="${escapeHTML(customerState.search)}">
                </div>
                <a href="/customers/create" class="btn-add" data-navigo>
                    <i class="fas fa-user-plus"></i> Thêm khách hàng
                </a>
            </header>

            <section class="stats">
                <div class="card">
                    <h3>Tổng khách hàng</h3>
                    <p id="totalCustomers">0</p>
                </div>
                <div class="card">
                    <h3>Khách hàng mới tháng này</h3>
                    <p id="newCustomers">0</p>
                </div>
                <div class="card">
                    <h3>Tỉ lệ quay lại</h3>
                    <p id="returnRate">0%</p>
                </div>
            </section>

            <section class="table-container">
                <div class="table-header">
                    <h3>Danh sách khách hàng</h3>
                    <select id="tierFilter">
                        <option value="all">Hạng: Tất cả</option>
                        <option value="gold">Hạng: Vàng</option>
                        <option value="silver">Hạng: Bạc</option>
                        <option value="bronze">Hạng: Đồng</option>
                    </select>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Khách hàng</th>
                            <th>Liên hệ</th>
                            <th>Hạng</th>
                            <th>Đơn hàng</th>
                            <th>Tổng chi tiêu</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody id="customerTableBody">
                        <tr>
                            <td colspan="6" class="empty-state" style="text-align: center; padding: 20px;">
                                <i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu khách hàng...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </section>
        </div>
    `;
};

// ==========================================
// 2. CHUẨN HOÁ LOGIC (INIT)
// ==========================================
const init = async (data) => {
    if (data?.mode === 'add') {
        renderCustomerFormPage(null);
    } else if (data?.mode === 'edit') {
        await initEditPage(data.id);
    } else {
        bindCustomerListEvents();
        await loadCustomers();
    }
};

// ==========================================
// 3. LOGIC XỬ LÝ TRANG DANH SÁCH
// ==========================================
function bindCustomerListEvents() {
    const searchInput = document.getElementById("customerSearchInput");
    const tierFilter = document.getElementById("tierFilter");
    const tableBody = document.getElementById("customerTableBody");

    tierFilter.value = customerState.tier;

    searchInput.addEventListener("input", function (event) {
        customerState.search = event.target.value;
        renderCustomerRows();
    });

    tierFilter.addEventListener("change", function (event) {
        customerState.tier = event.target.value;
        renderCustomerRows();
    });

    tableBody.addEventListener("click", async function (event) {
        const deleteButton = event.target.closest("[data-delete-id]");
        if (!deleteButton) return;

        const customerId = deleteButton.dataset.deleteId;
        const confirmed = confirm("Bạn có chắc chắn muốn xóa khách hàng này không?");
        if (!confirmed) return;

        try {
            await customerApi.remove(customerId);
            alert("Xóa khách hàng thành công");
            await loadCustomers();
        } catch (error) {
            handleApiError(error);
        }
    });
}

async function loadCustomers() {
    try {
        customerState.loading = true;
        customerState.error = "";

        // Gọi qua Service có tích hợp bộ nhớ đệm
        const response = await customerService.getAll();
        customerState.customers = normalizeCustomerListResponse(response);

        renderCustomerStats();
        renderCustomerRows();
    } catch (error) {
        if (isAuthError(error)) {
            handleApiError(error);
            return;
        }
        customerState.error = error.message || "Không thể tải danh sách khách hàng";
        renderCustomerError(customerState.error);
    } finally {
        customerState.loading = false;
    }
}

function renderCustomerStats() {
    const customers = customerState.customers;
    const totalCustomersElement = document.getElementById("totalCustomers");
    const newCustomersElement = document.getElementById("newCustomers");
    const returnRateElement = document.getElementById("returnRate");

    if (!totalCustomersElement || !newCustomersElement || !returnRateElement) return;

    const totalCustomers = customers.length;
    const newCustomers = customers.filter(c => isCurrentMonth(c.createdAt)).length;
    const returningCustomers = customers.filter(c => Number(c.orders) > 1).length;

    const returnRate = totalCustomers === 0 ? 0 : Math.round((returningCustomers / totalCustomers) * 100);

    totalCustomersElement.textContent = totalCustomers;
    newCustomersElement.textContent = newCustomers;
    returnRateElement.textContent = returnRate + "%";
}

function renderCustomerRows() {
    const tableBody = document.getElementById("customerTableBody");
    if (!tableBody) return;

    const customers = getFilteredCustomers();

    if (customers.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="empty-state" style="text-align: center; padding: 20px;">Không tìm thấy khách hàng phù hợp</td></tr>`;
        return;
    }

    // Cập nhật thẻ <tr> trong hàm renderCustomerRows() của customers.js
    tableBody.innerHTML = customers.map(function (customer) {
        const tier = getCustomerTier(customer.totalSpent);
        // Random màu nhẹ cho avatar
        const bgColors = ['#ebf5fb', '#fdf2e9', '#f4f6f7', '#e8f5e9'];
        const textColors = ['#3498db', '#e67e22', '#7f8c8d', '#27ae60'];
        const rand = Math.floor(Math.random() * 4);

        return `
            <tr>
                <td>
                    <div class="cust-info">
                        <div class="avatar" style="background: ${bgColors[rand]}; color: ${textColors[rand]};">
                            ${escapeHTML(getInitials(customer.name))}
                        </div>
                        <div>
                            <strong>${escapeHTML(customer.name)}</strong><br>
                            <small>ID: ${escapeHTML(customer.id)}</small>
                        </div>
                    </div>
                </td>
                <td>
                    ${escapeHTML(customer.email)}<br>
                    <small>${escapeHTML(customer.phone)}</small>
                </td>
                <td><span class="tier ${tier.className}">${tier.label}</span></td>
                <td>${Number(customer.orders)}</td>
                <td><strong>${formatCurrency(customer.totalSpent)}</strong></td>
                <td>
                    <a href="/customers/edit/${encodeURIComponent(customer.id)}" class="btn-action" title="Sửa" data-navigo>
                        <i class="fas fa-user-edit"></i>
                    </a>
                    <button class="btn-action" data-delete-id="${escapeHTML(customer.id)}" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    if (window.router) window.router.updatePageLinks();
}

function renderCustomerError(message) {
    const tableBody = document.getElementById("customerTableBody");
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="6" class="empty-state error-text" style="color: red; text-align: center;">${escapeHTML(message)}</td></tr>`;
    }
}


// ==========================================
// 4. LOGIC XỬ LÝ TRANG FORM (ADD/EDIT)
// ==========================================
async function initEditPage(customerId) {
    const root = document.getElementById("customer-form-root");
    try {
        const response = await customerApi.getAll();
        const customers = normalizeCustomerListResponse(response);
        const customer = customers.find(item => String(item.id) === String(customerId));

        if (!customer) throw new Error("Không tìm thấy khách hàng");
        renderCustomerFormPage(customer);
    } catch (error) {
        if (isAuthError(error)) {
            handleApiError(error);
            return;
        }
        root.innerHTML = `
            <div class="page-header">
                <h2>Không tìm thấy khách hàng</h2>
                <a href="/customers" class="btn-secondary" data-navigo><i class="fas fa-arrow-left"></i> Quay lại</a>
            </div>
            <section class="card">
                <h3 style="color: red;">Lỗi</h3>
                <p>${escapeHTML(error.message || "Không thể tải khách hàng")}</p>
            </section>
        `;
        if (window.router) window.router.updatePageLinks();
    }
}

function renderCustomerFormPage(customer = null) {
    const root = document.getElementById("customer-form-root");
    if (!root) return;

    const isEditMode = Boolean(customer?.id);

    root.innerHTML = `
        <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2>${isEditMode ? "Sửa khách hàng" : "Thêm khách hàng mới"}</h2>
            <a href="/customers" class="btn-secondary" data-navigo style="padding: 8px 16px; background: #e2e8f0; border-radius: 6px; text-decoration: none; color: #333;"><i class="fas fa-arrow-left"></i> Quay lại</a>
        </div>

        <section class="form-card" style="background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <form id="customerForm">
                <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div class="form-group" data-field="name">
                        <label>Tên khách hàng</label><br>
                        <input type="text" id="customerName" name="name" value="${escapeHTML(customer ? customer.name : "")}" placeholder="Nhập tên khách hàng" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #cbd5e1; border-radius: 4px;">
                        <small class="form-error" style="color: red; display: block; margin-top: 4px;"></small>
                    </div>

                    <div class="form-group" data-field="email">
                        <label>Email</label><br>
                        <input type="email" id="customerEmail" name="email" value="${escapeHTML(customer ? customer.email : "")}" placeholder="example@email.com" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #cbd5e1; border-radius: 4px;">
                        <small class="form-error" style="color: red; display: block; margin-top: 4px;"></small>
                    </div>

                    <div class="form-group" data-field="phone">
                        <label>Số điện thoại</label><br>
                        <input type="text" id="customerPhone" name="phone" value="${escapeHTML(customer ? customer.phone : "")}" placeholder="0912.345.678" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #cbd5e1; border-radius: 4px;">
                        <small class="form-error" style="color: red; display: block; margin-top: 4px;"></small>
                    </div>

                    <div class="form-group" data-field="orders">
                        <label>Số đơn hàng</label><br>
                        <input type="number" id="customerOrders" name="orders" min="0" value="${escapeHTML(customer ? customer.orders : 0)}" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #cbd5e1; border-radius: 4px;">
                        <small class="form-error" style="color: red; display: block; margin-top: 4px;"></small>
                    </div>

                    <div class="form-group full" data-field="totalSpent" style="grid-column: span 2;">
                        <label>Tổng chi tiêu</label><br>
                        <input type="number" id="customerTotalSpent" name="totalSpent" min="0" value="${escapeHTML(customer ? customer.totalSpent : 0)}" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #cbd5e1; border-radius: 4px;">
                        <small class="form-error" style="color: red; display: block; margin-top: 4px;"></small>
                    </div>
                </div>

                <div class="form-actions" style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                    ${isEditMode ? `<button type="button" class="btn-danger" id="deleteCustomerButton" style="padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: auto;"><i class="fas fa-trash"></i> Xóa</button>` : ""}
                    <a href="/customers" class="btn-secondary" data-navigo style="padding: 8px 16px; background: #e2e8f0; color: #333; text-decoration: none; border-radius: 6px;">Hủy</a>
                    <button type="submit" class="btn-primary" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;"><i class="fas fa-save"></i> Lưu khách hàng</button>
                </div>
            </form>
        </section>
    `;

    if (window.router) window.router.updatePageLinks();

    const form = document.getElementById("customerForm");
    const deleteButton = document.getElementById("deleteCustomerButton");

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        const formData = getCustomerFormData(form);
        if (!validateCustomerForm(form, formData)) return;

        try {
            const payload = buildCustomerPayload(formData);
            if (isEditMode) {
                await customerApi.update(customer.id, payload);
                alert("Cập nhật khách hàng thành công");
            } else {
                await customerApi.create(payload);
                alert("Thêm khách hàng thành công");
            }
            window.router.navigate("/customers");
        } catch (error) {
            handleApiError(error);
        }
    });

    if (deleteButton) {
        deleteButton.addEventListener("click", async function () {
            if (!confirm("Bạn có chắc chắn muốn xóa khách hàng này không?")) return;
            try {
                await customerApi.remove(customer.id);
                alert("Xóa khách hàng thành công");
                window.router.navigate("/customers");
            } catch (error) {
                handleApiError(error);
            }
        });
    }
}


// ==========================================
// 5. CÁC HÀM TIỆN ÍCH (HELPERS)
// ==========================================
function isAuthError(error) { return error?.status === 401 || error?.status === 403; }
function handleApiError(error) {
    if (isAuthError(error)) {
        clearAuthSession();
        alert("Phiên đăng nhập hết hạn hoặc không có quyền. Vui lòng đăng nhập lại.");
        if (window.router) window.router.navigate("/login");
        return;
    }
    alert(error.message || "Đã có lỗi xảy ra");
}

function normalizeCustomerListResponse(response) {
    if (Array.isArray(response)) return response.map(normalizeCustomer);
    if (Array.isArray(response?.data)) return response.data.map(normalizeCustomer);
    if (Array.isArray(response?.customers)) return response.customers.map(normalizeCustomer);
    if (Array.isArray(response?.items)) return response.items.map(normalizeCustomer);
    return [];
}
function normalizeCustomer(customer = {}) {
    return {
        id: String(customer.id || customer._id || customer.customerId || ""),
        name: String(customer.name || customer.fullName || customer.customerName || ""),
        email: String(customer.email || ""),
        phone: String(customer.phone || customer.phoneNumber || ""),
        orders: Number(customer.orders || customer.ordersCount || customer.totalOrders || 0),
        totalSpent: Number(customer.totalSpent || customer.totalAmount || 0),
        createdAt: customer.createdAt || new Date().toISOString(),
    };
}
function getCustomerFormData(form) {
    const formData = new FormData(form);
    return {
        name: String(formData.get("name") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        phone: String(formData.get("phone") || "").trim(),
        orders: Number(formData.get("orders")),
        totalSpent: Number(formData.get("totalSpent")),
    };
}
function buildCustomerPayload(formData) { return formData; }

function validateCustomerForm(form, data) {
    clearErrors(form);
    let isValid = true;
    if (data.name.length < 2) { setError(form, "name", "Tên khách hàng phải có ít nhất 2 ký tự"); isValid = false; }
    if (!isValidEmail(data.email)) { setError(form, "email", "Email không hợp lệ"); isValid = false; }
    if (!isValidPhone(data.phone)) { setError(form, "phone", "Số điện thoại phải từ 9-11 số"); isValid = false; }
    if (!Number.isInteger(data.orders) || data.orders < 0) { setError(form, "orders", "Số đơn hàng phải >= 0"); isValid = false; }
    if (Number.isNaN(data.totalSpent) || data.totalSpent < 0) { setError(form, "totalSpent", "Tổng chi tiêu phải >= 0"); isValid = false; }
    return isValid;
}
function clearErrors(form) {
    form.querySelectorAll(".form-group").forEach(g => {
        g.classList.remove("has-error");
        const err = g.querySelector(".form-error");
        if (err) err.textContent = "";
    });
}
function setError(form, fieldName, message) {
    const group = form.querySelector(`[data-field="${fieldName}"]`);
    if (group) {
        group.classList.add("has-error");
        group.querySelector(".form-error").textContent = message;
    }
}
function getFilteredCustomers() {
    const searchValue = normalizeText(customerState.search);
    return customerState.customers.filter(c => {
        const tier = getCustomerTier(c.totalSpent);
        const matchesSearch = !searchValue || normalizeText(c.name).includes(searchValue) || normalizeText(c.email).includes(searchValue) || normalizeText(c.phone).includes(searchValue);
        const matchesTier = customerState.tier === "all" || tier.value === customerState.tier;
        return matchesSearch && matchesTier;
    });
}
function getCustomerTier(totalSpent) {
    const spent = Number(totalSpent);
    if (spent >= 30000000) return { label: "VÀNG", className: "gold", value: "gold" };
    if (spent >= 10000000) return { label: "BẠC", className: "silver", value: "silver" };
    return { label: "ĐỒNG", className: "bronze", value: "bronze" };
}
function isCurrentMonth(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    if (Number.isNaN(date.getTime())) return false;
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}
function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function isValidPhone(phone) { const d = String(phone).replace(/\D/g, ""); return d.length >= 9 && d.length <= 11; }
function normalizeText(value) { return String(value).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s.\-_]/g, ""); }
function getInitials(name) {
    const words = String(name).trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
function formatCurrency(value) { return new Intl.NumberFormat("vi-VN").format(Number(value) || 0) + "đ"; }
function escapeHTML(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export default { render, init };
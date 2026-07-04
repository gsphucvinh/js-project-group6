// src/views/orders.js
import orderService from '../services/orderService.js';
import productService from '../services/productService.js';
import customerService from '../services/customerService.js';
import { formatCurrency, normalizeDate, removeVietnameseTones } from '../utils/helpers.js';

const STATUS_TEXT = {
    pending: 'Chờ xử lý',
    delivering: 'Đang giao',
    done: 'Hoàn thành',
    cancel: 'Đã hủy'
};

const STATUS_BADGE = {
    pending: 'badge pending',
    delivering: 'badge shipping',
    done: 'badge completed',
    cancel: 'badge cancelled'
};

const OrdersView = {
    orders: [],
    customers: [],
    products: [],

    activeTab: 'all',
    searchQuery: '',
    dateFilter: '',
    selectedOrderDetail: null,

    render() {
        return `
            <header>
                <div class="search-bar">
                    <input type="text" id="orderSearchInput" placeholder="Tìm mã đơn, tên khách hàng, SĐT...">
                </div>
                <div style="display:flex;gap:10px;">
                    <button class="btn-add" id="btnOpenCreateOrder">
                        <i class="fas fa-plus"></i> Tạo đơn hàng
                    </button>
                    <button class="btn-export" id="btnExportExcel" style="background: var(--success);">
                        <i class="fas fa-download"></i> Xuất Excel
                    </button>
                </div>
            </header>

            <section class="stats">
                <div class="card blue"><h3>Tổng đơn hàng</h3><p id="statTotalOrders">0</p></div>
                <div class="card orange"><h3>Đang xử lý</h3><p id="statPendingOrders">0</p></div>
                <div class="card green"><h3>Thành công</h3><p id="statCompletedOrders">0</p></div>
                <div class="card red"><h3>Đã hủy</h3><p id="statCancelledOrders">0</p></div>
            </section>

            <section class="table-container">
                <div class="order-controls">
                    <div class="tabs">
                        <button class="tab active" data-tab="all">Tất cả</button>
                        <button class="tab" data-tab="pending">Chờ xử lý</button>
                        <button class="tab" data-tab="shipping">Đang giao</button>
                        <button class="tab" data-tab="completed">Đã xong</button>
                    </div>
                    <div class="date-filter">
                        <input type="date" id="orderDateFilter">
                    </div>
                </div>
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Mã đơn</th><th>Khách hàng</th><th>Sản phẩm</th>
                                <th>Tổng tiền</th><th>Trạng thái</th><th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody id="orderTableBody">
                            <tr><td colspan="6" class="empty-state">
                                <i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu đơn hàng...
                            </td></tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <div id="detailsModal" class="modal">
                <div class="modal-content">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:15px; margin-bottom:20px;">
                        <h3 style="margin:0; font-size: 1.2rem; color: var(--dark-color);">Chi tiết đơn hàng <span id="detail-order-id" style="color: var(--primary-color);"></span></h3>
                        <button id="btnCloseDetails" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--text-muted);">&times;</button>
                    </div>
                    <div style="line-height:1.8; font-size:0.95rem; margin-bottom:20px; color: var(--dark-color);">
                        <p><strong>Khách hàng:</strong> <span id="detail-customer-name"></span></p>
                        <p><strong>Số điện thoại:</strong> <span id="detail-customer-phone"></span></p>
                        <p><strong>Email:</strong> <span id="detail-customer-email"></span></p>
                        <p style="margin-top:10px; border-top:1px dashed var(--border); padding-top:10px;">
                            <strong>Sản phẩm:</strong> <span id="detail-product-name"></span></p>
                        <p><strong>Số lượng:</strong> <span id="detail-product-qty"></span></p>
                        <p><strong>Ngày tạo:</strong> <span id="detail-order-date"></span></p>
                        <p><strong>Trạng thái:</strong> <span id="detail-order-status"></span></p>
                        <h4 style="margin-top:20px; border-top:1px solid var(--border); padding-top:15px; text-align:right;">
                            Tổng tiền: <span id="detail-total-amount" style="color:var(--danger); font-size:1.2rem;"></span>
                        </h4>
                    </div>
                    <div class="form-actions" style="border:none; padding:0; margin:0;">
                        <button class="btn-cancel" id="btnCloseDetailsBtn">Đóng</button>
                    </div>
                </div>
            </div>

            <div id="createOrderModal" class="modal">
                <div class="modal-content">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:15px; margin-bottom:20px;">
                        <h3 style="margin:0; font-size: 1.2rem; color: var(--dark-color);">Tạo đơn hàng mới</h3>
                        <button id="btnCloseCreateOrder" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--text-muted);">&times;</button>
                    </div>
                    <form id="createOrderForm">
                        <div class="form-group">
                            <label>Khách hàng</label>
                            <select id="create-customer-select" required></select>
                        </div>
                        <div class="form-group">
                            <label>Sản phẩm</label>
                            <select id="create-product-select" required></select>
                        </div>
                        <div class="form-group">
                            <label>Số lượng</label>
                            <input type="number" id="create-amount-input" min="1" value="1" required>
                        </div>
                        <div style="text-align:right; font-size:1.1rem; font-weight:bold; margin-bottom:10px; color: var(--dark-color);">
                            Tổng tiền tạm tính: <span id="create-total-preview" style="color:var(--danger);">0đ</span>
                        </div>
                        <div class="form-actions" style="margin-top:10px;">
                            <button type="button" class="btn-cancel" id="btnCancelCreateOrder">Hủy</button>
                            <button type="submit" class="btn-save"><i class="fas fa-save"></i> Lưu đơn hàng</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    async init() {
        this.orders = []; this.customers = []; this.products = [];
        this.activeTab = 'all'; this.searchQuery = ''; this.dateFilter = '';
        this.selectedOrderDetail = null;

        window.OrdersView = this;

        document.querySelectorAll('.tabs .tab').forEach((tab, i) => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeTab = ['all', 'pending', 'shipping', 'completed'][i] || 'all';
                this.filterAndRender();
            });
        });

        document.getElementById('orderSearchInput')?.addEventListener('input', e => {
            this.searchQuery = e.target.value;
            this.filterAndRender();
        });

        document.getElementById('orderDateFilter')?.addEventListener('change', e => {
            this.dateFilter = e.target.value;
            this.filterAndRender();
        });

        document.getElementById('btnOpenCreateOrder')?.addEventListener('click', () => this.openCreateModal());
        document.getElementById('btnCloseCreateOrder')?.addEventListener('click', () => this.closeCreateModal());
        document.getElementById('btnCancelCreateOrder')?.addEventListener('click', () => this.closeCreateModal());
        document.getElementById('createOrderForm')?.addEventListener('submit', e => this.handleCreateOrder(e));

        document.getElementById('create-product-select')?.addEventListener('change', () => this.updateCreateTotal());
        document.getElementById('create-amount-input')?.addEventListener('input', () => this.updateCreateTotal());

        document.getElementById('btnCloseDetails')?.addEventListener('click', () => this.closeDetailsModal());
        document.getElementById('btnCloseDetailsBtn')?.addEventListener('click', () => this.closeDetailsModal());

        await this.loadInitialData();
    },

    async loadInitialData() {
        try {
            const [orders, customers, products] = await Promise.all([
                orderService.getAll(),
                customerService.getAll(),
                productService.getAll()
            ]);
            this.orders = orders || [];
            this.customers = customers || [];
            this.products = products || [];

            this._renderStats();
            this.filterAndRender();
        } catch (e) {
            console.error('Lỗi tải đơn hàng:', e);
            const tbody = document.getElementById('orderTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr><td colspan="6" class="empty-state" style="color:var(--danger);">
                        <i class="fas fa-exclamation-triangle"></i> Không thể tải dữ liệu đơn hàng!
                    </td></tr>`;
            }
        }
    },

    _renderStats() {
        const totalEl = document.getElementById('statTotalOrders');
        const pendingEl = document.getElementById('statPendingOrders');
        const completedEl = document.getElementById('statCompletedOrders');
        const cancelledEl = document.getElementById('statCancelledOrders');

        if (!totalEl || !pendingEl || !completedEl || !cancelledEl) return;

        totalEl.textContent = this.orders.length;
        pendingEl.textContent = this.orders.filter(o => ['pending', 'delivering'].includes(o.status)).length;
        completedEl.textContent = this.orders.filter(o => o.status === 'done').length;
        cancelledEl.textContent = this.orders.filter(o => o.status === 'cancel').length;
    },

    filterAndRender() {
        const tbody = document.getElementById('orderTableBody');
        if (!tbody) return;

        let list = [...this.orders];

        if (this.activeTab === 'pending') list = list.filter(o => o.status === 'pending');
        if (this.activeTab === 'shipping') list = list.filter(o => o.status === 'delivering');
        if (this.activeTab === 'completed') list = list.filter(o => o.status === 'done');

        if (this.searchQuery) {
            const q = removeVietnameseTones(this.searchQuery.trim());
            list = list.filter(o => {
                const idMatch = String(o.id).includes(q) || `ord-${o.id}`.includes(q) || `#ord-${o.id}`.includes(q);
                const nameMatch = o.customer?.name ? removeVietnameseTones(o.customer.name).includes(q) : false;
                const phoneMatch = o.customer?.phone ? o.customer.phone.includes(q) : false;
                return idMatch || nameMatch || phoneMatch;
            });
        }

        if (this.dateFilter) {
            list = list.filter(o => normalizeDate(o.date) === this.dateFilter);
        }

        list.sort((a, b) => b.id - a.id);

        tbody.innerHTML = '';
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Không tìm thấy đơn hàng nào</td></tr>`;
            return;
        }

        list.forEach(order => {
            const custName = order.customer?.name ?? 'N/A';
            const custPhone = order.customer?.phone ?? 'N/A';
            const prodName = order.product?.name ?? 'N/A';
            const total = (order.product?.price ?? 0) * order.amount;

            let actions = `
                <button class="btn-icon" onclick="OrdersView.viewOrderDetails(${order.id})" title="Xem chi tiết"><i class="fas fa-eye"></i></button>
            `;
            if (order.status === 'pending') {
                actions += `
                    <button class="btn-icon" onclick="OrdersView.updateOrderStatus(${order.id},'delivering')" style="color:var(--info);" title="Giao hàng"><i class="fas fa-truck"></i></button>
                    <button class="btn-icon" onclick="OrdersView.cancelOrder(${order.id})" style="color:var(--danger);" title="Hủy đơn"><i class="fas fa-times"></i></button>
                `;
            } else if (order.status === 'delivering') {
                actions += `
                    <button class="btn-icon" onclick="OrdersView.updateOrderStatus(${order.id},'done')" style="color:var(--success);" title="Hoàn thành"><i class="fas fa-check"></i></button>
                    <button class="btn-icon" onclick="OrdersView.cancelOrder(${order.id})" style="color:var(--danger);" title="Hủy đơn"><i class="fas fa-times"></i></button>
                `;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#ORD-${order.id}</strong></td>
                <td>${custName}<br><small>${custPhone}</small></td>
                <td>${prodName} (x${order.amount})</td>
                <td style="font-weight: 500;">${formatCurrency(total)}</td>
                <td><span class="${STATUS_BADGE[order.status] || 'badge'}">${STATUS_TEXT[order.status] || order.status}</span></td>
                <td>${actions}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    async updateOrderStatus(orderId, newStatus) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        if (newStatus === 'delivering') {
            const prod = this.products.find(p => String(p.id) === String(order.product?.id));
            const stock = prod ? (prod.remaining ?? prod.stock ?? 0) : 0;
            if (prod && stock < (order.amount || 1)) {
                alert(`Không đủ hàng! "${prod.name}" còn ${stock} sản phẩm.`);
                return;
            }
        }

        try {
            await orderService.update(orderId, {
                productId: order.product?.id ?? 1,
                customerId: order.customer?.id ?? 1,
                amount: order.amount || 1,
                status: newStatus
            });
            await this.loadInitialData(); // Load lại data từ cache/API
        } catch (e) {
            alert('Lỗi cập nhật: ' + (e.response?.data?.message || e.message));
        }
    },

    async cancelOrder(id) {
        if (!confirm(`Bạn có chắc chắn muốn hủy đơn hàng #${id}?`)) return;
        await this.updateOrderStatus(id, 'cancel');
    },

    viewOrderDetails(id) {
        const order = this.orders.find(o => o.id === id);
        if (!order) return;
        this.selectedOrderDetail = order;

        const price = order.product?.price ?? 0;
        const total = price * order.amount;
        const dateStr = order.date ? new Date(normalizeDate(order.date)).toLocaleDateString('vi-VN') : 'N/A';

        document.getElementById('detail-order-id').textContent = '#ORD-' + order.id;
        document.getElementById('detail-customer-name').textContent = order.customer?.name ?? 'N/A';
        document.getElementById('detail-customer-phone').textContent = order.customer?.phone ?? 'N/A';
        document.getElementById('detail-customer-email').textContent = order.customer?.email ?? 'N/A';
        document.getElementById('detail-product-name').textContent = order.product?.name ?? 'N/A';
        document.getElementById('detail-product-qty').textContent = order.amount;
        document.getElementById('detail-order-date').textContent = dateStr;

        const statusSpan = document.getElementById('detail-order-status');
        statusSpan.textContent = STATUS_TEXT[order.status] || order.status;
        statusSpan.className = STATUS_BADGE[order.status] || 'badge';
        document.getElementById('detail-total-amount').textContent = formatCurrency(total);

        document.getElementById('detailsModal').style.display = 'flex';
    },

    closeDetailsModal() {
        document.getElementById('detailsModal').style.display = 'none';
        this.selectedOrderDetail = null;
    },

    openCreateModal() {
        const custSel = document.getElementById('create-customer-select');
        const prodSel = document.getElementById('create-product-select');
        if (!custSel || !prodSel) return;

        custSel.innerHTML = '<option value="">-- Chọn khách hàng --</option>';
        this.customers.forEach(c => {
            custSel.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.name} (${c.phone})</option>`);
        });

        prodSel.innerHTML = '<option value="">-- Chọn sản phẩm --</option>';
        this.products.forEach(p => {
            prodSel.insertAdjacentHTML('beforeend', `<option value="${p.id}">${p.name} - ${formatCurrency(p.price)}</option>`);
        });

        document.getElementById('create-amount-input').value = '1';
        document.getElementById('create-total-preview').textContent = '0đ';
        document.getElementById('createOrderModal').style.display = 'flex';
    },

    closeCreateModal() {
        document.getElementById('createOrderModal').style.display = 'none';
    },

    updateCreateTotal() {
        const prodId = document.getElementById('create-product-select').value;
        const qty = parseInt(document.getElementById('create-amount-input').value);
        const prod = this.products.find(p => String(p.id) === String(prodId));

        document.getElementById('create-total-preview').textContent =
            (prod && !isNaN(qty) && qty > 0) ? formatCurrency(prod.price * qty) : '0đ';
    },

    async handleCreateOrder(e) {
        e.preventDefault();
        const custId = document.getElementById('create-customer-select').value;
        const prodId = document.getElementById('create-product-select').value;
        const amount = parseInt(document.getElementById('create-amount-input').value);

        if (!custId || !prodId || isNaN(amount) || amount <= 0) {
            alert('Vui lòng điền đầy đủ thông tin hợp lệ');
            return;
        }

        const prod = this.products.find(p => String(p.id) === String(prodId));
        const stock = prod ? (prod.remaining ?? prod.stock ?? 0) : 0;
        if (prod && stock < amount) {
            alert(`Không đủ hàng! "${prod.name}" còn ${stock} sản phẩm.`);
            return;
        }

        try {
            const btnSubmit = e.target.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

            await orderService.create({ productId: Number(prodId), customerId: Number(custId), amount, status: 'pending' });

            this.closeCreateModal();
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fas fa-save"></i> Lưu đơn hàng';

            await this.loadInitialData(); // Load lại data từ cache bị xóa sau khi create
        } catch (err) {
            alert('Không thể tạo đơn hàng: ' + (err.response?.data?.message || err.message));
        }
    }
};

export default OrdersView;
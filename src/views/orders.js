import orderService from '../services/orderService.js';
import productService from '../services/productService.js';
import { getAllCustomers } from '../api/customer-api.js';
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
                    <input type="text" id="orderSearchInput" placeholder="Tìm mã đơn, tên khách hàng...">
                </div>
                <button class="btn-export"><i class="fas fa-download"></i> Xuất Excel</button>
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
                    <div>
                        <input type="date" id="orderDateFilter" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px; outline:none;">
                    </div>
                </div>
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr><th>Mã đơn</th><th>Khách hàng</th><th>Sản phẩm</th><th>Tổng tiền</th><th>Trạng thái</th><th>Thao tác</th></tr>
                        </thead>
                        <tbody id="orderTableBody">
                            <tr><td colspan="6" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>
                        </tbody>
                    </table>
                </div>
            </section>
        `;
    },

    async init() {
        this.orders = []; this.customers = []; this.products = [];
        this.activeTab = 'all'; this.searchQuery = ''; this.dateFilter = '';
        this.selectedOrderDetail = null;

        window.OrdersView = this;

        // Tab filters
        document.querySelectorAll('.tabs .tab').forEach((tab, i) => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeTab = ['all', 'pending', 'shipping', 'completed'][i] || 'all';
                this.filterAndRender();
            });
        });

        // Search & Date filters
        document.getElementById('orderSearchInput')?.addEventListener('input', e => {
            this.searchQuery = e.target.value;
            this.filterAndRender();
        });

        document.getElementById('orderDateFilter')?.addEventListener('change', e => {
            this.dateFilter = e.target.value;
            this.filterAndRender();
        });

        // Create modal events
        document.getElementById('btnOpenCreateOrder')?.addEventListener('click', () => this.openCreateModal());
        document.getElementById('btnCloseCreateOrder')?.addEventListener('click', () => this.closeCreateModal());
        document.getElementById('btnCancelCreateOrder')?.addEventListener('click', () => this.closeCreateModal());
        document.getElementById('createOrderForm')?.addEventListener('submit', e => this.handleCreateOrder(e));

        document.getElementById('create-product-select')?.addEventListener('change', () => this.updateCreateTotal());
        document.getElementById('create-amount-input')?.addEventListener('input', () => this.updateCreateTotal());

        // Details modal events
        document.getElementById('btnCloseDetails')?.addEventListener('click', () => this.closeDetailsModal());
        document.getElementById('btnCloseDetailsBtn')?.addEventListener('click', () => this.closeDetailsModal());

        await this.loadInitialData();
    },

    async loadInitialData() {
        try {
            const [orders, customers, products] = await Promise.all([
                orderService.getAll(),
                getAllCustomers(),
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
                    <tr><td colspan="6" style="text-align:center;padding:30px;color:var(--danger);font-weight:bold;">
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
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#999;padding:25px;">Không tìm thấy đơn hàng nào</td></tr>`;
            return;
        }

        list.forEach(order => {
            const custName = order.customer?.name ?? 'N/A';
            const custPhone = order.customer?.phone ?? 'N/A';
            const prodName = order.product?.name ?? 'N/A';
            const total = (order.product?.price ?? 0) * order.amount;

            let actions = `
                <button class="btn-action" onclick="OrdersView.viewOrderDetails(${order.id})" title="Xem chi tiết"><i class="fas fa-eye"></i></button>
            `;
            if (order.status === 'pending') {
                actions += `
                    <button class="btn-action" onclick="OrdersView.updateOrderStatus(${order.id},'delivering')" style="color:var(--primary-color);" title="Giao hàng"><i class="fas fa-truck"></i></button>
                    <button class="btn-action" onclick="OrdersView.cancelOrder(${order.id})" style="color:var(--danger);" title="Hủy đơn"><i class="fas fa-times"></i></button>
                `;
            } else if (order.status === 'delivering') {
                actions += `
                    <button class="btn-action" onclick="OrdersView.updateOrderStatus(${order.id},'done')" style="color:var(--success);" title="Hoàn thành"><i class="fas fa-check"></i></button>
                    <button class="btn-action" onclick="OrdersView.cancelOrder(${order.id})" style="color:var(--danger);" title="Hủy đơn"><i class="fas fa-times"></i></button>
                `;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#ORD-${order.id}</strong></td>
                <td>${custName}<br><small style="color:#7f8c8d;">${custPhone}</small></td>
                <td>${prodName} (x${order.amount})</td>
                <td>${formatCurrency(total)}</td>
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
            const prod = this.products.find(p => p.id === order.product?.id);
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
            alert(`Đã cập nhật đơn hàng #${orderId}!`);
            await this.loadInitialData();
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
        const prodId = parseInt(document.getElementById('create-product-select').value);
        const qty = parseInt(document.getElementById('create-amount-input').value);
        const prod = this.products.find(p => p.id === prodId);

        document.getElementById('create-total-preview').textContent =
            (prod && !isNaN(qty) && qty > 0) ? formatCurrency(prod.price * qty) : '0đ';
    },

    async handleCreateOrder(e) {
        e.preventDefault();
        const custId = parseInt(document.getElementById('create-customer-select').value);
        const prodId = parseInt(document.getElementById('create-product-select').value);
        const amount = parseInt(document.getElementById('create-amount-input').value);

        if (isNaN(custId) || isNaN(prodId) || isNaN(amount) || amount <= 0) {
            alert('Vui lòng điền đầy đủ thông tin hợp lệ');
            return;
        }

        const prod = this.products.find(p => p.id === prodId);
        const stock = prod ? (prod.remaining ?? prod.stock ?? 0) : 0;
        if (prod && stock < amount) {
            alert(`Không đủ hàng! "${prod.name}" còn ${stock} sản phẩm.`);
            return;
        }

        try {
            await orderService.create({ productId: prodId, customerId: custId, amount, status: 'pending' });
            this.closeCreateModal();
            alert('Tạo đơn hàng thành công!');
            await this.loadInitialData();
        } catch (err) {
            alert('Không thể tạo đơn hàng: ' + (err.response?.data?.message || err.message));
        }
    }
};

export default OrdersView;

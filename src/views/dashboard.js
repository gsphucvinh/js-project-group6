import orderService from '../services/orderService.js';
import productService from '../services/productService.js';
import { getAllCustomers } from '../api/customer-api.js';
import { formatCurrency, normalizeDate } from '../utils/helpers.js';

const DashboardView = {
    render() {
        return `
            <header>
                <button class="menu-btn" id="menuToggle"><i class="fas fa-bars"></i></button>
                <div class="user"><strong>Admin</strong> <i class="fas fa-user-circle"></i></div>
            </header>

            <section class="stats" id="dashboard-stats">
                <div class="card" style="border-left-color: #3498db;">
                    <h3>Doanh thu</h3>
                    <p style="color: #3498db;">...</p>
                </div>
                <div class="card" style="border-left-color: #2ecc71;">
                    <h3>Đơn hàng mới</h3>
                    <p style="color: #2ecc71;">...</p>
                </div>
                <div class="card" style="border-left-color: #e74c3c;">
                    <h3>Hết hàng</h3>
                    <p style="color: #e74c3c;">...</p>
                </div>
            </section>

            <section class="table-section">
                <div class="table-title">
                    <h3>Đơn hàng gần đây</h3>
                </div>
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                <th>Khách hàng</th>
                                <th>Sản phẩm</th>
                                <th>Ngày đặt hàng</th>
                                <th>Trạng thái</th>
                                <th>Tổng tiền</th>
                            </tr>
                        </thead>
                        <tbody id="dashboardTbody">
                            <tr>
                                <td colspan="6" style="text-align:center; padding:30px; color:#999;">
                                    <i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i> Đang tải dữ liệu...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        `;
    },

    async init() {
        try {
            const [orders, , products] = await Promise.all([
                orderService.getAll(),
                getAllCustomers(),
                productService.getAll(),
            ]);

            this._renderStats(orders, products);
            this._renderTable(orders);
        } catch (err) {
            console.error('Lỗi khi tải dữ liệu dashboard:', err);
            this._renderError();
        }
    },

    _renderStats(orders, products) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        // Doanh thu, đơn hàng mới trong ngày, hết hàng
        const doneOrders = orders.filter(o => o.status === 'done');
        const totalRevenue = doneOrders.reduce((sum, o) => {
            return sum + (o.product ? o.product.price * (o.amount || 1) : 0);
        }, 0);

        const newOrdersCount = orders.filter(o => normalizeDate(o.date) === todayStr).length;
        const outOfStock = products.filter(p => (p.remaining ?? p.stock ?? 0) <= 0).length;

        const pEls = document.querySelectorAll('#dashboard-stats .card p');
        if (pEls.length >= 3) {
            pEls[0].textContent = formatCurrency(totalRevenue);
            pEls[1].textContent = newOrdersCount;
            pEls[2].textContent = outOfStock;
        }
    },

    _renderTable(orders) {
        const tbody = document.getElementById('dashboardTbody');
        if (!tbody) return;

        const STATUS_TEXT = {
            pending: 'Chờ xử lý', approved: 'Đã duyệt',
            delivering: 'Đang giao', done: 'Hoàn thành', cancel: 'Đã hủy'
        };

        const STATUS_STYLE = {
            pending:    { bg: '#fff3cd', color: '#856404' },
            approved:   { bg: '#e0f2f1', color: '#00796b' },
            delivering: { bg: '#cce5ff', color: '#004085' },
            done:       { bg: '#d4edda', color: '#155724' },
            cancel:     { bg: '#f8d7da', color: '#721c24' }
        };

        const recent = [...orders].sort((a, b) => b.id - a.id).slice(0, 10);
        tbody.innerHTML = '';

        if (recent.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#999;">Chưa có đơn hàng nào</td></tr>`;
            return;
        }

        recent.forEach(order => {
            const custName  = order.customer?.name ?? 'N/A';
            const prodName  = order.product?.name  ?? 'N/A';
            const prodPrice = order.product?.price ?? 0;
            const total     = prodPrice * (order.amount || 1);
            const dateStr   = order.date ? new Date(normalizeDate(order.date)).toLocaleDateString('vi-VN') : '—';
            const sText     = STATUS_TEXT[order.status]  || order.status;
            const sStyle    = STATUS_STYLE[order.status] || { bg: '#eee', color: '#333' };

            const tr = document.createElement('tr');
            tr.addEventListener('mouseenter', () => tr.style.background = '#f8f9fa');
            tr.addEventListener('mouseleave', () => tr.style.background = '');

            tr.innerHTML = `
                <td><strong>#ORD-${order.id}</strong></td>
                <td>${custName}</td>
                <td style="color:#555;">${prodName} ×${order.amount || 1}</td>
                <td>${dateStr}</td>
                <td><span class="status" style="background:${sStyle.bg};color:${sStyle.color};">${sText}</span></td>
                <td><strong>${formatCurrency(total)}</strong></td>
            `;
            tbody.appendChild(tr);
        });
    },

    _renderError() {
        document.querySelectorAll('#dashboard-stats .card p').forEach(p => {
            p.textContent = 'Lỗi';
            p.style.color = '#e74c3c';
        });

        const tbody = document.getElementById('dashboardTbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;padding:30px;color:#e74c3c;font-weight:bold;">
                        <i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i>
                        Không thể tải dữ liệu. Vui lòng kiểm tra kết nối mạng!
                    </td>
                </tr>`;
        }
    }
};

export default DashboardView;

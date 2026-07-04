// src/views/dashboard.js
import orderService from '../services/orderService.js';
import productService from '../services/productService.js';
import { formatCurrency, normalizeDate } from '../utils/helpers.js';

const DashboardView = {
    render() {
        return `
            <header>
                <div style="font-size: 1.2rem; font-weight: 600;">Tổng quan ứng dụng</div>
                <div class="user"><strong>Admin</strong> <i class="fas fa-user-circle"></i></div>
            </header>

            <section class="stats" id="dashboard-stats">
                <div class="card blue">
                    <h3>Doanh thu</h3>
                    <p style="color: #3498db;">...</p>
                </div>
                <div class="card green">
                    <h3>Đơn hàng mới</h3>
                    <p style="color: #2ecc71;">...</p>
                </div>
                <div class="card red">
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
                                <td colspan="6" style="text-align:center; padding:40px; color:var(--text-muted);">
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
            // TỐI ƯU LUỒNG: Bỏ API Customers dư thừa. Gắn catch() độc lập cho từng Promise
            // Nếu API nào sập, nó tự trả về mảng rỗng [] để các thành phần khác vẫn render bình thường
            const [orders, products] = await Promise.all([
                orderService.getAll().catch(err => {
                    console.warn("Cảnh báo: Không thể tải Orders", err);
                    return [];
                }),
                productService.getAll().catch(err => {
                    console.warn("Cảnh báo: Không thể tải Products", err);
                    return [];
                })
            ]);

            if (document.getElementById('dashboard-stats')) {
                this._renderStats(orders, products);
                this._renderTable(orders);
            }
        } catch (err) {
            console.error('Lỗi nghiêm trọng khi khởi tạo dashboard:', err);
            this._renderError();
        }
    },

    _renderStats(orders, products) {
        const doneOrders = orders.filter(o => o.status === 'done');
        const totalRevenue = doneOrders.reduce((sum, o) => {
            return sum + (o.product ? o.product.price * (o.amount || 1) : 0);
        }, 0);

        const newOrdersCount = orders.filter(o => o.status === 'pending').length;
        const outOfStock = products.filter(p => (p.remaining ?? 0) <= 0).length;

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

        const recent = [...orders].sort((a, b) => b.id - a.id).slice(0, 10);
        tbody.innerHTML = '';

        if (recent.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Chưa có đơn hàng nào</td></tr>`;
            return;
        }

        recent.forEach(order => {
            const custName  = order.customer?.name ?? 'Khách lẻ';
            const prodName  = order.product?.name  ?? 'Sản phẩm đã xóa';
            const prodPrice = order.product?.price ?? 0;
            const total     = prodPrice * (order.amount || 1);
            const dateStr   = order.date ? new Date(normalizeDate(order.date)).toLocaleDateString('vi-VN') : '—';
            const sText     = STATUS_TEXT[order.status]  || order.status;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#ORD-${order.id}</strong></td>
                <td>${custName}</td>
                <td style="color:var(--text-muted);">${prodName} ×${order.amount || 1}</td>
                <td>${dateStr}</td>
                <td><span class="status ${order.status}">${sText}</span></td>
                <td style="font-weight: 500;">${formatCurrency(total)}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    _renderError() {
        document.querySelectorAll('#dashboard-stats .card p').forEach(p => {
            p.textContent = 'Lỗi mạng';
            p.style.color = 'var(--danger)';
            p.style.fontSize = '1.2rem';
        });
        const tbody = document.getElementById('dashboardTbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="empty-state error-text">Không thể kết nối đến máy chủ. Vui lòng thử lại!</td></tr>`;
        }
    }
};

export default DashboardView;
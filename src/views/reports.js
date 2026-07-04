import {getOrder} from "../services/reportService.js";
import Chart from "chart.js/auto";
import productService from "../services/productService.js";
import orderService from "../services/orderService.js";

const render = () => {
    return `
     <header>
      <h2>Báo cáo kinh doanh</h2>
      <div class="filter-group">
        <input type="date" value="2026-01-01">
        <input type="date" value="2026-01-24">
        <button style="padding: 8px 15px; background: var(--primary-color); color: white; border: none; border-radius: 5px; cursor: pointer;">Lọc</button>
      </div>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <h4>Doanh thu</h4>
        <div class="value"  id="total-revenue">0đ</div>
        <div class="trend up"><i class="fas fa-arrow-up"></i> 12% so với tháng trước</div>
      </div>
      <div class="stat-card">
        <h4>Đơn hàng</h4>
        <div class="value"  id="total-orders">0đ</div>
        <div class="trend up"><i class="fas fa-arrow-up"></i> 5%</div>
      </div>
      <div class="stat-card">
        <h4>Lợi nhuận</h4>
        <div class="value" id="total-profit">120.000.000đ</div>
        <div class="trend down"><i class="fas fa-arrow-down"></i> 2%</div>
      </div>
      <div class="stat-card">
        <h4>Khách mới</h4>
        <div class="value" id="total-customers">0</div>
        <div class="trend up"><i class="fas fa-arrow-up"></i> 18%</div>
      </div>
    </div>

    <div class="charts-container">
      <div class="chart-box">
        <h3>Biểu đồ doanh thu 7 ngày gần nhất</h3>
        <canvas id="revenueChart"></canvas>
      </div>
      <div class="chart-box">
        <h3>Cơ cấu sản phẩm</h3>
        <canvas id="categoryChart"></canvas>
      </div>
    </div>

    <div class="top-products">
      <h3>Sản phẩm bán chạy nhất</h3>
      <table>
        <thead>
        <tr>
          <th>Sản phẩm</th>
          <th>Số lượng bán</th>
          <th>Doanh thu</th>
          <th>Tình trạng</th>
        </tr>
        </thead>
        <tbody id="top-products-body">
        <tr>
          <td>iPhone 15 Pro Max</td>
          <td>45</td>
          <td>1.450.000.000đ</td>
          <td><span style="color: var(--success)">Còn hàng</span></td>
        </tr>
        <tr>
          <td>AirPods Pro 2</td>
          <td>120</td>
          <td>660.000.000đ</td>
          <td><span style="color: var(--danger)">Sắp hết</span></td>
        </tr>
        </tbody>
      </table>
    </div>
    `;
};

const init = async () => {
    try {
        const [orders, products] = await Promise.all([
            orderService.getAll().catch(err => {
                console.warn("Báo cáo - Lỗi tải Orders:", err);
                return [];
            }),
            productService.getAll().catch(err => {
                console.warn("Báo cáo - Lỗi tải Products:", err);
                return [];
            })
        ]);
        const revenue = orders.reduce((sum, order) => {
            return sum + order.amount * order.product.price;
        }, 0);
        const totalOrders = orders.length;
        const customers = new Set(
            orders.map(order => order.customer.id)
        );
        const totalCustomers = customers.size;
        const profit = 0;
        const revEl = document.getElementById("total-revenue");
        if(revEl) revEl.textContent = revenue.toLocaleString("vi-VN") + "đ";

        document.getElementById("total-orders").textContent =
            totalOrders;

        document.getElementById("total-customers").textContent =
            totalCustomers;

        document.getElementById("total-profit").textContent =
            profit.toLocaleString("vi-VN") + "đ";
        const productMap = {};

        orders.forEach((order) => {
            const id = order.product.id;

            if (!productMap[id]) {
                productMap[id] = {
                    name: order.product.name,
                    quantity: 0,
                    revenue: 0,
                    stock: order.product.remaining
                };
            }

            productMap[id].quantity += order.amount;
            productMap[id].revenue += order.amount * order.product.price;
        });


        // top product
        const topProducts = Object.values(productMap);

        topProducts.sort((a, b) => b.quantity - a.quantity);

        const tbody = document.getElementById("top-products-body");
        tbody.innerHTML = topProducts
            .slice(0, 3)
            .map(product => `
        <tr>
  
            <td>${product.name}</td>
            <td>${product.quantity}</td>
            <td>${product.revenue.toLocaleString("vi-VN")}đ</td>
            <td>
                <span class="${

                product.stock > 10 ? "success" : "danger"
            }">
                    ${
                product.stock > 10
                    ? "Còn hàng"
                    : "Sắp hết"
            }
                </span>
            </td>
        </tr>
    `)
            .join("");

        // revenue chart
        const revenueByDate = {};
        orders.forEach(order => {

            const date = order.date;

            const revenue =
                order.amount *
                order.product.price;

            revenueByDate[date] =
                (revenueByDate[date] || 0)
                + revenue;

        });

        const labels =
            Object.keys(revenueByDate)
                .sort();
        const values = labels.map((date) => revenueByDate[date]);
        new Chart(

            document
                .getElementById("revenueChart"),

            {

                type:"line",

                data:{

                    labels,

                    datasets:[{

                        label:"Doanh thu",

                        data:values,

                        borderColor:"#3498db",

                        backgroundColor:
                            "rgba(52,152,219,.15)",

                        fill:true,

                        tension:.4

                    }]
                }

            }

        );

        // Doughnut Chart
        const categoryMap = {};

        products.forEach((product) => {

            const categoryName = product.category.name;

            categoryMap[categoryName] =
                (categoryMap[categoryName] || 0) + 1;

        });

        const categoryLabels = Object.keys(categoryMap);

        const categoryValues = Object.values(categoryMap);

        new Chart(
            document.getElementById("categoryChart"),
            {
                type: "doughnut",

                data: {
                    labels: categoryLabels,

                    datasets: [
                        {
                            data: categoryValues,

                            backgroundColor: [
                                "#3498db",
                                "#2ecc71",
                                "#f1c40f",
                                "#9b59b6",
                                "#e74c3c",
                                "#1abc9c",
                                "#34495e"
                            ]
                        }
                    ]
                },

                options: {
                    responsive: true,

                    plugins: {
                        legend: {
                            position: "bottom"
                        }
                    }
                }
            }
        );
    } catch (error) {
        console.log(error);
    }


};


export default {
    render,
    init
};
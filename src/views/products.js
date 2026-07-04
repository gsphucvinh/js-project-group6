// src/views/products.js
import productService from '../services/productService.js';
import api from '../services/api.js';

const API_URLS = { CATEGORIES: '/categories' };
let allProducts = [];
let uniqueCategories = [];

const extractCategories = (products) => {
    const catMap = new Map();
    products.forEach(p => {
        if (p.category && p.category.id && p.category.name) {
            catMap.set(p.category.id, p.category.name.trim());
        }
    });
    return Array.from(catMap, ([id, name]) => ({ id, name }));
};

const render = (data) => {
    if (data?.mode === 'add' || data?.mode === 'edit') {
        return `<div id="product-form-container">
                    <div style="padding:40px; text-align:center;"><i class="fas fa-spinner fa-spin fa-2x"></i> Đang tải biểu mẫu...</div>
                </div>`;
    }

    return `
        <header>
          <div class="search-bar"><input type="text" id="searchInput" placeholder="Tìm tên sản phẩm, mã SKU..."></div>
          <div class="user-actions"><a href="/products/add" data-navigo class="btn-add" style="display:inline-block; text-decoration:none;"><i class="fas fa-plus"></i> Thêm sản phẩm</a></div>
        </header>
        <section class="stats" id="statsArea"></section>
        <section class="table-container">
          <div class="table-header" style="display: flex; justify-content: space-between; align-items: center;">
            <h3>Danh mục sản phẩm</h3>
            <div class="filters">
                <select id="categoryFilter">
                    <option value="all">Tất cả danh mục</option>
                </select>
            </div>
          </div>
          
          <div class="table-wrapper">
              <table>
                <thead><tr><th>Hình</th><th>Thông tin sản phẩm</th><th>Danh mục</th><th>Giá bán</th><th>Tồn kho</th><th>Thao tác</th></tr></thead>
                <tbody id="productTableBody">
                    <tr><td colspan="6" class="empty-state" style="text-align: center; padding:40px;"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</td></tr>
                </tbody>
              </table>
          </div>
        </section>
    `;
};

const init = async (data) => {
    if (data?.mode === 'add') {
        const products = await productService.getAll();
        uniqueCategories = extractCategories(products);
        renderProductFormPage(null);
    } else if (data?.mode === 'edit') {
        try {
            const products = await productService.getAll();
            uniqueCategories = extractCategories(products);
            const productData = products.find(p => String(p.id) === String(data.id));
            if (productData) renderProductFormPage(productData);
        } catch (e) {
            const container = document.getElementById('product-form-container');
            if (container) container.innerHTML = '<div style="padding:40px;color:red;">Không tìm thấy sản phẩm!</div>';
        }
    } else {
        document.getElementById('searchInput')?.addEventListener('input', handleFilterAndSearch);
        document.getElementById('categoryFilter')?.addEventListener('change', handleFilterAndSearch);
        document.getElementById('productTableBody')?.addEventListener('click', handleTableClicks);

        try {
            const products = await productService.getAll();
            allProducts = products;
            uniqueCategories = extractCategories(products);
            renderProductTableData(products);
        } catch (e) {
            const tbody = document.getElementById('productTableBody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Lỗi tải dữ liệu.</td></tr>';
        }
    }
};

const renderProductTableData = (products) => {
    const tbody = document.getElementById('productTableBody');
    const statsArea = document.getElementById('statsArea');
    const categoryFilter = document.getElementById('categoryFilter');
    if (!tbody) return;

    if (statsArea) {
        // Cập nhật logic đếm số lượng sản phẩm có tồn kho dưới 10 (< 10)
        const lowStockCount = allProducts.filter(p => Number(p.remaining ?? 0) < 10).length;

        statsArea.innerHTML = `
            <div class="card"><h3>Tổng sản phẩm</h3><p>${allProducts.length}</p></div>
            <div class="card"><h3>Sắp hết hàng</h3><p style="color: #e74c3c;">${lowStockCount}</p></div>
            <div class="card"><h3>Danh mục</h3><p style="color: #2563eb;">${uniqueCategories.length}</p></div>
        `;
    }

    if (categoryFilter && categoryFilter.options.length <= 1) {
        categoryFilter.innerHTML = `<option value="all">Tất cả danh mục</option>` + uniqueCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    tbody.innerHTML = products.length === 0 ? `<tr><td colspan="6" style="text-align: center; padding: 20px;">Không tìm thấy sản phẩm nào.</td></tr>` : products.map(p => {
        const remainingNum = Number(p.remaining ?? 0);
        // Kiểm tra điều kiện tồn kho dưới 10 để áp dụng style đỏ kèm văn bản cảnh báo
        const isLowStock = remainingNum < 10;
        const stockStyle = isLowStock ? 'color: #e74c3c; font-weight: bold;' : '';
        const stockText = isLowStock ? `${remainingNum} <span style="font-size: 12px; font-weight: 600;">(Sắp hết)</span>` : remainingNum;

        return `
            <tr>
              <td><img src="${p.imageUrl || 'https://placehold.co/50x50?text=No+Image'}" style="width:50px; height:50px; object-fit:cover; border-radius:4px; border:1px solid #e5e7eb;"></td>
              <td><strong>${p.name}</strong><br><small style="color: #6b7280;">SKU: ${p.sku || 'N/A'}</small></td>
              <td><span style="background: #eff6ff; color: #2563eb; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${p.category?.name || 'Chưa phân loại'}</span></td>
              <td style="font-weight: 500;">${Number(p.price).toLocaleString('vi-VN')}đ</td>
              <td><span style="${stockStyle}">${stockText}</span></td>
              <td>
                <a href="/products/edit/${p.id}" data-navigo class="btn-icon edit" style="margin-right: 8px; color: #f59e0b;"><i class="fas fa-edit"></i></a>
                <button class="btn-icon delete" data-id="${p.id}" style="color: #ef4444; background: none; border: none; cursor: pointer;"><i class="fas fa-trash"></i></button>
              </td>
            </tr>
        `;
    }).join('');

    if(window.router) window.router.updatePageLinks();
};

const handleFilterAndSearch = () => {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const selectedCat = document.getElementById('categoryFilter')?.value || 'all';
    const filtered = allProducts.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchTerm) || (p.sku && p.sku.toLowerCase().includes(searchTerm));
        const matchCat = selectedCat === 'all' || p.category?.id.toString() === selectedCat;
        return matchSearch && matchCat;
    });
    renderProductTableData(filtered);
};

const handleTableClicks = async (e) => {
    const btnDelete = e.target.closest('.btn-icon.delete');
    if (btnDelete) {
        if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
            try {
                btnDelete.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                await productService.delete(btnDelete.dataset.id);
                alert('Đã xóa thành công!');
                const products = await productService.getAll(true);
                allProducts = products;
                uniqueCategories = extractCategories(products);
                handleFilterAndSearch();
            } catch (error) {
                alert('Xóa thất bại!');
                btnDelete.innerHTML = '<i class="fas fa-trash"></i>';
            }
        }
    }
};

const renderProductFormPage = (product = null) => {
    const container = document.getElementById('product-form-container');
    if (!container) return;
    const isEdit = !!product;
    const formVals = {
        name: product?.name || '', description: product?.description || '', price: product?.price || '',
        costPrice: product?.costPrice || '', remaining: product?.remaining || '', sku: product?.sku || '',
        categoryId: product?.category?.id || '', imageUrl: product?.imageUrl || ''
    };

    const categoryOptions = uniqueCategories.map(c => `<option value="${c.id}" ${String(formVals.categoryId) === String(c.id) ? 'selected' : ''}>${c.name}</option>`).join('');

    container.innerHTML = `
        <div class="header-actions" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <h2>${isEdit ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</h2>
          <a href="/products" data-navigo class="btn-back" style="padding: 8px 16px; background: #e2e8f0; border-radius: 6px; text-decoration: none; color: #333;"><i class="fas fa-arrow-left"></i> Quay lại</a>
        </div>
        <form id="productForm" data-mode="${isEdit ? 'edit' : 'add'}" data-id="${product?.id || ''}">
          <div class="product-grid">
            <div class="left-col">
              <div class="form-card">
                <h3>Thông tin chung</h3>
                <div class="form-group" style="margin-bottom:15px;">
                    <label>Tên sản phẩm</label>
                    <input type="text" id="fName" required value="${formVals.name}" placeholder="Ví dụ: iPhone 15 Pro Max">
                </div>
                <div class="form-group">
                    <label>Mô tả sản phẩm</label>
                    <textarea id="fDescription" rows="5" placeholder="Nhập đặc điểm nổi bật...">${formVals.description}</textarea>
                </div>
              </div>
              <div class="form-card">
                <h3>Giá cả & Kho hàng</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                  <div class="form-group"><label>Giá bán (VNĐ)</label><input type="number" id="fPrice" required value="${formVals.price}"></div>
                  <div class="form-group"><label>Giá vốn (VNĐ)</label><input type="number" id="fCostPrice" value="${formVals.costPrice}"></div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                  <div class="form-group"><label>Mã SKU</label><input type="text" id="fSku" value="${formVals.sku}"></div>
                  <div class="form-group"><label>Số lượng tồn kho</label><input type="number" id="fRemaining" required value="${formVals.remaining}"></div>
                </div>
              </div>
            </div>
            <div class="right-col">
              <div class="form-card">
                <h3>Hình ảnh sản phẩm</h3>
                <div class="image-upload" id="uploadArea">
                  <i class="fas fa-cloud-upload-alt"></i><p>Nhấp để tải ảnh lên</p>
                  <input type="file" id="fileInput" hidden accept="image/*">
                  <img id="imgPreview" class="preview-img" src="${formVals.imageUrl || '#'}" style="display: ${formVals.imageUrl ? 'block' : 'none'};">
                </div>
              </div>
              <div class="form-card">
                <h3>Phân loại</h3>
                <div class="form-group">
                  <label>Danh mục</label>
                  <div style="display: flex; gap: 8px;">
                    <select id="fCategoryId" required>
                      <option value="" disabled ${!formVals.categoryId ? 'selected' : ''}>Chọn danh mục...</option>
                      ${categoryOptions}
                    </select>
                    <button type="button" id="btnToggleNewCat" class="btn" style="padding: 0 12px; background: #e2e8f0; border-radius: 4px; cursor:pointer;"><i class="fas fa-plus"></i></button>
                  </div>
                </div>
                <div class="form-group" id="newCategoryArea" style="display: none; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px dashed #cbd5e1; margin-top: 10px;">
                    <div style="display: flex; gap: 6px; margin-top: 4px;">
                        <input type="text" id="fNewCategoryName" placeholder="Tên danh mục..." style="padding: 6px; flex: 1; border:1px solid #ccc; border-radius:4px;">
                        <button type="button" id="btnSaveQuickCategory" style="padding: 6px 12px; background: #2563eb; color: #fff; border: none; border-radius: 4px; cursor:pointer;">Tạo</button>
                    </div>
                </div>
              </div>
            </div>
          </div>
          <div class="form-footer">
            <a href="/products" data-navigo class="btn btn-cancel">Hủy bỏ</a>
            <button type="submit" class="btn btn-save" id="btnSubmitForm"><i class="fas fa-save"></i> Lưu sản phẩm</button>
          </div>
        </form>
    `;
    if(window.router) window.router.updatePageLinks();
    setupProductFormEvents();
};

const setupProductFormEvents = () => {
    const btnToggleNewCat = document.getElementById('btnToggleNewCat');
    const newCategoryArea = document.getElementById('newCategoryArea');
    const btnSaveQuickCategory = document.getElementById('btnSaveQuickCategory');
    const fNewCategoryName = document.getElementById('fNewCategoryName');
    const fCategoryId = document.getElementById('fCategoryId');

    btnToggleNewCat?.addEventListener('click', () => {
        newCategoryArea.style.display = newCategoryArea.style.display === 'none' ? 'block' : 'none';
        if (newCategoryArea.style.display === 'block') fNewCategoryName.focus();
    });

    btnSaveQuickCategory?.addEventListener('click', async () => {
        const catName = fNewCategoryName.value.trim();
        if (!catName) return alert('Vui lòng nhập tên danh mục!');

        const isDuplicate = uniqueCategories.some(
            c => c.name.toLowerCase().replace(/\s+/g, '') === catName.toLowerCase().replace(/\s+/g, '')
        );

        if (isDuplicate) {
            alert('Danh mục này đã tồn tại trong hệ thống!');
            fNewCategoryName.focus();
            return;
        }

        try {
            btnSaveQuickCategory.disabled = true; btnSaveQuickCategory.innerText = '...';
            const response = await api.post(API_URLS.CATEGORIES, { name: catName });
            const createdCategory = response.data?.data || response.data || { id: Date.now(), name: catName };

            uniqueCategories.push(createdCategory);
            const newOpt = document.createElement('option');
            newOpt.value = createdCategory.id; newOpt.textContent = createdCategory.name; newOpt.selected = true;
            fCategoryId.appendChild(newOpt);

            fNewCategoryName.value = ''; newCategoryArea.style.display = 'none';
        } catch (err) {
            alert('Lỗi khi tạo danh mục mới.');
        } finally {
            btnSaveQuickCategory.disabled = false; btnSaveQuickCategory.innerText = 'Tạo';
        }
    });

    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const imgPreview = document.getElementById('imgPreview');

    uploadArea?.addEventListener('click', () => fileInput.click());
    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => { imgPreview.src = event.target.result; imgPreview.style.display = 'block'; }
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('productForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const mode = e.target.dataset.mode; const id = e.target.dataset.id;
        const btnSubmit = document.getElementById('btnSubmitForm');
        btnSubmit.disabled = true; btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';

        const payload = {
            categoryId: Number(document.getElementById('fCategoryId').value),
            imageId: "", name: document.getElementById('fName').value,
            sku: document.getElementById('fSku').value || "", price: Number(document.getElementById('fPrice').value),
            remaining: Number(document.getElementById('fRemaining').value)
        };

        try {
            if (mode === 'edit') await productService.update(id, payload);
            else await productService.create(payload);

            window.router.navigate('/products');
        } catch (error) {
            alert('Lỗi lưu dữ liệu!');
            btnSubmit.disabled = false; btnSubmit.innerHTML = `<i class="fas fa-save"></i> Thử lại`;
        }
    });
};

export default { render, init };
// src/utils/helpers.js

// Format tiền tệ Việt Nam
export const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);
};

// Chuẩn hóa ngày tháng (YYYY-MM-DD)
export const normalizeDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Loại bỏ dấu tiếng Việt (Có thể gộp validators.js vào đây luôn cho gọn)
export const removeVietnameseTones = (str) => {
    if (!str) return '';
    let result = str.toLowerCase();
    result = result.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
    result = result.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
    result = result.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
    result = result.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
    result = result.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
    result = result.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
    result = result.replace(/đ/g, 'd');
    result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return result;
};
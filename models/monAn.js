// models/monAn.js
const mongoose = require('mongoose');

const monAnSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'Tên món ăn là bắt buộc'], trim: true },
    price: { type: Number, required: [true, 'Giá tiền là bắt buộc'], min: [0, 'Giá tiền không thể âm'] },
    image: { type: String, required: [true, 'URL hình ảnh là bắt buộc'] },
    category: { type: String, required: [true, 'Danh mục là bắt buộc'], trim: true }
}, { timestamps: true });

module.exports = mongoose.model('MonAn', monAnSchema);
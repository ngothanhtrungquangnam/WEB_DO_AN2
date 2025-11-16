// File: models/ban.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const banSchema = new Schema({
    soBan: {
        type: String,
        required: true,
        unique: true,
        trim: true
        // Ví dụ: "Bàn 1", "Bàn 2"
    },
    trangThai: {
        type: String,
        required: true,
        enum: ['Trống', 'Đang phục vụ'], // Chỉ cho phép 1 trong 2 giá trị này
        default: 'Trống'
    },
    soKhach: {
        type: Number,
        default: 0
    },
    // Liên kết đến đơn hàng hiện tại đang ở bàn này
    donHangHienTai: {
        type: Schema.Types.ObjectId,
        ref: 'DonHang', // Liên kết đến Model DonHang
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Ban', banSchema);
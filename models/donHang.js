// File: models/donHang.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const donHangSchema = new mongoose.Schema({
    // 1. Người dùng (tài khoản đã đăng nhập)
 // 1. Người dùng (tài khoản đã đăng nhập)
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Đơn hàng phải thuộc về một người dùng'],
   
    },

    // 2. Bàn đã chọn
    banId: {
        type: Schema.Types.ObjectId,
        ref: 'Ban',
        required: [true, 'Đơn hàng phải được đặt tại một bàn cụ thể']
    },

    // 3. Tên khách hàng
    customerName: {
        type: String,
        required: [true, 'Tên khách hàng là bắt buộc'],
        trim: true
    },

    // 4. Ghi chú
    notes: {
        type: String,
        trim: true
    },

    // 5. Các món đã đặt
    items: [
        {
            itemId: { type: Schema.Types.ObjectId, ref: 'MonAn', required: true },
            quantity: { type: Number, required: true, min: [1, 'Số lượng phải ít nhất là 1'] }
        }
    ],

    // 6. Trạng thái thanh toán
    trangThaiThanhToan: {
        type: String,
        enum: ['Chưa thanh toán', 'Chờ ZaloPay', 'Đã thanh toán', 'Thất bại'],
        default: 'Chưa thanh toán'
    },

    // ✅ 7. Phương thức thanh toán (đồng bộ với controller)
    paymentMethod: {
        type: String,
        enum: ['cod', 'zalopay'], // cod = tiền mặt
        default: 'cod'
    },

    // ✅ 8. Mã giao dịch (ZaloPay hoặc VNPay)
    transactionNo: {
        type: String,
        default: null
    },

    // ✅ 9. Mã giao dịch nội bộ của ZaloPay (app_trans_id)
    appTransId: {
        type: String,
        default: null
    },
    paymentBank: { // Tên ngân hàng (VCB, TCB...)
        type: String,
        default: null
    },
    paymentAccountNo: { // Số tài khoản đã nhập
        type: String,
        default: null
    },

    // 10. Trạng thái đơn hàng
    status: {
        type: String,
        required: true,
        enum: ['Mới', 'Đang xử lý', 'Hoàn thành', 'Đã hủy'],
        default: 'Mới'
    },

    // 11. Tổng tiền
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    }
}, { timestamps: true });

donHangSchema.index({ user: 1, status: 1, createdAt: -1 });

donHangSchema.index({ status: 1, createdAt: -1 });
module.exports = mongoose.model('DonHang', donHangSchema);

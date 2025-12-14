const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const donHangSchema = new mongoose.Schema({
    // 1. Người dùng
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Đơn hàng phải thuộc về một người dùng'],
    },

    // 2. Bàn
    banId: {
        type: Schema.Types.ObjectId,
        ref: 'Ban',
        required: [true, 'Đơn hàng phải được đặt tại một bàn cụ thể']
    },

    // 3. Tên khách
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

    // 5. Món ăn
    items: [
        {
            itemId: { type: Schema.Types.ObjectId, ref: 'MonAn', required: true },
            quantity: { type: Number, required: true, min: [1, 'Số lượng phải ít nhất là 1'] }
        }
    ],

    // 6. Tổng tiền (Giá trị hiện tại của đơn)
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },

    // 🔥🔥🔥 [QUAN TRỌNG] SỐ TIỀN ĐÃ THANH TOÁN THỰC TẾ 🔥🔥🔥
    // (Đây là cái bạn đang thiếu, khiến hệ thống hiểu là 0đ)
    amountPaid: { 
        type: Number, 
        default: 0 
    },

    // 7. Trạng thái thanh toán (Đã bổ sung các trạng thái mới)
    trangThaiThanhToan: {
        type: String,
        enum: [
            'Chưa thanh toán', 
            'Chờ ZaloPay', 
            'Đã thanh toán', 
            'Thất bại', 
            'Chờ thanh toán thêm', // Mới thêm
            'Chờ hoàn tiền'        // Mới thêm
        ],
        default: 'Chưa thanh toán'
    },

    // 8. Phương thức thanh toán
    paymentMethod: {
        type: String,
        // Lưu ý: Bỏ enum cứng hoặc thêm đủ các loại để tránh lỗi khi Admin chọn 'Tiền mặt'/'Chuyển khoản'
        // enum: ['cod', 'zalopay', 'Tiền mặt', 'Chuyển khoản', 'Hoàn tiền'], 
        default: 'cod'
    },

    // 9. Thông tin Ngân hàng / ZaloPay
    transactionNo: { type: String, default: null }, // Mã giao dịch
    appTransId: { type: String, default: null },    // Mã ZaloPay
    paymentBank: { type: String, default: null },   // Tên ngân hàng
    paymentAccountNo: { type: String, default: null }, // Số tài khoản

    // 10. Trạng thái đơn hàng (Bếp)
    status: {
        type: String,
        required: true,
        enum: ['Mới', 'Đang xử lý', 'Hoàn thành', 'Đã hủy'],
        default: 'Mới'
    }

}, { timestamps: true });

// Index để tìm kiếm nhanh
donHangSchema.index({ user: 1, status: 1, createdAt: -1 });
donHangSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('DonHang', donHangSchema);
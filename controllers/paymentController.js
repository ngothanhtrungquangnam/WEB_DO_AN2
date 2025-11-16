const DonHang = require('../models/donHang');
const Ban = require('../models/ban');
const zaloPayService = require('../services/zaloPayService');
require('dotenv').config();

/**
 * ==========================================
 * 🔹 1. THANH TOÁN TRỰC TIẾP (TIỀN MẶT) - (DÙNG CHO ADMIN)
 * ==========================================
 */
// (Hàm này bị trùng với markOrderAsPaid, nhưng được gọi bởi gateway-mock.html cũ)
exports.payDirect = async (req, res) => {
    try {
        const { orderId } = req.body;
        if (!orderId) return res.status(400).json({ message: "Thiếu mã đơn hàng" });

        const order = await DonHang.findById(orderId);
        if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

        if (order.trangThaiThanhToan === 'Đã thanh toán') {
            return res.status(400).json({ message: "Đơn hàng đã được thanh toán" });
        }

        // Cập nhật trạng thái
        order.trangThaiThanhToan = 'Đã thanh toán';
        order.status = 'Hoàn thành';
        order.paymentMethod = 'cod';
        await order.save();

        const io = req.app.get('io');
        if (io) {
            const populatedOrder = await DonHang.findById(order._id)
                .populate('items.itemId', 'name gia price')
                .populate('user', 'username')
                .populate('banId', 'soBan');
            io.emit('order_updated', populatedOrder);
        }

        console.log(`💵 [Direct] Thanh toán thành công đơn ${orderId}`);
        return res.status(200).json({ success: true, message: "Thanh toán trực tiếp thành công" });

    } catch (error) {
        console.error("❌ [Direct] Lỗi thanh toán trực tiếp:", error);
        res.status(500).json({ success: false, message: 'Lỗi khi thanh toán trực tiếp', error: error.message });
    }
};

/**
 * ==========================================
 * 🔹 2. TẠO LINK THANH TOÁN (MÔ PHỎNG GATEWAY)
 * ==========================================
 */
exports.createZaloPayPayment = async (req, res) => {
    try {
        const { orderId, amount } = req.body; 
        if (!orderId || !amount) {
            return res.status(400).json({ message: "Thiếu mã đơn hàng hoặc số tiền" });
        }

        const order = await DonHang.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        }

        const rootUrl = `${req.protocol}://${req.get('host')}`;
        const finalRedirectUrl = process.env.ZALOPAY_REDIRECT_URL || (rootUrl + '/payment-result.html');

        // Tạo link mô phỏng trỏ đến gateway-mock.html
        const mockGatewayUrl = `${rootUrl}/gateway-mock.html?orderId=${orderId}&amount=${amount}&returnUrl=${encodeURIComponent(finalRedirectUrl)}`;

        console.log(`✅ [MÔ PHỎNG GATEWAY] Đã tạo link giả lập: ${mockGatewayUrl}`);
        
        return res.status(200).json({ success: true, paymentUrl: mockGatewayUrl });

    } catch (error) {
        console.error("❌ [MÔ PHỎNG GATEWAY] Lỗi:", error);
        res.status(500).json({ success: false, message: 'Lỗi tạo link ZaloPay (Mô phỏng)', error: error.message });
    }
};

/**
 * ==========================================
 * 🔹 3. XỬ LÝ CALLBACK ZALOPAY (IPN THẬT)
 * ==========================================
 */
exports.handleZaloPayIPN = async (req, res) => {
    let return_code = 1;
    let return_message = "success";

    try {
        const { data, mac } = req.body;
        const isValid = zaloPayService.verifyCallback(data, mac);

        if (!isValid) {
            console.error("🔥 [ZaloPay] IPN: Sai chữ ký");
            return_code = -1;
            return_message = "Invalid Signature";
        } else {
            const body = JSON.parse(data);
            const app_trans_id = body.app_trans_id;
            // Giả sử app_trans_id của ZaloPay Service là YYMMDD_orderId
            const orderId = app_trans_id.split('_')[1]; 

            const order = await DonHang.findById(orderId);
            if (!order) {
                console.error("🔥 [ZaloPay] IPN: Không tìm thấy đơn hàng");
                return_code = 0;
                return_message = "Order not found";
            } else {
                if (order.trangThaiThanhToan !== 'Đã thanh toán') {
                    if (body.result_code == 1) {
                        order.trangThaiThanhToan = 'Đã thanh toán';
                        order.paymentMethod = 'zalopay'; // Quan trọng
                        order.transactionNo = body.zp_trans_id;
                        await order.save();

                        const io = req.app.get('io');
                        if (io) {
                            const populatedOrder = await DonHang.findById(order._id)
                                .populate('items.itemId', 'name gia price')
                                .populate('user', 'username')
                                .populate('banId', 'soBan');
                            io.emit('order_updated', populatedOrder);
                        }
                        console.log(`✅ [ZaloPay] IPN: Thanh toán thành công đơn ${orderId}`);
                    } else {
                        order.trangThaiThanhToan = 'Thất bại';
                        await order.save();
                        console.log(`❌ [ZaloPay] IPN: Thanh toán thất bại đơn ${orderId}`);
                    }
                } else {
                    console.log(`ℹ️ [ZaloPay] IPN: Đơn ${orderId} đã xử lý trước đó.`);
                }
            }
        }
    } catch (error) {
        console.error("🔥 [ZaloPay] Lỗi xử lý IPN:", error);
        return_code = -1;
        return_message = "Unknown error";
    } finally {
        res.json({ return_code, return_message });
    }
};

/**
 * ==========================================
 * 🔹 4. XÁC NHẬN THANH TOÁN ONLINE (MÔ PHỎNG)
 * (ĐÃ SỬA LỖI TÊN TRƯỜNG)
 * ==========================================
 */
exports.confirmOnlinePayment = async (req, res) => {
    // Lấy thêm 2 trường mới từ body
    const { orderId, bankName, accountNo } = req.body;
    const io = req.app.get('io');

    try {
        const order = await DonHang.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        }

        // Cập nhật thông tin giao dịch
        order.trangThaiThanhToan = 'Đã thanh toán';
        order.paymentMethod = 'zalopay'; 
        order.paymentBank = bankName; // <-- LƯU NGÂN HÀNG
        order.paymentAccountNo = accountNo; // <-- LƯU STK
        
        const updatedOrder = await order.save();

        // Populate để gửi socket
        const populatedOrder = await DonHang.findById(updatedOrder._id)
            .populate('items.itemId', 'name gia price')
            .populate('user', 'username')
            .populate('banId', 'soBan');

        if (io) {
            io.emit('order_updated', populatedOrder);
        }
        
        console.log(`✅ [Mô phỏng] Đơn hàng ${orderId} đã được thanh toán online.`);
        res.status(200).json({ success: true, message: "Mô phỏng thanh toán thành công" });

    } catch (error) {
        console.error("Lỗi khi xác nhận thanh toán mô phỏng:", error);
        res.status(500).json({ message: 'Lỗi server: ' + error.message });
    }
};
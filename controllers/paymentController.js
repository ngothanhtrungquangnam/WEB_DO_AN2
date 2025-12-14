const DonHang = require('../models/donHang');
const Ban = require('../models/ban');
const zaloPayService = require('../services/zaloPayService');
require('dotenv').config();

/**
 * ============================================================
 * 🔥 1. CẤU HÌNH NGÂN HÀNG (ĐA TÀI KHOẢN - TOÀN CỤC) 🔥
 * ============================================================
 */
const BANK_CONFIG = {
    MAIN: {
        BANK_ID: 'MB',          // Ngân hàng chính (Casso 1)
        ACCOUNT_NO: '0777488240',
        ACCOUNT_NAME: 'NGO THANH TRUNG',
        TEMPLATE: 'compact2'
    },
    BACKUP: {
        BANK_ID: 'BIDV',        // Ngân hàng phụ (Casso 2)
      ACCOUNT_NO: 'V3CASSQUANNGON',// 👉 HÃY ĐIỀN SỐ TÀI KHOẢN BIDV CỦA BẠN VÀO ĐÂY
        ACCOUNT_NAME: 'QUAN AN NGON (CASSO)', // Tên tùy ý
        TEMPLATE: 'compact2'
    }
};

// 🔘 CÔNG TẮC CHUYỂN TÀI KHOẢN (Mặc định là MAIN)
let currentBankKey = 'BACKUP';

/**
 * 🔹 API ĐỔI TÀI KHOẢN NGÂN HÀNG (Dùng cho Admin/Postman)
 */
exports.switchBankAccount = (req, res) => {
    const { type } = req.body; // Nhận vào 'MAIN' hoặc 'BACKUP'
    
    if (type === 'MAIN' || type === 'BACKUP') {
        currentBankKey = type; // Cập nhật biến toàn cục
        console.log(`🔄 Đã chuyển hệ thống sang dùng tài khoản: ${type} (${BANK_CONFIG[type].BANK_ID})`);
        return res.json({ success: true, message: `Đã chuyển sang dùng tài khoản: ${type}` });
    }
    
    return res.status(400).json({ success: false, message: "Loại tài khoản không hợp lệ (chỉ chấp nhận MAIN hoặc BACKUP)" });
};

/**
 * ==========================================
 * 🔹 2. THANH TOÁN TRỰC TIẾP (TIỀN MẶT)
 * ==========================================
 */
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
        
        // 🔥 [FIX LỖI] LƯU SỐ TIỀN ĐÃ TRẢ
        order.amountPaid = order.totalPrice; 
        // ------------------------------

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
 * 🔹 3. TẠO LINK THANH TOÁN ZALOPAY
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

        console.log(`✅ Đã tạo link giả lập: ${mockGatewayUrl}`);
        
        return res.status(200).json({ success: true, paymentUrl: mockGatewayUrl });

    } catch (error) {
        console.error("❌ Lỗi:", error);
        res.status(500).json({ success: false, message: 'Lỗi tạo link ZaloPay ', error: error.message });
    }
};

/**
 * ==========================================
 * 🔹 4. XỬ LÝ CALLBACK ZALOPAY (IPN THẬT)
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
            const orderId = app_trans_id.split('_')[1]; 

            const order = await DonHang.findById(orderId);
            if (!order) {
                console.error("🔥 [ZaloPay] IPN: Không tìm thấy đơn hàng");
                return_code = 0;
                return_message = "Order not found";
            } else {
                if (order.trangThaiThanhToan !== 'Đã thanh toán') {
                    if (body.result_code == 1) {
                        
                        // 🔥 [FIX LỖI] LƯU SỐ TIỀN ĐÃ TRẢ KHI ZALOPAY BÁO THÀNH CÔNG
                        order.amountPaid = order.totalPrice;
                        // ------------------------------

                        order.trangThaiThanhToan = 'Đã thanh toán';
                        order.paymentMethod = 'zalopay'; 
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
 * 🔹 5. XÁC NHẬN THANH TOÁN ONLINE (MÔ PHỎNG)
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
        
        // 🔥 [FIX LỖI] LƯU SỐ TIỀN ĐÃ TRẢ KHI TEST MÔ PHỎNG
        order.amountPaid = order.totalPrice; 
        // ------------------------------

        order.paymentMethod = 'zalopay'; 
        order.paymentBank = bankName; 
        order.paymentAccountNo = accountNo; 
        
        const updatedOrder = await order.save();

        // Populate để gửi socket
        const populatedOrder = await DonHang.findById(updatedOrder._id)
            .populate('items.itemId', 'name gia price')
            .populate('user', 'username')
            .populate('banId', 'soBan');

        if (io) {
            io.emit('order_updated', populatedOrder);
        }
        
        console.log(`✅ Đơn hàng ${orderId} đã được thanh toán online. AmountPaid: ${order.amountPaid}`);
        res.status(200).json({ success: true, message: "Thanh toán thành công" });

    } catch (error) {
        console.error("Lỗi khi xác nhận thanh toán ", error);
        res.status(500).json({ message: 'Lỗi server: ' + error.message });
    }
};

/**
 * ==========================================
 * 🔹 6. TẠO MÃ VIETQR ĐỘNG (ĐÃ NÂNG CẤP ĐA TÀI KHOẢN)
 * ==========================================
 */
exports.createVietQR = async (req, res) => {
    try {
        // 1. Nhận orderId VÀ amount (nếu có) từ Frontend
        const { orderId, amount } = req.body;
        
        // Import Model
        const DonHang = require('../models/donHang'); 
        const order = await DonHang.findById(orderId);
        
        if (!order) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
        }

        // 🔥 LOGIC CHỌN TÀI KHOẢN TỰ ĐỘNG 🔥
        // Lấy thông tin từ cấu hình dựa trên biến toàn cục currentBankKey
        const selectedBank = BANK_CONFIG[currentBankKey]; 

        const BANK_ID = selectedBank.BANK_ID;
        const ACCOUNT_NO = selectedBank.ACCOUNT_NO;
        const ACCOUNT_NAME = selectedBank.ACCOUNT_NAME;
        const TEMPLATE = selectedBank.TEMPLATE;

        // 2. XÁC ĐỊNH SỐ TIỀN CẦN THANH TOÁN (LOGIC CŨ GIỮ NGUYÊN)
        // - Nếu Frontend gửi 'amount' lên (trường hợp trả thêm) -> Dùng amount đó.
        // - Nếu không -> Tự tính (Tổng tiền - Đã trả).
        
        let finalAmount = 0;

        if (amount && amount > 0) {
            finalAmount = amount; // Dùng số tiền cụ thể (ví dụ 20k)
        } else {
            // Lấy tổng tiền trừ đi số đã trả (nếu có)
            const daTra = order.amountPaid || 0;
            finalAmount = order.totalPrice - daTra;
        }

        // Kiểm tra nếu không còn nợ đồng nào
        if (finalAmount <= 0) {
            return res.status(400).json({ success: false, message: "Đơn hàng đã thanh toán đủ!" });
        }

        // 3. TẠO NỘI DUNG CHUYỂN KHOẢN (MEMO)
        // ⚠️ QUAN TRỌNG: Phải dùng FULL ID đơn hàng để Webhook Regex bắt được
        const memo = `${order._id}`; 

        // 4. Tạo đường link ảnh QR VietQR
        let qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-${TEMPLATE}.png`;
        
        // Thêm tham số
        qrUrl += `?amount=${finalAmount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

        // 5. Trả về cho Frontend
        return res.status(200).json({
            success: true,
            qrCodeUrl: qrUrl,
            amount: finalAmount,
            memo: memo,
            // Trả thêm thông tin ngân hàng đang dùng để Frontend biết
            bankInfo: { 
                bankId: BANK_ID, 
                accountNo: ACCOUNT_NO,
                key: currentBankKey 
            }, 
            message: "Tạo mã QR thành công"
        });

    } catch (error) {
        console.error("Lỗi tạo VietQR:", error);
        res.status(500).json({ success: false, message: "Lỗi server khi tạo QR" });
    }
};
exports.getCurrentBankStatus = (req, res) => {
    return res.json({ 
        success: true, 
        currentKey: currentBankKey, // Trả về 'MAIN' hoặc 'BACKUP'
        bankInfo: BANK_CONFIG[currentBankKey] 
    });
};
/**
 * 🔹 7. XỬ LÝ WEBHOOK TỪ CASSO (PHIÊN BẢN FIX LỖI BIDV)
 */
exports.handleCassoWebhook = async (req, res) => {
    try {
        const { error, data } = req.body;
        
        // Nếu Casso báo lỗi thì bỏ qua, nhưng vẫn trả lời OK để Casso không gửi lại
        if (error !== 0) {
            console.log("⚠️ Casso Webhook Error:", error);
            return res.status(200).json({ error: 0, message: 'Ignored error' });
        }

        console.log("🔔 [WEBHOOK] Nhận được tín hiệu từ Casso!");

        const DonHang = require('../models/donHang');
        const io = req.app.get('io');

        for (const transaction of data) {
            // Lấy tất cả các trường có thể chứa nội dung
            // Lưu ý: Casso có thể gửi 'description' hoặc 'content' tùy version
            const description = transaction.description || transaction.content || "";
            const amount = parseInt(transaction.amount);
            
            console.log("================================================");
            console.log(`💰 TIỀN VÀO: ${amount.toLocaleString()} VNĐ`);
            console.log(`📝 NỘI DUNG GỐC TỪ BANK: "${description}"`);
            console.log("================================================");

            // --- CHIẾN THUẬT TÌM MÃ ĐƠN HÀNG (QUAN TRỌNG) ---
            
            // 1. Chuẩn hóa chuỗi: Chuyển hết về chữ hoa để dễ tìm
            let cleanDesc = description.toUpperCase();
            
            // 2. Mẹo Fix lỗi BIDV: 
            // BIDV hay ghi "V3CASS..." dính liền với mã, ta thay thế các ký tự đặc biệt bằng khoảng trắng
            cleanDesc = cleanDesc.replace(/[^A-Z0-9]/g, ' '); 

            // 3. Tìm chuỗi Hex 24 ký tự (ID MongoDB)
            // Regex này tìm chuỗi gồm 24 ký tự liên tiếp (0-9, A-F)
            const match = cleanDesc.match(/[0-9A-F]{24}/); 

            if (match) {
                const orderId = match[0].toLowerCase(); // Đưa về chữ thường khớp DB
                console.log("✅ TÌM THẤY ORDER ID:", orderId);

                const order = await DonHang.findById(orderId);

                if (order) {
                    // Cộng dồn tiền
                    const daTra = (order.amountPaid || 0) + amount;
                    order.amountPaid = daTra;

                    console.log(`   -> Khách cần trả: ${order.totalPrice}`);
                    console.log(`   -> Tổng đã nhận : ${daTra}`);

                    // Kiểm tra đủ tiền (Cho phép sai số 2000đ phòng khi khách nhập thiếu lẻ)
                    if (daTra >= order.totalPrice - 2000) {
                        order.trangThaiThanhToan = 'Đã thanh toán';
                        order.paymentMethod = 'transfer'; 
                        console.log("   => 🚀 DUYỆT ĐƠN THÀNH CÔNG!");
                        
                        // BẮN SOCKET NGAY LẬP TỨC
                        if (io) {
                            io.emit('order_updated', order);
                            // Báo cho trang gateway-mock.html biết để chuyển hướng
                            io.emit('payment_success', { orderId: orderId }); 
                            console.log("   => 📡 Đã bắn Socket payment_success");
                        }
                    } else {
                        console.log("   => ⚠️ CHƯA ĐỦ TIỀN (Chờ chuyển thêm)");
                    }

                    await order.save();
                } else {
                    console.log("❌ Có mã ID nhưng không tìm thấy đơn hàng trong Database.");
                }
            } else {
                console.log("❌ KHÔNG TÌM THẤY MÃ ĐƠN HÀNG (24 KÝ TỰ) TRONG NỘI DUNG.");
                console.log("👉 Hãy xem dòng 'NỘI DUNG GỐC' ở trên xem Ngân hàng đã biến đổi nội dung thế nào.");
            }
        }

        return res.json({ error: 0, message: 'Success' });

    } catch (e) {
        console.error("❌ Lỗi xử lý Webhook:", e);
        return res.status(500).json({ message: 'Error' });
    }
};
const DonHang = require('../models/donHang');
const MonAn = require('../models/monAn');
const Ban = require('../models/ban'); 
const axios = require('axios'); // Đừng quên dòng này

// 🔥 ĐÃ ĐIỀN THÔNG TIN TỪ FILE CŨ CỦA BẠN 🔥
const TELEGRAM_BOT_TOKEN = '8147916467:AAHO8OPckpuCo1Ok0R43ancEQO9TL9kzNss'; 
const TELEGRAM_CHAT_ID = '7219225363';

// ... (phần hàm sendTelegramNotify giữ nguyên như hướng dẫn trước)
async function sendTelegramNotify(order, title = "🔔 CÓ ĐƠN HÀNG MỚI!") {
    try {
        // ... (phần lấy itemsList, total, time giữ nguyên) ...
        const itemsList = order.items.map(i => {
            const name = i.itemId ? i.itemId.name : 'Món không xác định';
            return `- ${name} (x${i.quantity})`;
        }).join('\n');

        const total = (order.totalPrice || 0).toLocaleString('vi-VN');
        const tableName = order.banId ? order.banId.soBan : 'Mang về';
        const time = new Date(order.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        
        // Thay tiêu đề cứng bằng biến ${title}
        const message = `
<b>${title}</b>
--------------------
👤 <b>Khách:</b> ${order.customerName}
🍽 <b>Bàn:</b> ${tableName}
💰 <b>Tổng tiền:</b> ${total}đ
--------------------
<b>Chi tiết món hiện tại:</b>
${itemsList}
--------------------
⏰ <i>${time}</i>
        `;

        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        console.log('✅ [Telegram] Đã gửi thông báo:', title);
    } catch (error) {
        console.error('❌ [Telegram] Lỗi:', error.message);
    }
}
// === HÀM TẠO ĐƠN HÀNG (Chuẩn) ===
exports.createNewOrder = async (req, res) => {
    const io = req.app.get('io');
    const { customerName, notes, banId, items, paymentMethod, totalPrice, userId } = req.body;

    // Validate
    if (!userId) return res.status(400).json({ message: 'Không tìm thấy ID người dùng.' });
    if (!items || items.length === 0) return res.status(400).json({ message: 'Giỏ hàng rỗng.' });
    if (!paymentMethod || !['cod', 'zalopay'].includes(paymentMethod)) return res.status(400).json({ message: 'Phương thức thanh toán không hợp lệ.' });
    
    let ban = null;
    let newOrder = null;

    try {
        // 1. Tính tổng
        let calculatedTotalPrice = 0;
        const orderItems = [];
        for (const item of items) {
            const menuItem = await MonAn.findById(item.itemId);
            if (!menuItem) {
                return res.status(404).json({ message: `Không tìm thấy món ID: ${item.itemId}` });
            }
            const price = (menuItem.gia !== undefined ? menuItem.gia : (menuItem.price !== undefined ? menuItem.price : 0));
            calculatedTotalPrice += price * item.quantity;
            orderItems.push({ itemId: item.itemId, quantity: item.quantity });
        }

        // 2. Kiểm tra bàn
        ban = await Ban.findById(banId);
        if (!ban) return res.status(404).json({ message: 'Bàn không tồn tại.' });
        if (ban.trangThai !== 'Trống') return res.status(400).json({ message: `Bàn ${ban.soBan} đang được phục vụ.` });

        // 3. Tạo đơn hàng (luôn là "Chưa thanh toán")
        newOrder = new DonHang({
            user: userId,
            banId: banId,
            customerName: customerName,
            notes: notes,
            items: orderItems,
            totalPrice: calculatedTotalPrice,
            paymentMethod: paymentMethod, // Sửa lỗi: dùng đúng 'paymentMethod'
            trangThaiThanhToan: 'Chưa thanh toán',
            status: 'Mới'
        });
        await newOrder.save();

        // 4. Cập nhật bàn
        ban.trangThai = 'Đang phục vụ';
        ban.donHangHienTai = newOrder._id;
        await ban.save();

        // 5. Populate để trả về
        const populatedOrder = await DonHang.findById(newOrder._id)
            .populate('items.itemId', 'name gia price')
            .populate('user', 'username')
            .populate('banId', 'soBan');

       // 6. Emit socket (Giữ nguyên)
        if (io) {
            io.emit('banUpdated', { _id: ban._id, soBan: ban.soBan, trangThai: ban.trangThai, donHangHienTai: ban.donHangHienTai });
            io.emit('new_order', populatedOrder);
        }

        // 🔥🔥🔥 LOGIC GỬI TELEGRAM THÔNG MINH (SỬA ĐOẠN NÀY) 🔥🔥🔥
        // 1. Nếu khách chọn 'cod' hoặc 'Tiền mặt' -> Gửi thông báo NGAY LẬP TỨC
        // 2. Nếu khách chọn 'banking' hoặc 'zalopay' -> KHÔNG GỬI (Để dành cho Webhook lo)
        
        const phuongThuc = paymentMethod ? paymentMethod.toLowerCase() : '';
        const listThanhToanNgay = ['cod', 'tiền mặt', 'cash', 'tien mat'];

        if (listThanhToanNgay.includes(phuongThuc)) {
            // Gửi ngay và luôn
            sendTelegramNotify(populatedOrder, "🔔 ĐƠN MỚI (THANH TOÁN TẠI QUẦY)");
        } 
        else {
            console.log("⏳ Đơn chuyển khoản: Chờ tiền về mới báo Telegram...");
        }
        // 🔥🔥🔥 KẾT THÚC SỬA 🔥🔥🔥

        console.log(`✅ Đơn hàng đã tạo: ${populatedOrder._id} (Trạng thái: Chưa thanh toán)`);
        return res.status(201).json({ donHang: populatedOrder });
    } catch (error) {
        console.error("Lỗi tạo đơn hàng:", error);
        if (ban && newOrder) { /* ... (Logic rollback bàn) ... */ }
        return res.status(500).json({ message: 'Lỗi tạo đơn hàng: ' + error.message });
    }
};

// === (ADMIN) CẬP NHẬT TRẠNG THÁI (Mới, Đang xử lý...) ===
// (ĐÃ SỬA: KHÔNG TỰ ĐỘNG TRẢ BÀN KHI HOÀN THÀNH)
exports.updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const io = req.app.get('io'); 

    const allowedStatuses = ['Mới', 'Đang xử lý', 'Hoàn thành', 'Đã hủy'];
    if (!allowedStatuses.includes(status)) return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });

    try {
        const updatedOrder = await DonHang.findByIdAndUpdate(
            id, { status }, { new: true, runValidators: true }
        ).populate('items.itemId', 'name gia price').populate('user', 'username').populate('banId', 'soBan');

        if (!updatedOrder) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        
        // CHỈ TỰ ĐỘNG TRẢ BÀN KHI BẤM "HỦY ĐƠN"
        if (status === 'Đã hủy') {
            const banId = updatedOrder.banId?._id; 
            if (banId) {
                const updatedBan = await Ban.findOneAndUpdate(
                    { _id: banId, donHangHienTai: id }, 
                    { trangThai: 'Trống', donHangHienTai: null, soKhach: 0 },
                    { new: true }
                );
                if (io && updatedBan) io.emit('banUpdated', updatedBan); 
            }
        }
        
        if (io) io.emit('order_updated', updatedOrder);
        res.status(200).json(updatedOrder);
    } catch (error) {
        console.error("Lỗi cập nhật đơn hàng:", error);
        res.status(500).json({ message: 'Lỗi cập nhật đơn hàng: ' + error.message });
    }
};

// --- 2. SỬA HÀM XÁC NHẬN THANH TOÁN (Thu nốt phần thiếu) ---
exports.markOrderAsPaid = async (req, res) => {
    try {
        const orderId = req.params.id;
        const DonHang = require('../models/donHang');

        const order = await DonHang.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }

        // 1. Cập nhật trạng thái thanh toán (Khớp với field trong Model của bạn)
        order.trangThaiThanhToan = 'Đã thanh toán';

        // 2. Gán số tiền đã trả = Tổng tiền đơn hàng
        // ⚠️ QUAN TRỌNG: Model bạn dùng 'totalPrice', nên ở đây phải gọi 'totalPrice'
        order.amountPaid = order.totalPrice; 

        // 3. Các thông tin khác
        order.paymentMethod = 'Tiền mặt';
        order.paymentDate = new Date();

        // 4. Giữ nguyên status là 'Đang xử lý' hoặc 'Mới' để không mất khỏi màn hình User
        // (Trừ khi bạn muốn nó biến mất luôn thì đổi thành 'Hoàn thành')
        // order.status = 'Hoàn thành'; // <-- Tùy bạn chọn

        await order.save();

        // Socket báo realtime
        const io = req.app.get('io');
        if (io) io.emit('order_updated', order);

        res.json({ success: true, message: 'Đã xác nhận thanh toán tiền mặt', order });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};
// === (ADMIN) TRẢ BÀN THỦ CÔNG ===
exports.releaseTableManually = async (req, res) => {
    const { id } = req.params; // ID của ĐƠN HÀNG
    const io = req.app.get('io');
    try {
        const order = await DonHang.findById(id);
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        const banId = order.banId;
        if (!banId) return res.status(400).json({ message: 'Đơn hàng này không có thông tin bàn.' });

        const updatedBan = await Ban.findOneAndUpdate(
            { _id: banId, donHangHienTai: id }, 
            { trangThai: 'Trống', donHangHienTai: null, soKhach: 0 },
            { new: true }
        );

        if (!updatedBan) return res.status(200).json({ success: true, message: 'Bàn đã được trả trước đó.' });
        if (io) io.emit('banUpdated', updatedBan);
        
        console.log(`Bàn ${updatedBan.soBan} đã được trả về Trống.`);
        res.status(200).json({ success: true, message: `Bàn ${updatedBan.soBan} đã được trả.` });

    } catch (error) {
        console.error("Lỗi khi trả bàn thủ công:", error);
        res.status(500).json({ message: 'Lỗi server: ' + error.message });
    }
};

// === (ADMIN) XÓA ĐƠN HÀNG (Sẽ trả bàn) ===
exports.deleteOrder = async (req, res) => {
    const { id } = req.params;
    const io = req.app.get('io');
    try {
        const orderToDelete = await DonHang.findById(id);
        if (!orderToDelete) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        
        if (orderToDelete.banId) {
            const updatedBan = await Ban.findOneAndUpdate(
                { _id: orderToDelete.banId, donHangHienTai: id },
                { trangThai: 'Trống', donHangHienTai: null, soKhach: 0 },
                { new: true }
            );
            if (io && updatedBan) io.emit('banUpdated', updatedBan);
        }
        
        await DonHang.findByIdAndDelete(id);
        if (io) io.emit('order_deleted', { orderId: id });
        res.status(200).json({ success: true, message: 'Đã xóa đơn hàng thành công.' });
    } catch (error) {
        console.error("Lỗi khi xóa đơn hàng:", error);
        res.status(500).json({ message: 'Lỗi server khi xóa đơn hàng: ' + error.message });
    }
};

// === (ADMIN) LẤY TẤT CẢ ĐƠN HÀNG (Trang Danh sách Admin) ===
exports.getAllOrders = async (req, res) => {
    try {
        const { date } = req.query;
        const filter = {};
        if (date) {
            const selectedDate = new Date(date); 
            const nextDate = new Date(selectedDate);
            nextDate.setDate(selectedDate.getDate() + 1);
            filter.createdAt = { $gte: selectedDate, $lt: nextDate };
        }

        const allOrders = await DonHang.find(filter) 
            .sort({ createdAt: -1 })
            .populate('items.itemId', 'name gia price')
            .populate('user', 'username')
            .populate('banId', 'soBan'); 
        res.status(200).json(allOrders);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi lấy đơn hàng: ' + error.message });
    }
};

// === (TỐI ƯU) ADMIN: LẤY ĐƠN ĐANG HOẠT ĐỘNG (Trang Sơ đồ bàn) ===
exports.getAdminActiveOrders = async (req, res) => {
    try {
        const activeOrders = await DonHang.find({
            status: { $in: ['Mới', 'Đang xử lý'] }
        })
        .select('banId totalPrice status trangThaiThanhToan paymentMethod customerName') // Sửa: Thêm paymentMethod
        .sort({ createdAt: -1 });
        
        res.status(200).json(activeOrders);
    } catch (error) {
        console.error("Lỗi getAdminActiveOrders:", error);
        res.status(500).json({ message: 'Lỗi server khi lấy đơn hàng đang hoạt động' });
    }
};

// === (TỐI ƯU) ADMIN: LẤY CHI TIẾT 1 ĐƠN (Khi bấm vào bàn) ===
exports.getSingleOrderDetails = async (req, res) => {
    try {
        const order = await DonHang.findById(req.params.id)
            .populate('items.itemId', 'name gia price')
            .populate('user', 'username')
            .populate('banId', 'soBan');
            
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        res.json(order);
    } catch (error) {
        console.error("Lỗi getSingleOrderDetails:", error);
        res.status(500).json({ message: 'Lỗi server khi lấy chi tiết đơn hàng' });
    }
};

// === (USER) LẤY TẤT CẢ ĐƠN HÀNG (Cũ, Chậm) ===
exports.getMyOrders = async (req, res) => {
    const { userId } = req.query; 
    if (!userId) return res.json([]); 
    
    try {
        const donHangs = await DonHang.find({ user: userId }) 
                                    .populate('items.itemId', 'name gia price') 
                                    .populate('banId', 'soBan')
                                    .sort({ createdAt: -1 }); 
        res.json(donHangs);
    } catch (error) {
        console.error('Lỗi getMyOrders:', error);
        res.status(500).json({ message: "Lỗi khi lấy lịch sử đơn hàng" });
    }
};

// === (TỐI ƯU) USER: LẤY ĐƠN ĐANG XỬ LÝ (Trang Tiến trình) ===
exports.getMyActiveOrders = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ message: 'Thiếu userId' });

        const donHangs = await DonHang.find({ 
            user: userId,
            status: { $in: ['Mới', 'Đang xử lý'] } 
        })
        .populate('items.itemId', 'name gia price')
        .populate('banId', 'soBan')
        .sort({ createdAt: -1 });
        
        res.json(donHangs);
    } catch (error) {
        console.error("Lỗi getMyActiveOrders:", error);
        res.status(500).json({ message: "Lỗi khi lấy đơn hàng đang xử lý" });
    }
};

// === (TỐI ƯU) USER: LẤY ĐƠN ĐÃ XONG (Trang Lịch sử) ===
exports.getMyFinishedOrders = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ message: 'Thiếu userId' });

        const donHangs = await DonHang.find({ 
            user: userId,
            status: { $in: ['Hoàn thành', 'Đã hủy'] } 
        })
        .populate('items.itemId', 'name gia price')
        .populate('banId', 'soBan')
        .sort({ createdAt: -1 });
        
        res.json(donHangs);
    } catch (error) {
        console.error("Lỗi getMyFinishedOrders:", error);
        res.status(500).json({ message: "Lỗi khi lấy lịch sử đơn hàng" });
    }
};

// === (ADMIN) LẤY LỊCH SỬ GIAO DỊCH ZALOPAY ===
exports.getZaloPayHistory = async (req, res) => {
    console.log('Admin đang lấy lịch sử giao dịch ZaloPay...');
    try {
        const zaloPayOrders = await DonHang.find({ 
            paymentMethod: 'zalopay',         // Lọc theo 'paymentMethod'
            trangThaiThanhToan: 'Đã thanh toán' 
        })
        .populate('user', 'username') 
        .populate('banId', 'soBan')
        .sort({ createdAt: -1 });
        
        console.log(`Tìm thấy ${zaloPayOrders.length} giao dịch ZaloPay.`);
        res.status(200).json(zaloPayOrders);

    } catch (error) {
        console.error("Lỗi getZaloPayHistory:", error);
        res.status(500).json({ message: 'Lỗi server khi lấy lịch sử ZaloPay' });
    }
};

// (Hàm này có thể trùng với getMyOrders, nhưng giữ lại)
exports.getDonHangByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const donHang = await DonHang.find({ user: userId }).populate("items.itemId", 'name gia price').populate('banId', 'soBan');
        res.json(donHang);
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi lấy lịch sử đơn hàng" });
    }
};
// ============================================================
// 🔥 PHẦN BỔ SUNG: API CHO GIAO DIỆN CẬP NHẬT TIẾN TRÌNH (WEB UI)
// ============================================================

const LOCKED_STATUS = ['Đang xử lý', 'Đang nấu', 'Đang giao', 'Hoàn tất'];



// 1. HÀM CẬP NHẬT MÓN (Có logic chặn khi Admin đã xử lý)
exports.apiUpdateItem = async (req, res) => {
    try {
        const { orderId, itemId, quantity } = req.body;
        const order = await DonHang.findById(orderId);
        
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn.' });

        // --- 🔥 ĐOẠN CODE CHẶN SỬA ĐƠN (QUAN TRỌNG) 🔥 ---
        // Nếu trạng thái KHÁC 'Mới' (tức là Đang xử lý, Hoàn thành...) thì chặn ngay.
        if (order.status !== 'Mới') {
            return res.status(400).json({ 
                success: false, 
                message: `⛔ Đơn hàng đang được nhà bếp xử lý (${order.status}). Bạn không thể thêm/bớt món lúc này. Vui lòng gọi nhân viên nếu cần hỗ trợ!` 
            });
        }
        // -----------------------------------------------------

      const itemIndex = order.items.findIndex(i => {
            const currentId = i.itemId._id ? i.itemId._id.toString() : i.itemId.toString();
            return currentId === itemId.toString();
        });

        if (quantity <= 0) {
            if (itemIndex > -1) order.items.splice(itemIndex, 1);
        } else {
            if (itemIndex > -1) {
                // Món đã có -> Cập nhật số lượng mới
                order.items[itemIndex].quantity = parseInt(quantity);
            } else {
                // Món chưa có -> Thêm mới
                order.items.push({ itemId, quantity: parseInt(quantity) });
            }
        }

        // --- TÍNH TOÁN LẠI TIỀN ---
        let newTotal = 0;
        for (let item of order.items) {
             const food = await MonAn.findById(item.itemId);
             if(food) newTotal += food.price * item.quantity;
        }
        order.totalPrice = newTotal;

        // Logic tính nợ (Giữ nguyên logic bạn đang có)
        const daTra = order.amountPaid || 0; 
        if (daTra === 0) {
            order.trangThaiThanhToan = 'Chưa thanh toán';
        } else {
            if (newTotal > daTra) order.trangThaiThanhToan = 'Chờ thanh toán thêm';
            else if (newTotal < daTra) order.trangThaiThanhToan = 'Chờ hoàn tiền';
            else order.trangThaiThanhToan = 'Đã thanh toán';
        }

       await order.save();
        if (req.io) req.io.emit('SERVER_UPDATE_ORDER', { tableId: order.banId, actionType: 'UPDATE' });

        // 🔥🔥🔥 BẮT ĐẦU THÊM PHẦN NÀY 🔥🔥🔥
        // 1. Lấy thông tin đầy đủ để gửi Telegram (Populate tên món, tên bàn)
        const updatedOrderForBot = await DonHang.findById(order._id)
            .populate('items.itemId', 'name price')
            .populate('banId', 'soBan');

        // 2. Gửi thông báo với tiêu đề riêng
        sendTelegramNotify(updatedOrderForBot, "✏️ KHÁCH CẬP NHẬT MÓN");
        // 🔥🔥🔥 KẾT THÚC PHẦN THÊM 🔥🔥🔥
        
        return res.status(200).json({ success: true, message: 'Cập nhật thành công!', order });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
};
/// controllers/donHangController.js (Sửa lại hàm apiSwitchTable)
exports.apiSwitchTable = async (req, res) => {
    try {
        const { orderId, newTableId } = req.body; 
        
        const order = await DonHang.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại.' });

        // --- LOGIC TÌM BÀN MỚI THÔNG MINH HƠN (ĐÃ FIX LỖI 4 -> 14) ---
        let banMoi = null;

        // Cách 1: Thử tìm theo ID (nếu input đúng chuẩn MongoDB ID 24 ký tự)
        if (newTableId.match(/^[0-9a-fA-F]{24}$/)) {
            banMoi = await Ban.findById(newTableId);
        }

        // Cách 2: Nếu không phải ID -> Tìm theo Tên/Số bàn chính xác
        if (!banMoi) {
            // 💡 GIẢI THÍCH REGEX MỚI:
            // ^                     : Bắt đầu chuỗi
            // (?:Bàn|Ban|Table)?    : Chấp nhận tiền tố "Bàn", "Ban", "Table" (có hoặc không)
            // \s* : Chấp nhận khoảng trắng (ví dụ "Bàn 4")
            // 0* : Chấp nhận số 0 ở đầu (ví dụ nhập "4" tìm ra "04")
            // ${newTableId}         : Số khách nhập vào
            // $                     : Kết thúc chuỗi (QUAN TRỌNG: Để chặn số 4 khớp với 14)

            const regexString = `^(?:Bàn|Ban|Table)?\\s*0*${newTableId}$`;
            
            banMoi = await Ban.findOne({ 
                soBan: { $regex: new RegExp(regexString, 'i') } 
            });
        }

        // Nếu vẫn không thấy
        if (!banMoi) {
            return res.status(404).json({ success: false, message: `Không tìm thấy bàn nào có tên/số là "${newTableId}"` });
        }
        // ----------------------------------------
        
        // Kiểm tra bàn có trống không
        if (banMoi.donHangHienTai || (banMoi.trangThai && banMoi.trangThai !== 'Trống')) {
            return res.status(400).json({ success: false, message: `Bàn ${banMoi.soBan} đang có khách, không thể chuyển sang.` });
        }

        // Check khóa đơn
        if (order.status === 'Đang giao' || order.status === 'Hoàn tất') {
             return res.status(400).json({ success: false, message: 'Đơn đang giao hoặc đã xong, không thể chuyển bàn.' });
        }

        const oldTableId = order.banId;

        // Cập nhật Đơn hàng
        order.banId = banMoi._id;
        await order.save();

        // Cập nhật Bàn Cũ -> Trống
        if (oldTableId) {
            await Ban.findByIdAndUpdate(oldTableId, { 
                trangThai: 'Trống', 
                donHangHienTai: null 
            });
        }

        // Cập nhật Bàn Mới -> Có khách
        banMoi.trangThai = 'Đang phục vụ';
        banMoi.donHangHienTai = order._id;
        await banMoi.save();

        // Socket logic (nếu có)
        if (req.io) {
             if (oldTableId) req.io.emit('SERVER_UPDATE_ORDER', { tableId: oldTableId, actionType: 'CLEAR' });
             req.io.emit('SERVER_UPDATE_ORDER', { tableId: banMoi._id, actionType: 'UPDATE' });
        }

        // 🔥🔥🔥 BẮT ĐẦU THÊM PHẦN NÀY 🔥🔥🔥
        // 1. Lấy lại đơn hàng (để cập nhật tên bàn mới nhất vừa đổi)
        const switchedOrderForBot = await DonHang.findById(orderId)
            .populate('items.itemId', 'name price')
            .populate('banId', 'soBan');

        // 2. Gửi thông báo
        sendTelegramNotify(switchedOrderForBot, "🔄 KHÁCH ĐÃ CHUYỂN BÀN");
        // 🔥🔥🔥 KẾT THÚC PHẦN THÊM 🔥🔥🔥

        return res.status(200).json({ success: true, message: `Đã chuyển sang ${banMoi.soBan}` });

    } catch (error) {
        console.error("API Switch Table Error:", error);
        return res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
};
// ============================================================
// 🔥 API MỚI: TRẢ BÀN (KHÁCH VỀ) - KHÔNG XÓA ĐƠN
// ============================================================
exports.finishTableSession = async (req, res) => {
    try {
        const { id } = req.params; // ID đơn hàng
        const order = await DonHang.findById(id);
        
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
        
        // 1. Giải phóng bàn (Về trạng thái Trống)
        if (order.banId) {
            const updatedBan = await Ban.findByIdAndUpdate(
                order.banId,
                { trangThai: 'Trống', donHangHienTai: null, soKhach: 0 },
                { new: true }
            );

            // Báo socket để Sơ đồ bàn cập nhật màu xám ngay lập tức
            if (req.app.get('io')) {
                req.app.get('io').emit('banUpdated', updatedBan);
            }
        }
        
        // 2. Đơn hàng giữ nguyên (để lưu doanh thu), không xóa!
        
        res.json({ success: true, message: 'Đã trả bàn thành công.' });

    } catch (error) {
        console.error("Lỗi trả bàn:", error);
        res.status(500).json({ success: false, message: 'Lỗi server khi trả bàn' });
    }
};
// === API THỐNG KÊ DOANH THU HÔM NAY ===
exports.getDailyStats = async (req, res) => {
    try {
        // 1. NHẬN NGÀY TỪ FRONTEND (req.query.date)
        // Nếu không gửi gì lên thì mặc định lấy ngày hôm nay (new Date())
        const { date } = req.query;
        
        let queryDate;
        if (date) {
            queryDate = new Date(date); // Ví dụ: "2023-10-25"
        } else {
            queryDate = new Date(); // Hôm nay
        }

        // 2. Tính toán đầu ngày và cuối ngày của ngày được chọn
        // Lưu ý: Clone ra đối tượng mới để không bị sửa đổi lẫn lộn
        const startOfDay = new Date(queryDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(queryDate);
        endOfDay.setHours(23, 59, 59, 999);

        // --- CÁC PHẦN DƯỚI GIỮ NGUYÊN ---
        const orders = await DonHang.find({
            createdAt: { $gte: startOfDay, $lte: endOfDay },
            trangThaiThanhToan: 'Đã thanh toán', 
            status: { $ne: 'Đã hủy' }
        });

        // ... (Đoạn code tính toán vòng lặp forEach giữ nguyên như cũ) ...
        let totalRevenue = 0;
        let totalOrders = orders.length;
        let cashRevenue = 0;
        let onlineRevenue = 0;
        let hourlyRevenue = new Array(24).fill(0); 

        orders.forEach(order => {
            const money = order.totalPrice || 0;
            totalRevenue += money;
            
            // Kiểm tra phương thức thanh toán
            if (['cod', 'cash', 'Tiền mặt'].includes(order.paymentMethod)) {
                cashRevenue += money;
            } else {
                onlineRevenue += money;
            }

            const hour = new Date(order.createdAt).getHours();
            hourlyRevenue[hour] += money;
        });

        res.json({
            success: true,
            data: { totalRevenue, totalOrders, cashRevenue, onlineRevenue, hourlyRevenue }
        });

    } catch (error) {
        console.error("Lỗi thống kê:", error);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
};
exports.getDonHangById = async (req, res) => {
    try {
        // 👇 SỬA LẠI ĐÚNG TÊN FILE CỦA BẠN Ở ĐÂY 👇
        // (Lưu ý: Nếu file bạn viết hoa là DonHang.js thì sửa thành './models/DonHang')
        const DonHang = require('../models/donHang'); 
        
        console.log("🔍 Frontend đang hỏi trạng thái đơn:", req.params.id);

        const order = await DonHang.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        }
        
        // Trả về kết quả cho Frontend
        res.json(order); 

    } catch (error) {
        console.error("🔥 Lỗi lấy đơn hàng:", error);
        // Nếu lỗi do import sai file, nó sẽ báo rõ ở đây
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};
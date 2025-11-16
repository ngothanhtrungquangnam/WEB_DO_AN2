const DonHang = require('../models/donHang');
const MonAn = require('../models/monAn');
const Ban = require('../models/ban'); 

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

        // 6. Emit socket
        if (io) {
            io.emit('banUpdated', { _id: ban._id, soBan: ban.soBan, trangThai: ban.trangThai, donHangHienTai: ban.donHangHienTai });
            io.emit('new_order', populatedOrder);
        }

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

// === (ADMIN) THANH TOÁN COD TẠI QUẦY ===
// (ĐÃ SỬA: KHÔNG CẬP NHẬT STATUS, KHÔNG TRẢ BÀN)
exports.markOrderAsPaid = async (req, res) => {
    const { id } = req.params; 
    const io = req.app.get('io');
    try {
        const order = await DonHang.findById(id);
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        
        order.trangThaiThanhToan = 'Đã thanh toán';
        
        const updatedOrder = await order.save();
        const populatedOrder = await DonHang.findById(updatedOrder._id)
            .populate('items.itemId', 'name gia price')
            .populate('user', 'username')
            .populate('banId', 'soBan');
        
        if (io) io.emit('order_updated', populatedOrder);
        res.status(200).json(populatedOrder);
    } catch (error) {
        console.error("Lỗi khi cập nhật thanh toán:", error);
        res.status(500).json({ message: 'Lỗi server: ' + error.message });
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
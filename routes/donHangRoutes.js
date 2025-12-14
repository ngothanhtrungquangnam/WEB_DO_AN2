// File: routes/donHangRoutes.js
const express = require('express');
const router = express.Router();
const donHangController = require('../controllers/donHangController');
// const { protect, admin } = require('../middleware/authMiddleware'); // (Tạm thời vô hiệu hóa)

// === USER ROUTES ===
// POST /api/donhang/create (Tạo đơn hàng)
router.post('/create', donHangController.createNewOrder);

// GET /api/donhang/my-orders (Lấy TẤT CẢ đơn hàng của user - Cũ, chậm)
router.get('/my-orders', donHangController.getMyOrders); 

// GET /api/donhang/my-active (Lấy đơn đang xử lý - Nhanh, cho trang Tiến trình)
router.get('/my-active', donHangController.getMyActiveOrders);

// GET /api/donhang/my-finished (Lấy đơn đã xong - Nhanh, cho trang Lịch sử)
router.get('/my-finished', donHangController.getMyFinishedOrders);

// === ADMIN ROUTES ===
// GET /api/donhang (Lấy TẤT CẢ đơn hàng - cho trang danh sách Admin)
router.get('/', donHangController.getAllOrders); 

// GET /api/donhang/active-admin (Lấy đơn đang xử lý - Nhanh, cho Sơ đồ bàn)
router.get('/active-admin', donHangController.getAdminActiveOrders);

// GET /api/donhang/details/:id (Lấy chi tiết 1 đơn khi bấm vào bàn)
router.get('/details/:id', donHangController.getSingleOrderDetails);

// Thêm dòng này (đặt trước các route có :id để tránh bị nhầm)
router.get('/stats/daily', donHangController.getDailyStats);

// (Route mới cho Lịch sử ZaloPay)
router.get('/zalopay-history', donHangController.getZaloPayHistory);

// PATCH /api/donhang/status/:id (Cập nhật trạng thái: Mới, Đang xử lý...)
router.patch('/status/:id', donHangController.updateOrderStatus); 

// POST /api/donhang/mark-paid/:id (Cập nhật thanh toán COD)
router.post('/mark-paid/:id', donHangController.markOrderAsPaid); 

// DELETE /api/donhang/:id (Xóa đơn hàng)
router.delete('/:id', donHangController.deleteOrder); 

// (Route này có thể trùng với /my-orders, nhưng giữ lại)
// GET /api/donhang/user/:userId
router.get('/user/:userId', donHangController.getDonHangByUser);
// === ROUTE MỚI ĐỂ TRẢ BÀN ===
router.post('/release-table/:id', donHangController.releaseTableManually);
router.post('/update-item', donHangController.apiUpdateItem);
router.post('/switch-table', donHangController.apiSwitchTable);

router.put('/:id/pay', donHangController.markOrderAsPaid);       // API nút Thanh toán
router.put('/:id/finish', donHangController.finishTableSession); // API nút Trả bàn
router.get('/:id', donHangController.getDonHangById);
module.exports = router;
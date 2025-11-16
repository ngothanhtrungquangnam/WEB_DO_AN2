// File: routes/banRoutes.js
const express = require('express');
const router = express.Router();

// 1. Import Model, Controller và Middleware
const Ban = require('../models/ban');
const {
    getAllBan,
    releaseBan,     // <-- Import hàm mới
    updateSoKhach   // <-- Import hàm mới
} = require('../controllers/banController');
const { protect, isAdmin } = require('../middleware/authMiddleware'); // <-- Import middleware

// === API Routes ===

// Lấy danh sách tất cả bàn (cho sơ đồ) - Ai cũng xem được
router.get('/', getAllBan);

// Admin trả bàn (thanh toán) - Chỉ Admin
router.patch('/:id/release', protect, isAdmin, releaseBan);

// Admin cập nhật số khách - Chỉ Admin
router.patch('/:id/update-guests', protect, isAdmin, updateSoKhach);


// === Route Seed Data (Giữ nguyên) ===
router.get('/seed', async (req, res) => {
    try {
        await Ban.deleteMany({});
        console.log('Đã xóa bàn cũ...');

        const banArray = [];
        for (let i = 1; i <= 30; i++) {
            banArray.push({
                soBan: `Bàn ${i}`,
                trangThai: 'Trống',
                soKhach: 0
            });
        }

        await Ban.insertMany(banArray);
        console.log('Đã tạo 30 bàn mới!');

        res.status(201).json({ message: 'Thành công! 30 bàn đã được tạo.' });

    } catch (error) {
        console.error('Lỗi khi tạo bàn mẫu:', error);
        res.status(500).json({ message: 'Lỗi server khi tạo bàn', error: error.message });
    }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
// 1. Import thêm 'changePassword'
const { 
    registerUser, 
    loginUser, 
    logoutUser, 
    changePassword ,// <-- THÊM VÀO ĐÂY
    socialLogin,
    socialRegister,
    forgotPassword, // 👈 THÊM DÒNG NÀY
    resetPassword   // 👈 THÊM DÒNG NÀY
} = require('../controllers/authController');

// 2. Import middleware 'protect'
const { protect } = require('../middleware/authMiddleware');

// Route đăng ký
router.post('/register', registerUser);

// Route đăng nhập
router.post('/login', loginUser);
router.post('/social-login', socialLogin);

// Route đăng xuất
router.post('/logout', logoutUser);

// 3. THÊM ROUTE ĐỔI MẬT KHẨU
// (Middleware 'protect' sẽ chạy trước để lấy req.user)
router.post('/change-password', protect, changePassword);
// Route đăng ký qua Google/SĐT (Dùng cho form Đăng ký)
router.post('/social-register', socialRegister); // <--- THÊM DÒNG NÀY
router.post('/set-initial-password', authController.setInitialPassword);
router.post('/forgot-password', forgotPassword); // 🔥 QUAN TRỌNG
router.post('/reset-password', resetPassword);   // 🔥 QUAN TRỌNG
module.exports = router;
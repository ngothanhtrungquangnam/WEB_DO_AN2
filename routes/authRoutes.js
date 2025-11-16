const express = require('express');
const router = express.Router();

// 1. Import thêm 'changePassword'
const { 
    registerUser, 
    loginUser, 
    logoutUser, 
    changePassword // <-- THÊM VÀO ĐÂY
} = require('../controllers/authController');

// 2. Import middleware 'protect'
const { protect } = require('../middleware/authMiddleware');

// Route đăng ký
router.post('/register', registerUser);

// Route đăng nhập
router.post('/login', loginUser);

// Route đăng xuất
router.post('/logout', logoutUser);

// 3. THÊM ROUTE ĐỔI MẬT KHẨU
// (Middleware 'protect' sẽ chạy trước để lấy req.user)
router.post('/change-password', protect, changePassword);

module.exports = router;
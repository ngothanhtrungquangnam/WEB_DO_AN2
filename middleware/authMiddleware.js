// File: middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/user');

// ⚠️ QUAN TRỌNG: Key này PHẢI GIỐNG Y HỆT bên authController.js
const JWT_SECRET = process.env.JWT_SECRET || 'QUAN_AN_NGON_SECRET_KEY_123456';

// 1. Middleware xác thực (Protect)
const protect = async (req, res, next) => {
    let token;

    // Kiểm tra xem có token ở Header không (Dạng: Bearer <token>)
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Lấy token ra khỏi chuỗi "Bearer <token>"
            token = req.headers.authorization.split(' ')[1];

            // Giải mã Token
            const decoded = jwt.verify(token, JWT_SECRET);

            // 🔥 QUAN TRỌNG: Tìm user trong DB để đảm bảo user còn tồn tại
            // .select('-password') nghĩa là lấy user nhưng trừ trường mật khẩu ra
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'Không tìm thấy người dùng này (Có thể đã bị xóa)' });
            }

            next(); // Cho phép đi tiếp
        } catch (error) {
            console.error("Lỗi xác thực Token:", error.message);
            return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Không có token, vui lòng đăng nhập' });
    }
};

// 2. Middleware phân quyền Admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Không có quyền truy cập (Yêu cầu Admin)' });
    }
};

module.exports = { protect, isAdmin };
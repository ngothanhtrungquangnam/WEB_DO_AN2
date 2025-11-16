const jwt = require('jsonwebtoken');
const User = require('../models/user'); 

// 1. Hàm 'protect' - Middleware xác thực JWT
const protect = async (req, res, next) => {
    try {
        // Lấy token từ header Authorization (Bearer token)
        let token = req.header('Authorization');
        if (token && token.startsWith('Bearer ')) {
            token = token.split(' ')[1]; // Tách token sau 'Bearer '
        }

        if (!token) {
            // 401 Unauthorized
            return res.status(401).json({ message: 'Không có token, truy cập bị từ chối' });
        }

        // Verify token
        // Đảm bảo bạn đã đặt 'JWT_SECRET' trong file .env hoặc thay 'mysecret'
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecret');
        
        // Gán thông tin người dùng đã giải mã vào req.user (thường chứa { id, role })
        req.user = decoded; 

        next(); // Chuyển tiếp đến handler tiếp theo
    } catch (error) {
        console.error('Lỗi middleware auth:', error.message);
        // 401 Unauthorized
        res.status(401).json({ message: 'Token không hợp lệ' });
    }
};

// 2. Hàm 'isAdmin' - Middleware kiểm tra quyền Admin
const isAdmin = (req, res, next) => {
    // Hàm này phải chạy SAU hàm 'protect' để có req.user
    if (req.user && req.user.role === 'admin') {
        next(); // Cho phép đi tiếp
    } else {
        // 403 Forbidden
        res.status(403).json({ message: 'Không có quyền truy cập Admin' });
    }
};

// 3. Export: Xuất các hàm đã được định nghĩa ở trên
module.exports = { protect, isAdmin };
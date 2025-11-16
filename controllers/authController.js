// File: controllers/authController.js
const User = require('../models/user');
const jwt = require('jsonwebtoken');

// === Hàm tạo token (JWT) ===
function generateToken(id, role) {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'mysecret', { expiresIn: '1d' });
}

// === ĐĂNG KÝ TÀI KHOẢN MỚI ===
exports.registerUser = async (req, res) => {
  try {
    const { username, password } = req.body;


    if (!username || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
    }

    // ✅ Tạo user mới trong database
    const user = await User.create({ username, password});

    // ✅ Trả về dữ liệu thành công
    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
      },
      token: generateToken(user._id, user.role),
    });

  } catch (error) {
    console.error("🔥 Lỗi chi tiết khi đăng ký:", error); // log chi tiết ra console
    return res.status(500).json({ message: 'Lỗi đăng ký: ' + error.message });
  }
};

// === ĐĂNG NHẬP ===
exports.loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Người dùng không tồn tại' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Sai mật khẩu' });
    }

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
      },
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    console.error("🔥 Lỗi đăng nhập:", error);
    res.status(500).json({ message: 'Lỗi server khi đăng nhập: ' + error.message });
  }
};
exports.changePassword = async (req, res) => {
  try {
    console.log("==== CHANGE PASSWORD ====");
    console.log("req.user =", req.user);
    console.log("req.body =", req.body);

    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) {
      console.log("❌ Không có userId trong req.user");
      return res.status(401).json({ message: 'Không xác định được người dùng (token/req.user).' });
    }

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập đủ mật khẩu cũ và mới' });
    }

    // Lấy user + password từ DB
    const user = await User.findById(userId).select('+password');
    if (!user) {
      console.log("❌ Không tìm thấy user với id:", userId);
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    console.log("user.password (hash) =", user.password);

    const isMatch = await user.matchPassword(oldPassword);
    console.log("✅ So sánh mật khẩu:", oldPassword, "→ isMatch =", isMatch);

    if (!isMatch) {
      console.log("❌ Mật khẩu cũ không đúng");
      return res.status(401).json({ message: 'Mật khẩu cũ không đúng' });
    }

    // Nếu đến đây nghĩa là đúng
    user.password = newPassword;
    await user.save();

    console.log("✅ Đổi mật khẩu thành công cho user:", user.username);
    res.json({ success: true, message: 'Đổi mật khẩu thành công!' });

  } catch (error) {
    console.error("🔥 Lỗi đổi mật khẩu:", error);
    res.status(500).json({ message: 'Lỗi server khi đổi mật khẩu: ' + error.message });
  }
};


// === ĐĂNG XUẤT ===
exports.logoutUser = (req, res) => {
  res.json({ success: true, message: 'Đăng xuất thành công' });
};

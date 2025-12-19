// File: controllers/authController.js
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // ✅ Đảm bảo bcryptjs đã được import
// Key bí mật (Nên khớp với file middleware nếu có, hoặc để cố định để test)
const JWT_SECRET = process.env.JWT_SECRET || 'QUAN_AN_NGON_SECRET_KEY_123456';
const nodemailer = require('nodemailer');

// --- CẤU HÌNH GỬI MAIL (ĐÃ TỐI ƯU CHO RENDER) ---
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,            // Cổng 587 (Render cho phép)
    secure: false,        // Bắt buộc là false với cổng 587
    auth: {
        user: 'ngo178384@gmail.com',
        pass: 'kbdq yhky suxq zfxd' 
    },
    tls: {
        rejectUnauthorized: false // Tránh lỗi chứng chỉ SSL
    },
    family: 4, // 🔥 QUAN TRỌNG: Ép dùng IPv4 để tránh lỗi mạng treo trên Render
    connectionTimeout: 10000, // 🔥 Ngắt kết nối sau 10s nếu không được (để không bị treo mãi)
    greetingTimeout: 5000     // 🔥 Ngắt nếu Gmail không phản hồi sau 5s
});
// === Hàm tạo token (JWT) ===
function generateToken(id, role) {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '30d' });
}

// ==========================================
// 1. ĐĂNG KÝ TÀI KHOẢN MỚI (Dùng Email)
// ==========================================
exports.registerUser = async (req, res) => {
  try {
    // 👇 Nhận email thay vì username
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
    }

    // Kiểm tra trùng Email
   const userExists = await User.findOne({ email });
if (userExists) {
    // 🚨 THÔNG BÁO LỖI KHI ĐĂNG KÝ TÀI KHOẢN ĐÃ TỒN TẠI
    return res.status(400).json({ 
        message: 'Tài khoản này đã được đăng ký. Vui lòng chọn Đăng nhập.' 
    }); 
}

    // ✅ Tạo user mới (Mật khẩu sẽ tự mã hóa nhờ code trong model)
    const user = await User.create({ 
        email, 
        password,
        role: role || 'user' // Mặc định là user
    });

    // ✅ Trả về dữ liệu thành công
    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      // Trả về thông tin để frontend lưu
      token: generateToken(user._id, user.role),
      userId: user._id,
      email: user.email,
      username: user.email.split('@')[0], // Tự tạo username từ email để hiển thị
      role: user.role
    });

  } catch (error) {
    console.error("🔥 Lỗi đăng ký:", error);
    return res.status(500).json({ message: 'Lỗi đăng ký: ' + error.message });
  }
};

// ==========================================
// 2. ĐĂNG NHẬP (Dùng Email)
// ==========================================
exports.loginUser = async (req, res) => {
  try {
    // 👇 Nhận email thay vì username
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
    }

    // Tìm user theo Email
const user = await User.findOne({ email }).select('+password'); // Đã sửa lỗi 401
if (!user) {
    // 🚨 THÔNG BÁO LỖI KHI ĐĂNG NHẬP TÀI KHOẢN CHƯA TỒN TẠI
    return res.status(401).json({ 
        message: 'Tài khoản này chưa được đăng ký. Vui lòng chọn Đăng ký.' 
    });
}
console.log("------------------------------------------------");
        console.log("🔍 KIỂM TRA MẬT KHẨU:");
        console.log("👉 Email đang đăng nhập:", email);
        console.log("👉 Mật khẩu bạn nhập vào (Raw):", password);
        console.log("👉 Mật khẩu lưu trong DB (Hashed):", user.password);
        // Kiểm tra xem trong DB có phải là mã hóa không?
        const isHash = user.password && user.password.startsWith('$2');
        console.log("👉 Trong DB có phải dạng mã hóa không?:", isHash ? "CÓ (Tốt)" : "KHÔNG (Lỗi plaintext)");

        // So sánh trực tiếp tại đây để test
        const isMatchTest = await bcrypt.compare(password, user.password);
        console.log("👉 Kết quả so sánh bcrypt:", isMatchTest);
        console.log("------------------------------------------------");

    // So sánh mật khẩu (Hàm matchPassword đã có trong model)
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Sai mật khẩu' });
    }

    // ✅ Trả về thành công
    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token: generateToken(user._id, user.role),
      userId: user._id,
      email: user.email,
      username: user.email.split('@')[0], // Lấy phần trước @ làm tên hiển thị
      role: user.role,
    });

  } catch (error) {
    console.error("🔥 Lỗi đăng nhập:", error);
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};
// File: controllers/authController.js

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id || req.user.userId); 
    
    if (!userId) {
      return res.status(401).json({ message: 'Không xác định được người dùng.' });
    }

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập đủ mật khẩu cũ và mới' });
    }

    // 🔥 SỬA DÒNG NÀY: Thêm .select('+password') để lấy mật khẩu ra so sánh
    const user = await User.findById(userId).select('+password')

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Bây giờ user.password đã có dữ liệu, hàm này sẽ chạy đúng
    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mật khẩu cũ không đúng' });
    }

    // Lưu mật khẩu mới
    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Đổi mật khẩu thành công!' });

  } catch (error) {
    console.error("🔥 Lỗi đổi mật khẩu:", error);
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};
// ==========================================
// 4. ĐĂNG XUẤT
// ==========================================
exports.logoutUser = (req, res) => {
  res.json({ success: true, message: 'Đăng xuất thành công' });
};
// ==========================================
// 5. ĐĂNG NHẬP MẠNG XÃ HỘI (Google/Phone)
// Mục đích: CHỈ CHO PHÉP ĐĂNG NHẬP (CẤM TẠO MỚI)
// ==========================================
exports.socialLogin = async (req, res) => {
    try {
        const User = require('../models/user'); // Đảm bảo đã import User
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'QUAN_AN_NGON_SECRET_KEY_123456';

        const generateToken = (id, role) => {
            return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '30d' });
        };

        // Nhận dữ liệu từ Frontend
        let { email, name, photo, provider, uid, phoneNumber } = req.body;

        console.log("👉 Đang xử lý Social Login:", { email, provider, phoneNumber });

        // 1. Tìm user trong DB
        let user = await User.findOne({ email });

        if (!user) {
            // ✅ SỬA ĐỔI QUAN TRỌNG: Nếu KHÔNG tìm thấy user, báo lỗi (chặn tạo mới)
            return res.status(401).json({ 
                message: 'Tài khoản chưa được đăng ký! Vui lòng Đăng ký trước.' 
            });
        }
        
        // 2. Nếu đã có user -> Cho phép đăng nhập và cập nhật thông tin
        // Cập nhật thông tin nếu thiếu
        if (!user.avatar && photo) user.avatar = photo;
        if (phoneNumber && !user.phoneNumber) user.phoneNumber = phoneNumber;
        if (provider === 'google' && !user.googleId) user.googleId = uid;
        
        await user.save();

        // 3. Trả về Token
        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            token: generateToken(user._id, user.role),
            userId: user._id,
            email: user.email,
            username: user.fullName || user.email.split('@')[0],
            role: user.role,
            avatar: user.avatar
        });

    } catch (error) {
        console.error("🔥 Lỗi Social Login:", error);
        res.status(500).json({ message: "Chú ý: " + error.message });
    }
};
// ==========================================
// 6. ĐĂNG KÝ MẠNG XÃ HỘI (Google/Phone)
// Mục đích: TẠO MỚI tài khoản nếu chưa có (Upsert logic)
// ==========================================
// File: controllers/authController.js

exports.socialRegister = async (req, res) => {
    try {
        const User = require('../models/user'); 
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'QUAN_AN_NGON_SECRET_KEY_123456';

        const generateToken = (id, role) => {
            return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '30d' });
        };

        // 👇 NHẬN THÊM BIẾN actionType ('login' hoặc 'register')
        let { email, name, photo, provider, uid, phoneNumber, actionType } = req.body;

        console.log(`👉 Xử lý Social: ${provider} | Action: ${actionType} | Email: ${email}`);

        // 1. Tìm user trong DB
        let user = await User.findOne({ email });

        // 🔥 LOGIC KIỂM TRA CHẶT CHẼ (THEO YÊU CẦU CỦA BẠN) 🔥

        // TRƯỜNG HỢP 1: Khách đang đứng ở Form ĐĂNG KÝ
        if (actionType === 'register') {
            if (user) {
                // Nếu user đã tồn tại -> BÁO LỖI NGAY
                return res.status(400).json({ 
                    message: 'Tài khoản này đã tồn tại. Vui lòng chuyển sang Đăng nhập.' 
                });
            }
            // Nếu chưa có user -> Cho phép chạy tiếp xuống dưới để tạo mới...
        }

        // TRƯỜNG HỢP 2: Khách đang đứng ở Form ĐĂNG NHẬP
        if (actionType === 'login') {
            if (!user) {
                // Nếu user chưa tồn tại -> BÁO LỖI NGAY
                return res.status(400).json({ 
                    message: 'Bạn chưa có tài khoản, vui lòng đăng ký tài khoản.' 
                });
            }
            // Nếu có user -> Cho phép chạy tiếp xuống dưới để đăng nhập...
        }

        // ==========================================
        // PHẦN XỬ LÝ LOGIC LƯU DB (NHƯ CŨ)
        // ==========================================
        
        if (user) {
            // --- USER ĐÃ CÓ -> CẬP NHẬT & ĐĂNG NHẬP ---
            if (!user.avatar && photo) user.avatar = photo;
            if (phoneNumber && !user.phoneNumber) user.phoneNumber = phoneNumber;
            if (provider === 'google' && !user.googleId) user.googleId = uid;
             
            await user.save();

            // Kiểm tra xem đã có mật khẩu chưa để điều hướng Frontend
            // Nếu đã có mật khẩu -> Trả về token luôn
            if (user.hasPassword === true) {
                 return res.status(200).json({ 
                     success: true,
                     message: 'Đăng nhập thành công', 
                     token: generateToken(user._id, user.role),
                     userId: user._id,
                     email: user.email,
                     username: user.fullName || user.email.split('@')[0],
                     role: user.role,
                     avatar: user.avatar
                 });
            }
        } else {
             // --- USER CHƯA CÓ -> TẠO MỚI ---
             const randomPassword = Math.random().toString(36).slice(-8);
             user = await User.create({
                email, 
                password: randomPassword,
                fullName: name || phoneNumber, 
                avatar: photo || 'https://via.placeholder.com/150',
                role: 'user',
                authProvider: provider,
                googleId: provider === 'google' ? uid : undefined,
                phoneNumber: phoneNumber,
                hasPassword: false // Đánh dấu là chưa có pass thủ công
            });
        }

        // Trả về kết quả (Dùng cho tạo mới hoặc user cũ chưa set pass)
        res.status(201).json({ 
            success: true,
            message: 'Đăng ký thành công', 
            token: generateToken(user._id, user.role),
            userId: user._id,
            email: user.email,
            username: user.fullName || user.email.split('@')[0],
            role: user.role,
            avatar: user.avatar
        });

    } catch (error) {
        console.error("🔥 Lỗi Social Register:", error);
        res.status(500).json({ message: "Lỗi Server: " + error.message });
    }
};
// ==========================================
// 7. THIẾT LẬP MẬT KHẨU BAN ĐẦU (Dùng cho Social Login)
// ==========================================
// Chú ý: Hàm này yêu cầu bạn đã có thư viện bcryptjs được require ở đầu file.


exports.setInitialPassword = async (req, res) => {
    // Frontend sẽ gửi userId (đã lưu tạm) và mật khẩu mới
    const { userId, newPassword } = req.body; 
    
    if (!userId || !newPassword) {
        return res.status(400).json({ message: 'Thiếu thông tin người dùng hoặc mật khẩu.' });
    }
    
    try {
        // 🔥 LỖI 1: Mã hóa mật khẩu (bcrypt)
        // Mật khẩu này không thể dùng user.save() vì user này được tìm bằng findById, 
        // và bạn cần cập nhật cả hasPassword. Ta phải hash thủ công.
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        const user = await User.findByIdAndUpdate(userId, 
            {
                password: hashedPassword, // ✅ Lưu mật khẩu ĐÃ MÃ HÓA
                hasPassword: true         // ✅ Khắc phục Lỗi 2 & 3: Đặt trạng thái đã thiết lập
            }, 
            { new: true } // Trả về user đã cập nhật
        );

        if (!user) {
            return res.status(404).json({ message: 'User không tồn tại.' });
        }
        
        // Trả về thành công
        return res.status(200).json({ 
             success: true,
             message: 'Thiết lập mật khẩu thành công.', 
             userId: user._id 
        });

    } catch (error) {
        console.error("🔥 Lỗi thiết lập mật khẩu:", error);
        return res.status(500).json({ message: 'Lỗi server khi cập nhật mật khẩu.' });
    }
};
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    console.log("👉 Bắt đầu xử lý quên mật khẩu cho:", email); // Log 1

    try {
        const user = await User.findOne({ email });
        if (!user) {
            console.log("❌ Không tìm thấy email"); // Log 2
            return res.status(404).json({ message: 'Email này chưa được đăng ký.' });
        }

        const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; 
        await user.save();

        const mailOptions = {
            from: '"Quán Ăn Ngon" <ngo178384@gmail.com>',
            to: user.email,
            subject: 'Mã xác thực đổi mật khẩu',
            text: `Mã OTP của bạn là: ${resetToken}`
        };

        console.log("🚀 Đang gửi mail..."); // Log 3
        await transporter.sendMail(mailOptions);
        console.log("✅ Gửi mail thành công!"); // Log 4

        res.json({ success: true, message: 'Đã gửi mã OTP vào email!' });

    } catch (error) {
        console.error("🔥 LỖI GỬI MAIL:", error); // Log Lỗi
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();
        res.status(500).json({ message: 'Lỗi gửi email: ' + error.message });
    }
};


// 2. THAY THẾ TOÀN BỘ HÀM resetPassword CŨ BẰNG HÀM NÀY
exports.resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    console.log("---------------------------------------");
    console.log("🔍 DEBUG QUÊN MẬT KHẨU:");
    console.log("1️⃣ Dữ liệu bạn gửi lên:");
    console.log("   - Email:", email);
    console.log("   - OTP nhập vào:", otp);

    try {
        // Bước 1: Tìm xem User có tồn tại không (chỉ check email)
        const user = await User.findOne({ email });

        if (!user) {
            console.log("❌ LỖI: Không tìm thấy user nào có email này trong DB.");
            return res.status(400).json({ message: 'Email không tồn tại.' });
        }

        console.log("2️⃣ Dữ liệu đang có trong Database:");
        console.log("   - Token lưu trong DB:", user.resetPasswordToken);
        console.log("   - Thời gian hết hạn:", user.resetPasswordExpire);
        console.log("   - Thời gian hiện tại:", new Date());

        // Kiểm tra nguyên nhân lỗi
        if (!user.resetPasswordToken) {
            console.log("❌ LỖI CHÍNH: Trong DB không có Token! (Do chưa lưu được)");
            return res.status(400).json({ message: 'Lỗi hệ thống: Mã OTP chưa được lưu. Hãy thử gửi lại.' });
        }

        if (user.resetPasswordToken !== otp) {
            console.log(`❌ LỖI: Token không khớp! (DB: ${user.resetPasswordToken} vs Nhập: ${otp})`);
            return res.status(400).json({ message: 'Mã OTP không đúng.' });
        }

        if (user.resetPasswordExpire < Date.now()) {
            console.log("❌ LỖI: Mã OTP đã hết hạn!");
            return res.status(400).json({ message: 'Mã OTP đã hết hạn.' });
        }

        // Nếu mọi thứ OK -> Tiến hành đổi mật khẩu
        console.log("✅ HỢP LỆ! Tiến hành đổi mật khẩu...");
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await User.findByIdAndUpdate(user._id, {
            password: hashedPassword,
            resetPasswordToken: undefined,
            resetPasswordExpire: undefined
        });

        res.json({ success: true, message: 'Đổi mật khẩu thành công!' });

    } catch (error) {
        console.error("🔥 Lỗi Server:", error);
        res.status(500).json({ message: 'Lỗi server: ' + error.message });
    }
};
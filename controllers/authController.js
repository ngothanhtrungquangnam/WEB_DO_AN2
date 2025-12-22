// File: controllers/authController.js
const axios = require('axios');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'QUAN_AN_NGON_SECRET_KEY_123456';

// Helper function to generate JWT
function generateToken(id, role) {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '30d' });
}

// ==========================================
// 1. REGISTER NEW USER
// ==========================================
exports.registerUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ 
        message: 'Tài khoản này đã được đăng ký. Vui lòng chọn Đăng nhập.' 
      }); 
    }

    const user = await User.create({ 
        email, 
        password,
        role: role || 'user' 
    });

    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      token: generateToken(user._id, user.role),
      userId: user._id,
      email: user.email,
      username: user.email.split('@')[0], 
      role: user.role
    });

  } catch (error) {
    console.error("🔥 Lỗi đăng ký:", error);
    return res.status(500).json({ message: 'Lỗi đăng ký: ' + error.message });
  }
};

// ==========================================
// 2. LOGIN USER
// ==========================================
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ 
        message: 'Tài khoản này chưa được đăng ký. Vui lòng chọn Đăng ký.' 
      });
    }

    // Password verification logic
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Sai mật khẩu' });
    }

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token: generateToken(user._id, user.role),
      userId: user._id,
      email: user.email,
      username: user.email.split('@')[0],
      role: user.role,
    });

  } catch (error) {
    console.error("🔥 Lỗi đăng nhập:", error);
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// ==========================================
// 3. CHANGE PASSWORD
// ==========================================
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

    const user = await User.findById(userId).select('+password')

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mật khẩu cũ không đúng' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Đổi mật khẩu thành công!' });

  } catch (error) {
    console.error("🔥 Lỗi đổi mật khẩu:", error);
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// ==========================================
// 4. LOGOUT
// ==========================================
exports.logoutUser = (req, res) => {
  res.json({ success: true, message: 'Đăng xuất thành công' });
};

// ==========================================
// 5. SOCIAL LOGIN
// ==========================================
exports.socialLogin = async (req, res) => {
    try {
        const { email, name, photo, provider, uid, phoneNumber } = req.body;

        console.log("👉 Đang xử lý Social Login:", { email, provider, phoneNumber });

        let user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ 
                message: 'Tài khoản chưa được đăng ký! Vui lòng Đăng ký trước.' 
            });
        }
        
        if (!user.avatar && photo) user.avatar = photo;
        if (phoneNumber && !user.phoneNumber) user.phoneNumber = phoneNumber;
        if (provider === 'google' && !user.googleId) user.googleId = uid;
        
        await user.save();

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
// 6. SOCIAL REGISTER
// ==========================================
exports.socialRegister = async (req, res) => {
    try {
        let { email, name, photo, provider, uid, phoneNumber, actionType } = req.body;

        console.log(`👉 Xử lý Social: ${provider} | Action: ${actionType} | Email: ${email}`);

        let user = await User.findOne({ email });

        if (actionType === 'register') {
            if (user) {
                return res.status(400).json({ 
                    message: 'Tài khoản này đã tồn tại. Vui lòng chuyển sang Đăng nhập.' 
                });
            }
        }

        if (actionType === 'login') {
            if (!user) {
                return res.status(400).json({ 
                    message: 'Bạn chưa có tài khoản, vui lòng đăng ký tài khoản.' 
                });
            }
        }

        if (user) {
            if (!user.avatar && photo) user.avatar = photo;
            if (phoneNumber && !user.phoneNumber) user.phoneNumber = phoneNumber;
            if (provider === 'google' && !user.googleId) user.googleId = uid;
             
            await user.save();

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
                hasPassword: false 
            });
        }

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
// 7. SET INITIAL PASSWORD
// ==========================================
exports.setInitialPassword = async (req, res) => {
    const { userId, newPassword } = req.body; 
    
    if (!userId || !newPassword) {
        return res.status(400).json({ message: 'Thiếu thông tin người dùng hoặc mật khẩu.' });
    }
    
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        const user = await User.findByIdAndUpdate(userId, 
            {
                password: hashedPassword, 
                hasPassword: true 
            }, 
            { new: true } 
        );

        if (!user) {
            return res.status(404).json({ message: 'User không tồn tại.' });
        }
        
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
/// ==========================================
// 8. FORGOT PASSWORD (DÙNG GOOGLE SCRIPT - KHÔNG BAO GIỜ BỊ CHẶN)
// ==========================================
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    // 👇 ĐƯỜNG DẪN BẠN VỪA GỬI (Đã điền sẵn)
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyrj0Gf48ft46_C4a5_Oq13ejLaYEQkXiR0PQ7XbnQ7-7v0BGqnL4IxNcdZnempJ8sW/exec';

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'Email này chưa được đăng ký.' });
        }

        // Tạo OTP và lưu vào DB
        const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 phút
        await user.save({ validateBeforeSave: false });

        console.log("📧 Đang gửi lệnh sang Google Script...");

        // === GỬI QUA HTTP (AXIOS) ===
        // Gửi dữ liệu sang Script để nó tự gửi mail
        await axios.post(GOOGLE_SCRIPT_URL, {
            email: user.email,
            subject: 'Mã xác thực đổi mật khẩu - Quán Ăn Ngon',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #d35400;">Yêu cầu đổi mật khẩu</h2>
                    <p>Xin chào,</p>
                    <p>Bạn vừa yêu cầu đổi mật khẩu tại hệ thống Quán Ăn Ngon.</p>
                    <p>Mã OTP xác thực của bạn là:</p>
                    <h1 style="color: #e74c3c; letter-spacing: 5px;">${resetToken}</h1>
                    <p style="color: #7f8c8d;">Mã này có hiệu lực trong 15 phút. Tuyệt đối không chia sẻ mã này cho ai.</p>
                </div>
            `
        });

        console.log("✅ Đã gửi mail thành công!");
        res.json({ success: true, message: 'Đã gửi mã OTP. Vui lòng kiểm tra email!' });

    } catch (error) {
        console.error("🔥 Lỗi gửi mail:", error.message);
        // Nếu lỗi thì xóa token để người dùng thử lại
        if (user) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });
        }
        res.status(500).json({ message: 'Lỗi hệ thống mail: ' + error.message });
    }
};

exports.resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    console.log("\n========================================");
    console.log("🕵️ DEBUG: BẮT ĐẦU ĐỔI MẬT KHẨU");
    console.log("👉 Email:", email);
    console.log("👉 OTP Nhập vào:", otp, `(Kiểu: ${typeof otp})`);

    try {
        const user = await User.findOne({ email });

        if (!user) {
            console.log("❌ Lỗi: Không tìm thấy User");
            return res.status(404).json({ message: 'Email không tồn tại.' });
        }

        console.log("👉 OTP Trong DB:", user.resetPasswordToken, `(Kiểu: ${typeof user.resetPasswordToken})`);

        // --- KIỂM TRA 1: Token có tồn tại không? ---
        if (!user.resetPasswordToken) {
            console.log("❌ Lỗi: Không có Token trong DB -> DỪNG LẠI");
            return res.status(400).json({ message: 'Yêu cầu không hợp lệ.' });
        }

        // --- KIỂM TRA 2: SO SÁNH (QUAN TRỌNG NHẤT) ---
        // Chuyển cả 2 về chuỗi (String) và cắt khoảng trắng (trim) để so sánh chính xác tuyệt đối
        const dbToken = String(user.resetPasswordToken).trim();
        const inputToken = String(otp).trim();

        if (dbToken !== inputToken) {
            console.log("❌ PHÁT HIỆN SAI OTP! (Code phải dừng tại đây)");
            console.log(`   So sánh: '${dbToken}' KHÁC '${inputToken}'`);
            
            // 🔥 NẾU THIẾU CHỮ 'return' Ở ĐÂY -> NÓ SẼ CHẠY TIẾP XUỐNG DƯỚI 🔥
            return res.status(400).json({ message: 'Mã OTP không đúng.' });
        }

        // --- KIỂM TRA 3: Hết hạn ---
        if (user.resetPasswordExpire < Date.now()) {
            console.log("❌ Lỗi: Token hết hạn -> DỪNG LẠI");
            return res.status(400).json({ message: 'Mã OTP đã hết hạn.' });
        }

        // --- NẾU CHẠY ĐẾN ĐÂY TỨC LÀ OTP ĐÚNG ---
        console.log("✅ OTP Hợp lệ -> Tiến hành lưu mật khẩu mới...");

        // Gán mật khẩu thô (Model sẽ tự mã hóa)
        user.password = newPassword; 
        
        // Dọn dẹp token
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        user.hasPassword = true;

        await user.save(); 

        console.log("🎉 ĐÃ LƯU VÀO DB THÀNH CÔNG!");
        console.log("========================================\n");
        
        res.json({ success: true, message: 'Đổi mật khẩu thành công!' });

    } catch (error) {
        console.error("🔥 Lỗi Server:", error);
        res.status(500).json({ message: 'Lỗi server: ' + error.message });
    }
};
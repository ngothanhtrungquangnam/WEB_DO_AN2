// File: models/user.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email là bắt buộc'],
      unique: true,
      trim: true,
      lowercase: true,
    }, // 👈 Đóng ngoặc email tại đây

    // 🔥 SỬA: Đưa 2 trường này ra ngoài (Ngang hàng với email)
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    password: {
      type: String,
      required: [true, 'Mật khẩu là bắt buộc'],
      select: false,
    },
    
    role: {
      type: String,
      enum: ["admin", "staff", "user"], 
      default: "user" 
    },
    
    // Các trường thông tin cá nhân
    fullName: String,       
    avatar: String,         
    phoneNumber: String,    
    
    hasPassword: {
        type: Boolean,
        default: false
    },

    googleId: String,      
  
    authProvider: { 
        type: String, 
        default: 'local' 
    }
  },
  { timestamps: true }
);

// === Mã hóa mật khẩu (GIỮ NGUYÊN) ===
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// === So sánh mật khẩu (GIỮ NGUYÊN) ===
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
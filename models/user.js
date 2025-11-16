// File: models/user.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Tên đăng nhập là bắt buộc'],
      unique: true,
      trim: true,
      minlength: [3, 'Tên đăng nhập phải có ít nhất 3 ký tự']
    },
    password: {
      type: String,
      required: [true, 'Mật khẩu là bắt buộc'],
      minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự']
    },
    role: {
      type: String,
    enum: ["admin", "staff", "user"], // ✅ Cho phép "user"
        default: "user"                   // ✅ Mặc định là "user"
    }
  },
  { timestamps: true }
);

// === Mã hóa mật khẩu trước khi lưu ===
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});


// === So sánh mật khẩu nhập vào với mật khẩu đã mã hóa ===
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// === Ẩn mật khẩu khi trả về JSON ===
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
    
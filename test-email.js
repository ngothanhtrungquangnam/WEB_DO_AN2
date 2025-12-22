// File: test-email.js
const nodemailer = require('nodemailer');

// 👇 ĐIỀN TRỰC TIẾP THÔNG TIN CỦA BẠN VÀO ĐÂY ĐỂ TEST 👇
const MY_EMAIL = 'ngothanhtrung0220@gmail.com';
const MY_APP_PASSWORD = 'gyct zbiy nwun ulab'; 

async function main() {
    console.log("🚀 Đang thử kết nối tới Gmail...");

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: MY_EMAIL,
            pass: MY_APP_PASSWORD
        }
    });

    try {
        // Kiểm tra kết nối
        await transporter.verify();
        console.log("✅ KẾT NỐI SMTP THÀNH CÔNG! (Tài khoản & Mật khẩu đúng)");

        // Gửi thử
        console.log("📨 Đang gửi mail test...");
        const info = await transporter.sendMail({
            from: '"Test Debug" <' + MY_EMAIL + '>',
            to: MY_EMAIL, // Gửi cho chính mình
            subject: "Render Test Success",
            text: "Nếu bạn đọc được dòng này thì Server Render đã gửi mail thành công!",
        });

        console.log("🎉 GỬI THÀNH CÔNG! Message ID:", info.messageId);
    } catch (error) {
        console.error("🔥 LỖI KẾT NỐI:", error);
        
        if (error.code === 'EAUTH') {
            console.log("👉 Nguyên nhân: Sai Email hoặc Mật khẩu ứng dụng.");
        } else if (error.code === 'ETIMEDOUT') {
            console.log("👉 Nguyên nhân: Google chặn IP của Render hoặc Tường lửa.");
        }
    }
}

main();
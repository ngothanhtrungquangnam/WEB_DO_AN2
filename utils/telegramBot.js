// File: utils/telegramBot.js
const https = require('https');

// Token và Chat ID của bạn (Đã điền sẵn)
const BOT_TOKEN = '8147916467:AAHO8OPckpuCo1Ok0R43ancEQO9TL9kzNss'; 
const ADMIN_CHAT_ID = '7219225363'; 

const sendTelegram = (message) => {
    // Mã hóa tin nhắn để gửi được tiếng Việt và ký tự đặc biệt
    const text = encodeURIComponent(message);
    
    // Đường dẫn gửi tin nhắn của Telegram
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${ADMIN_CHAT_ID}&text=${text}&parse_mode=HTML`;

    // Gửi yêu cầu đi (dùng thư viện https có sẵn của Node.js)
    https.get(url, (res) => {
        // Log kết quả ra màn hình đen để bạn biết là đã gửi
        if (res.statusCode === 200) {
            console.log("✅ [Telegram] Đã gửi thông báo thành công!");
        } else {
            console.error(`❌ [Telegram] Lỗi gửi tin. Mã lỗi: ${res.statusCode}`);
        }
    }).on('error', (e) => {
        console.error("❌ [Telegram] Lỗi kết nối mạng:", e.message);
    });
};

// Xuất hàm này ra để file khác (aiChatController) dùng được
module.exports = { sendTelegram };
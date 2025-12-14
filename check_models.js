// File: scan_key.js
const https = require('https');

// 👇 DÁN KEY MỚI CỦA BẠN VÀO ĐÂY
const YOUR_API_KEY = "AIzaSyAPxOOrgXSOWcX4zef-0_eniD8mNfSWReI"; 

console.log("---------------------------------------------------");
console.log("🕵️ ĐANG KẾT NỐI TRỰC TIẾP ĐẾN SERVER GOOGLE...");
console.log("---------------------------------------------------");

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${YOUR_API_KEY}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            
            if (json.error) {
                console.log("❌ LỖI KEY:", json.error.message);
                console.log("=> Key này bị sai hoặc chưa kích hoạt API.");
            } else if (!json.models) {
                console.log("⚠️ Key hợp lệ nhưng KHÔNG CÓ MODEL NÀO được cấp quyền.");
            } else {
                console.log("✅ DANH SÁCH MODEL KEY NÀY DÙNG ĐƯỢC:");
                console.log("   (Hãy copy chính xác 1 trong các tên dưới đây vào code)");
                console.log("---------------------------------------------------");
                
                let foundStandard = false;
                json.models.forEach(m => {
                    const name = m.name.replace('models/', '');
                    // Chỉ liệt kê các model chat
                    if (m.supportedGenerationMethods.includes("generateContent")) {
                        console.log(`👉 ${name}`);
                        if (name === 'gemini-1.5-flash' || name === 'gemini-pro') foundStandard = true;
                    }
                });

                console.log("---------------------------------------------------");
                if (foundStandard) {
                    console.log("🌟 TỐT! Tài khoản này là TÀI KHOẢN THƯỜNG (Ổn định).");
                    console.log("=> Hãy dùng model: 'gemini-1.5-flash'");
                } else {
                    console.log("💀 CẢNH BÁO: Tài khoản này là EARLY ACCESS (Dùng thử).");
                    console.log("=> Bạn chỉ thấy toàn gemini-2.0 hoặc 2.5 đúng không?");
                    console.log("=> Loại này chỉ cho 20 tin/ngày. BẠN CẦN ĐỔI GMAIL KHÁC NGAY.");
                }
            }
        } catch (e) {
            console.log("Lỗi parse JSON:", e.message);
        }
    });
}).on("error", (err) => {
    console.log("Lỗi mạng:", err.message);
});
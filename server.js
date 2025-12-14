// File: server.js
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');


const TELEGRAM_BOT_TOKEN = '8147916467:AAHO8OPckpuCo1Ok0R43ancEQO9TL9kzNss'; 
const TELEGRAM_CHAT_ID = '7219225363';
// === 1. Import Models (BẮT BUỘC THÊM DÒNG NÀY) ===
// Để dùng được trong hàm Webhook bên dưới
// Hãy kiểm tra kỹ file model của bạn tên là 'Order.js' hay 'DonHang.js'
const Order = require('./models/donHang'); 

// === 2. Import Routes ===
const monAnRoutes = require('./routes/monAnRoutes');
const donHangRoutes = require('./routes/donHangRoutes');
const authRoutes = require('./routes/authRoutes');
const banRoutes = require('./routes/banRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const aiRoutes = require('./routes/aiRoutes'); // Route cho Chatbot AI Studio mới

// === 3. App Setup ===
const app = express();
const server = http.createServer(app);

// Hàm gửi tin nhắn (dùng chung)
const sendTelegramMessage = async (message) => {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        console.log("✅ Đã gửi thông báo Telegram");
    } catch (error) {
        console.error("Lỗi gửi Telegram:", error.message);
    }
};
// Cấu hình Socket.IO
const io = new Server(server, {
  cors: {
   origin: [
    'https://web-do-an2.onrender.com',
        'http://localhost:3000' // Để test cục bộ
    ],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
  },
});

app.use((req, res, next) => {
    req.io = io;
    next();
});

// === 4. Environment & Database ===
const PORT = process.env.PORT || 3000;
connectDB();

// === 5. Middleware ===
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Gán io vào app thay vì req
app.set('io', io);

// THÊM: Sử dụng Helmet để thiết lập các tiêu đề bảo mật
app.use(helmet({
  // 🔥 SỬA DÒNG NÀY: Đặt thành false để tắt kiểm tra COOP
  // Điều này giúp Firebase kiểm tra được cửa sổ Popup Google mà không báo lỗi đỏ
  crossOriginOpenerPolicy: false, 
  
  // Giữ nguyên dòng này
  crossOriginEmbedderPolicy: false, 
}));
// ============================================================
// === 6. API ROUTES (Đặt tất cả API lên trên cùng) ===
// ============================================================

app.use('/api/mon-an', monAnRoutes);
app.use('/api/monan', monAnRoutes);  // Fix lỗi Frontend cũ
app.use('/api/auth', authRoutes); 
app.use('/api/donhang', donHangRoutes);
app.use('/api/ban', banRoutes); 
app.use('/api/payment', paymentRoutes);
app.use('/api/ai-chat', aiRoutes);   // API Chatbot AI

// 🔥 WEBHOOK CASSO (ĐÃ NÂNG CẤP)
app.post('/api/casso', async (req, res) => {
    try {
        console.log("👉 [CASSO] Nhận được Webhook...");
        const { data } = req.body;

        if (!data || data.length === 0) {
            return res.status(400).json({ message: "Không có dữ liệu" });
        }

        for (const giaoDich of data) {
            const noiDungCK = giaoDich.description; 
            const soTien = giaoDich.amount;

            console.log(`💰 Giao dịch: ${soTien} VNĐ - Nội dung: ${noiDungCK}`);

            // Tách mã đơn hàng
            const match = noiDungCK.match(/[a-fA-F0-9]{24}/); 
            
            if (match) {
                const maDonHang = match[0].toLowerCase(); 
                console.log("📦 Tìm thấy mã đơn hàng:", maDonHang);

                // --- CẬP NHẬT DATABASE ---
                const updatedOrder = await Order.findByIdAndUpdate(
                    maDonHang, 
                    { 
                        $set: {
                            status: 'Mới',              
                            trangThaiThanhToan: 'Đã thanh toán', 
                            paymentMethod: 'banking',    
                            paymentDate: new Date()
                        },
                        $inc: {
                            amountPaid: soTien // Cộng dồn tiền
                        }
                    }, 
                    { new: true }
                );
                
                if (updatedOrder) {
                    console.log(`✅ CẬP NHẬT THÀNH CÔNG! Đơn hàng ${maDonHang} -> PAID`);
                    
                    // 1. Gửi Socket realtime
                    io.to('admin_chat_room').emit('order:updated', updatedOrder);
                    io.emit('SERVER_UPDATE_ORDER', { orderId: maDonHang }); // Reload cho các client khác

                    // 🔥🔥🔥 2. GỬI TELEGRAM (CODE MỚI) 🔥🔥🔥
                    try {
                        // Gọi lại DB để lấy tên bàn và tên món (populate)
                        const fullOrder = await Order.findById(maDonHang)
                            .populate('banId', 'soBan')
                            .populate('items.itemId', 'name');

                        if (fullOrder) {
                            const tenBan = fullOrder.banId ? fullOrder.banId.soBan : 'Mang về';
                            const tongTien = fullOrder.totalPrice.toLocaleString('vi-VN');
                            const tienVuaVao = soTien.toLocaleString('vi-VN');
                            const daTra = fullOrder.amountPaid.toLocaleString('vi-VN');

                            let msg = `🔔 <b>KHÁCH ĐÃ CHUYỂN KHOẢN!</b>\n`;
                            msg += `--------------------------------\n`;
                            msg += `🪑 <b>Vị trí:</b> ${tenBan}\n`;
                            msg += `👤 <b>Khách:</b> ${fullOrder.customerName}\n`;
                            msg += `💸 <b>Vừa chuyển:</b> +${tienVuaVao}đ\n`;
                            msg += `💰 <b>Tổng đã trả:</b> ${daTra}/${tongTien}đ\n`;
                            msg += `📝 <b>Chi tiết món:</b>\n`;
                            
                            fullOrder.items.forEach(item => {
                                const tenMon = item.itemId ? item.itemId.name : 'Món đã xóa';
                                msg += `- ${tenMon} (x${item.quantity})\n`;
                            });

                            sendTelegramMessage(msg);
                        }
                    } catch (teleErr) {
                        console.error("Lỗi tạo tin nhắn Telegram:", teleErr);
                    }
                    // 🔥🔥🔥 KẾT THÚC PHẦN TELEGRAM 🔥🔥🔥

                } else {
                    console.log(`❌ LỖI: Có ID ${maDonHang} nhưng không tìm thấy trong Database`);
                }

            } else {
                console.log("⚠️ Không tìm thấy mã đơn hàng trong nội dung chuyển khoản");
            }
        }

        return res.status(200).json({ error: 0, message: "Ok" });

    } catch (error) {
        console.error("🔥 Lỗi xử lý webhook:", error);
        return res.status(500).json({ error: 1, message: "Lỗi server" });
    }
});


// ============================================================
// === 7. SOCKET.IO REALTIME LOGIC (Giữ nguyên) ===
// ============================================================

const ADMIN_ROOM = 'admin_chat_room';

io.on('connection', (socket) => {
  console.log(`🔌 Client kết nối: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`❌ Client ngắt kết nối: ${socket.id}`);
  });

  // Logic Admin Join Room
  socket.on('admin:joinRoom', () => {
      socket.join(ADMIN_ROOM);
      console.log(`[Admin] Admin ${socket.id} đã tham gia ${ADMIN_ROOM}`);
  });

  // Logic Admin trả lời tin nhắn
  socket.on('admin:sendMessage', (data) => {
      console.log(`[Admin Chat] Admin ${socket.id} trả lời ${data.targetSocketId}: ${data.message}`);

      const messagePacket = {
        user: data.user, 
        message: data.message
      };

      // Gửi tới User
      io.to(data.targetSocketId).emit('chat:receiveMessage', messagePacket);
      
      // Gửi lại vào phòng Admin để hiển thị
      io.to(ADMIN_ROOM).emit('chat:receiveMessage', messagePacket);
  });
});


// ============================================================
// === 8. FRONTEND ROUTES (Giữ nguyên toàn bộ) ===
// ============================================================

app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/order', (req, res) => res.sendFile(path.join(__dirname, 'public', 'order.html')));

// Các file mới thêm
app.get('/order-history.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'order-history.html')));
app.get('/order-progress.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'order-progress.html')));
app.get('/admin-ban.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin-ban.html')));
app.get('/admin-zalopay-history.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin-zalopay-history.html')));
app.get('/gateway-mock.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'gateway-mock.html')));

app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'public', 'profile.html')));
app.get('/payment-result', (req, res) => res.sendFile(path.join(__dirname, 'public', 'payment-result.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// === 9. Catch-All Route (BẮT BUỘC ĐỂ CUỐI CÙNG) ===
// Để tránh việc nó chặn mất các API ở trên
app.get('*', (req, res) => {
  if (req.url.startsWith('/api')) {
    return res.status(404).json({ message: `API Endpoint ${req.url} Not Found.` });
  }
  res.redirect('/');
});

// === 10. Start Server ===
server.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại: http://localhost:${PORT}`);
});
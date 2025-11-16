// File: server.js
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// 1. IMPORT SERVICE MỚI
const { sendToDialogflow } = require('./services/dialogflowService'); 
const { getOrderStatus, getFeaturedMenu } = require('./data/restaurantData');
// === Import Routes ===
const monAnRoutes = require('./routes/monAnRoutes');
const donHangRoutes = require('./routes/donHangRoutes');
const authRoutes = require('./routes/authRoutes');
const banRoutes = require('./routes/banRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
// === App Setup ===
const app = express();
const server = http.createServer(app);

// Cấu hình Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
  },
});

// === Environment ===
const PORT = process.env.PORT || 3000;

// === Kết nối MongoDB ===
connectDB();

// === Middleware ===
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Gán io vào app thay vì req
app.set('io', io);

// === API Routes ===
app.use('/api/mon-an', monAnRoutes);
app.use('/api/auth', authRoutes); 
app.use('/api/donhang', donHangRoutes);
app.use('/api/ban', banRoutes); 
app.use('/api/payment', paymentRoutes);

// === Socket.IO xử lý realtime ===

// Định nghĩa một "room" (phòng) riêng cho Admin
const ADMIN_ROOM = 'admin_chat_room';

io.on('connection', (socket) => {
  console.log(`🔌 Client kết nối: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`❌ Client ngắt kết nối: ${socket.id}`);
  });

  // === LOGIC CHO ADMIN ===
  // 1. Khi Admin kết nối, họ phải tham gia vào phòng Admin
  socket.on('admin:joinRoom', () => {
      socket.join(ADMIN_ROOM);
      console.log(`[Admin] Admin ${socket.id} đã tham gia ${ADMIN_ROOM}`);
  });

  // 2. Khi Admin gửi tin nhắn trả lời (BỎ QUA BOT)
  socket.on('admin:sendMessage', (data) => {
      // data phải chứa: { 
      //   targetSocketId: "id_cua_user_can_nhan", 
      //   message: "noi_dung_tra_loi",
      //   user: "Ten_Admin_Vi_Du_NgoTrung"
      // }
      
      console.log(`[Admin Chat] Admin ${socket.id} trả lời ${data.targetSocketId}: ${data.message}`);

      // Tạo gói tin nhắn để gửi đi
      const messagePacket = {
        user: data.user, // Tên Admin (NgoTrung)
        message: data.message
      };

      // Gửi tin nhắn này TỚI USER CỤ THỂ
      io.to(data.targetSocketId).emit('chat:receiveMessage', messagePacket);
      
      // Gửi tin nhắn này VÀO PHÒNG ADMIN (để admin thấy tin nhắn của chính mình)
      io.to(ADMIN_ROOM).emit('chat:receiveMessage', messagePacket);
  });


// Thay thế toàn bộ khối socket.on('user:sendMessage', ...) trong server.js

// === LOGIC CHO USER (ĐI QUA BOT) ===
socket.on('user:sendMessage', async (data) => {
    const userMessage = data.message;
    const sessionId = socket.id;
    
    console.log(`[User Chat] Tin nhắn từ ${data.user} (${sessionId}): ${userMessage}`);

    // A. GỬI LẠI TIN NHẮN GỐC CHO CHÍNH USER ĐÓ
    socket.emit('chat:receiveMessage', data); 
    
    // B. GỬI TIN NHẮN CHO BOT (DIALOGFLOW)
    const botResult = await sendToDialogflow(userMessage, sessionId);
    const intentName = botResult.intent.displayName;
    let botReplyMessage = botResult.fulfillmentText; // Câu trả lời mặc định từ Dialogflow

    // C. XỬ LÝ FULFILLMENT (LOGIC NÂNG CAO)
    if (botResult && botResult.intent && !botResult.intent.isFallback) {
        
        switch (intentName) {
            case 'Kiểm tra trạng thái đơn hàng':
                {
                    // Lấy tham số (parameter) là Order ID từ Dialogflow
                    const orderId = botResult.parameters.fields.order_number?.stringValue;
                    
                    if (orderId) {
                        // Gọi hàm kiểm tra trạng thái đơn hàng
                        botReplyMessage = getOrderStatus(orderId);
                    } else {
                        // Trường hợp này không xảy ra nếu Intent được cấu hình là Required
                        botReplyMessage = botResult.fulfillmentText;
                    }
                }
                break;
            
            case 'Giới thiệu món ăn':
                // Gọi hàm lấy thực đơn
                botReplyMessage = getFeaturedMenu();
                break;
            
            default:
                // Dùng câu trả lời mặc định từ Dialogflow
                break;
        }

        const botReply = {
            user: 'BotNhaHang', 
            message: botReplyMessage
        };
        // Gửi câu trả lời đã được xử lý (Fulfillment) của bot CHO CHÍNH USER ĐÓ
        socket.emit('chat:receiveMessage', botReply);

    } else {
        // *** BOT KHÔNG HIỂU (Fallback) HOẶC LỖI ***
        console.log("Bot không hiểu. Chuyển cho admin.");
        
        const fallbackReply = {
            user: 'BotNhaHang',
            message: botResult.fulfillmentText || 'Xin lỗi, tôi chưa hiểu. Tôi đã chuyển câu hỏi này tới Admin, bạn vui lòng chờ trong giây lát.'
        };
        
        // Gửi câu trả lời "không hiểu" CHO CHÍNH USER ĐÓ
        socket.emit('chat:receiveMessage', fallbackReply);
        
        // Gửi tin nhắn GỐC của user VÀO PHÒNG ADMIN
        const dataForAdmin = {
            ...data,
            userSocketId: sessionId
        };
        io.to(ADMIN_ROOM).emit('chat:needsAdmin', dataForAdmin);
    }
});
});

// === Phục vụ các trang frontend ===
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ... (Các route khác giữ nguyên)

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/order', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'order.html'));
});

// (Thêm các route cho file mới)
app.get('/order-history.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'order-history.html'));
});

app.get('/order-progress.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'order-progress.html'));
});

app.get('/admin-ban.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-ban.html'));
});

app.get('/admin-zalopay-history.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-zalopay-history.html'));
});

app.get('/gateway-mock.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'gateway-mock.html'));
});
// (Hết route file mới)

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/payment-result', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'payment-result.html'));
});

// Trang chủ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// === Bắt tất cả các đường dẫn không xác định ===
app.get('*', (req, res) => {
  if (req.url.startsWith('/api')) {
    return res.status(404).json({ message: `API Endpoint ${req.url} Not Found.` });
  }
  res.redirect('/');
});

// === Khởi chạy server ===
server.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại: http://localhost:${PORT}`);
});
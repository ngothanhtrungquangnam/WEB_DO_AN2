const OpenAI = require("openai"); 
const mongoose = require('mongoose');
const MonAn = require('../models/monAn');
const Ban = require('../models/ban');
const DonHang = require('../models/donHang');
const User = require('../models/user'); 
const StoreSettings = require('../models/storeSettings'); 
const { sendTelegram } = require('../utils/telegramBot'); 

require('dotenv').config();



// ============================================================
// 🔥 1. CẤU HÌNH MULTI-KEY GROQ (XOAY VÒNG KEY) 🔥
// ============================================================

const GROQ_KEYS = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4
].filter(Boolean); // lọc key bị undefined
    
// Biến theo dõi key nào đang được dùng (Bắt đầu từ 0)
let currentKeyIndex = 0;

// Model sử dụng (Khuyên dùng 8b để test cho nhanh và ít bị limit)
const MODEL_NAME = "llama-3.1-8b-instant"; 
// const MODEL_NAME = "llama-3.3-70b-versatile"; // Khi nào chạy thật thì bật cái này

console.log(`🤖 Model đã chọn: ${MODEL_NAME}`);

// Hàm lấy client tương ứng với key hiện tại
const getGroqClient = () => {
    const key = GROQ_KEYS[currentKeyIndex];
    // console.log(`🔑 Đang dùng Key [${currentKeyIndex}]`); // Bỏ comment nếu muốn xem log
    return new OpenAI({
        apiKey: key,
        baseURL: "https://api.groq.com/openai/v1"
    });
};

// Hàm tự động đổi Key khi gặp lỗi
const switchNextKey = () => {
    currentKeyIndex = (currentKeyIndex + 1) % GROQ_KEYS.length;
    console.log(`⚠️ Phát hiện Limit! Đang chuyển sang Key [${currentKeyIndex}]...`);
};

console.log(`🤖 Model đã chọn: ${MODEL_NAME}`);
console.log("------------------------------------------------");

// --- 2. CÁC HÀM TIỆN ÍCH ---



// ============================================================
// 🔥 HÀM GỌI API THÔNG MINH (AUTO RETRY) 🔥
// ============================================================
async function callGroqWithRetry(messages) {
    let attempts = 0;
    const maxAttempts = GROQ_KEYS.length; 

    while (attempts < maxAttempts) {
        
      
        

        try {
            console.log(`🚀 Đang gửi request bằng Key [${currentKeyIndex}]...`); // Log để theo dõi
            const groq = getGroqClient(); 
            
            const completion = await groq.chat.completions.create({
          
                messages: messages,
                model: MODEL_NAME,
                temperature: 0.6, // Vui vẻ, sáng tạo
                max_tokens: 1000,
                response_format: { type: "json_object" }
            });
            
            return completion; // Thành công thì trả về kết quả ngay

        } catch (error) {
            // Nếu lỗi là 429 (Too Many Requests) -> Đổi key và thử lại
            if (error.status === 429) {
                console.error(`❌ Key [${currentKeyIndex}] bị hết hạn mức (429).`);
                switchNextKey(); // Đổi sang key tiếp theo
                attempts++;      // Tăng số lần thử
            } else {
                // Nếu là lỗi khác (VD: lỗi code, lỗi mạng) -> Báo lỗi luôn
                throw error;
            }
        }
    }
    throw new Error("💀 Tất cả các Key đều đã bị hết hạn mức (Rate Limit)!");
}

function xoaDauTiengViet(str) {
    if (!str) return "";
    str = str.toLowerCase();
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/\s+/g, ""); 
    return str;
}

// --- 3. CÁC HÀM LẤY DỮ LIỆU ---
const getStoreInfoFromDB = async () => {
    try {
        let settings = await StoreSettings.findOne();
        if (!settings) settings = { name: "Bếp Nhà FoodBot", address: "...", hotline: "...", wifiName: "", wifiPass: "", openHours: "", features: "", note: "" };
        
        // 🔥 NÂNG CẤP: Thêm thời gian hiện tại để Bot biết giờ giấc
        const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
        
        return `
    - Thời gian hiện tại: ${now}
    - Tên quán: Quán Ăn Ngon
    - Địa chỉ: 54 Đường Nguyễn Lương Bằng ,Đà Nẳng 
    - Hotline: 0909.888.999
    - Wifi: "Quán Ăn ngon" / Pass: "66668888"
    - Giờ mở cửa: 07:00 - 22:30 hàng ngày
    - Lưu ý: Giá trên menu đã bao gồm VAT 8%
    `;
    } catch (e) { return ""; }
};

const getContextFromDB = async () => {
    try {
        const foods = await MonAn.find({});
        // Thêm ID để AI phân biệt chính xác hơn nếu tên giống nhau
        const menuString = foods.map(f => `🍽️ ${f.name} (${f.price.toLocaleString()}đ)`).join('\n'); 

        const tables = await Ban.find({});
        const banCoKhach = tables.filter(t => t.trangThai && (t.trangThai.toLowerCase().includes('phục vụ') || t.trangThai.toLowerCase().includes('có khách')));
        const banTrong = tables.filter(t => !banCoKhach.find(b => b._id.equals(t._id)));

        const tableString = `
        - Bàn đang phục vụ: ${banCoKhach.map(t => t.soBan).join(', ')}
        - Bàn trống: ${banTrong.map(t => t.soBan).join(', ')}
        `;
        return { menuString, tableString };
    } catch (err) { return { menuString: "", tableString: "" }; }
};

// 🔥 HÀM PHÂN TÍCH LỊCH SỬ (QUAN TRỌNG ĐỂ NHỚ KHÁCH)
const analyzeUserHistory = async (userId) => {
    if (!userId) return "Khách vãng lai (Chưa có dữ liệu cũ).";
    try {
        // Lấy 20 đơn gần nhất
        const orders = await DonHang.find({ user: userId, status: { $ne: 'Đã hủy' } }).sort({ createdAt: -1 }).limit(20).populate('items.itemId');
        
        if (orders.length === 0) return "Khách mới (Lần đầu đến quán). Hãy chào mừng nhiệt tình!";
        
        let foodCount = {};
        orders.forEach(order => {
            order.items.forEach(item => { 
                if (item.itemId && item.itemId.name) {
                    foodCount[item.itemId.name] = (foodCount[item.itemId.name] || 0) + item.quantity; 
                }
            });
        });
        
        // Lấy top 3 món hay ăn nhất
        const topFoods = Object.entries(foodCount)
            .sort((a, b) => b[1] - a[1]) // Sắp xếp giảm dần
            .slice(0, 3)
            .map(entry => `${entry[0]} (đã ăn ${entry[1]} lần)`)
            .join(', ');

        return `KHÁCH QUEN. Món ruột hay gọi: ${topFoods}.`;
    } catch (error) { return ""; }
};
const findOrderInfo = async (message, userId) => { // 🔥 Thêm userId để bảo mật
    try {
        const cleanMessage = xoaDauTiengViet(message);
        const tableMatch = cleanMessage.match(/ban\s*(?:so\s*)?(\d+)/);
        if (tableMatch) {
            const number = tableMatch[1];
            const ban = await Ban.findOne({ soBan: { $regex: new RegExp(`^Bàn 0?${number}$`, 'i') } }).populate('donHangHienTai');
            if (ban && ban.donHangHienTai) {
                const order = ban.donHangHienTai;
                
                // 🔥 CHECK QUYỀN: Chỉ chủ đơn mới xem được chi tiết
                if (order.user.toString() !== userId) {
                    return `🔒 Bàn ${ban.soBan} đang có khách (Không phải đơn của bạn).`;
                }

                let itemsStr = [];
                if (order.items) {
                    for (let item of order.items) {
                        const f = await MonAn.findById(item.itemId);
                        itemsStr.push(`${item.quantity}x ${f ? f.name : 'Món'}`);
                    }
                }
                return `
                    📋 Đơn bàn ${ban.soBan} của bạn: ${itemsStr.join(', ')}. 
                    👉 order_status: "${order.status}"
                    💰 Tổng: ${order.totalPrice.toLocaleString()}đ
                `;
                return `✅ Bàn ${number} hiện đang TRỐNG.`;
            }
        }
        return "Không tìm thấy thông tin bàn cụ thể trong câu hỏi.";
    } catch (err) { return ""; }
};

// ============================================================
// 🔥 CÁC HÀM XỬ LÝ LOGIC (ĐÃ TỐI ƯU SOCKET) 🔥
// ============================================================

async function checkTableOwnership(tableName, currentUserId) {
    try {
        const ban = await Ban.findOne({ soBan: { $regex: new RegExp(`^${tableName}$`, 'i') } }).populate('donHangHienTai');
        if (!ban || !ban.donHangHienTai) {
            return { isOwner: true, isEmpty: true };
        }
        const order = ban.donHangHienTai;
        if (order.user.toString() === currentUserId) {
            return { isOwner: true, isEmpty: false, order: order };
        } else {
            return { isOwner: false, isEmpty: false, order: order };
        }
    } catch (e) {
        return { isOwner: false, isEmpty: true };
    }
}

// --- TẠO / THÊM ĐƠN ---
const xuLyDatHang = async (orderData, userId, io) => {
    try {
        const user = await User.findById(userId);
        const realUserName = user ? 
                             (user.name || user.username || `Khách ${user._id.toString().substring(0, 4)}`) 
                             : "Khách Vãng Lai"; // Đổi từ "Khách" thành "Khách Vãng Lai" để dễ phân biệt
        
        const tableNumberMatch = orderData.tableName ? orderData.tableName.match(/\d+/) : null;
        if (!tableNumberMatch) return { success: false, message: `⚠️ Tên bàn không hợp lệ.` };
        
        const tableNumber = tableNumberMatch[0];
        const ban = await Ban.findOne({ 
            soBan: { $regex: new RegExp(`^(bàn|ban|table)?\\s*0?${tableNumber}$`, 'i') } 
        }).populate('donHangHienTai'); 
        
        if (!ban) return { success: false, message: `⚠️ Không tìm thấy Bàn số ${tableNumber}.` };

        let newItems = [], newItemsText = [], addBill = 0;
        if (!orderData.items || !Array.isArray(orderData.items)) return { success: false, message: "⚠️ Lỗi danh sách món." };

        for (const item of orderData.items) {
            // 🔥 Tìm kiếm tương đối (Regex) để bắt được món ăn dù khách gõ thiếu dấu
            const f = await MonAn.findOne({ name: { $regex: new RegExp(item.foodName, 'i') } });
            if (f) { 
                newItems.push({ itemId: f._id, quantity: item.quantity }); 
                addBill += f.price * item.quantity; 
                newItemsText.push(`${item.quantity} ${f.name}`); 
            }
        }
        
        if (newItems.length === 0) return { success: false, message: `⚠️ Không tìm thấy món nào tên là "${orderData.items.map(i=>i.foodName).join(', ')}" trong menu.` };

        // --- GỘP ĐƠN (KHÁCH GỌI THÊM) ---
        if (ban.trangThai && (ban.trangThai.toLowerCase().includes('phục vụ') || ban.trangThai.toLowerCase().includes('có khách'))) {
            if (ban.donHangHienTai) {
                const cur = ban.donHangHienTai;
                const LOCKED_STATUS = ['Đang xử lý', 'Đang nấu', 'Đang giao', 'Hoàn tất']; 
        if (LOCKED_STATUS.includes(cur.status)) {
            return { 
                success: false, 
                message: `⛔ Đơn hàng đang ở trạng thái "${cur.status}". Bếp đã nhận đơn nên không thể thêm món lúc này ạ.` 
            };
        }
                if (cur.user.toString() !== userId) return { success: false, message: `⛔ Bàn này đang được khách khác sử dụng.` };
                
                cur.items.push(...newItems); 
                cur.totalPrice += addBill; 
                await cur.save();
                
                // Gửi Telegram
                sendTelegram(`➕ <b>KHÁCH GỌI THÊM</b>\n- Bàn: ${ban.soBan}\n- Thêm: ${newItemsText.join(', ')}`);
                
                // 🔥 SOCKET UPDATE
                if (io) io.emit('SERVER_UPDATE_ORDER', { tableId: ban._id, tableName: ban.soBan, actionType: 'UPDATE' });

                return { success: true, message: `✅ Đã gọi thêm: ${newItemsText.join(', ')}` };
            }
        }
        
        // --- TẠO ĐƠN MỚI ---
        if (!userId) return { success: false, message: "⚠️ Cần đăng nhập để đặt món." };
       const newOrd = new DonHang({ user: userId, banId: ban._id, customerName: realUserName, items: newItems, totalPrice: addBill, status: 'Mới', trangThaiThanhToan: 'Chưa thanh toán' });
        const saved = await newOrd.save();
        ban.trangThai = 'Đang phục vụ'; ban.donHangHienTai = saved._id; await ban.save();
        
        // Gửi Telegram
        sendTelegram(`🆕 <b>ĐƠN MỚI</b>\n- Bàn: ${ban.soBan}\n- Món: ${newItemsText.join(', ')}`);

        // 🔥 SOCKET UPDATE
        if (io) io.emit('SERVER_UPDATE_ORDER', { tableId: ban._id, tableName: ban.soBan, actionType: 'UPDATE' });
        
        return { success: true, message: `✅ Đã lên đơn bàn ${ban.soBan} thành công!` };
    } catch (e) { 
        console.error(e);
        return { success: false, message: "Lỗi tạo đơn." }; 
    }
};

// --- HỦY ĐƠN ---
const xuLyHuyDon = async (data, userId, io) => {
    try {
        const ban = await Ban.findOne({ soBan: { $regex: new RegExp(`^${data.tableName}$`, 'i') } }).populate('donHangHienTai');
        if (!ban || !ban.donHangHienTai) return { success: false, message: "⚠️ Bàn trống, không có gì để hủy." };
        
        const order = ban.donHangHienTai;
        if (order.user.toString() !== userId) return { success: false, message: "⛔ Không phải chủ đơn." };
        const LOCKED_STATUS = ['Đang xử lý', 'Đang nấu', 'Đang giao', 'Hoàn tất'];
        if (LOCKED_STATUS.includes(order.status)) {
             return { 
                success: false, 
                message: `⛔ Bác đầu bếp đang làm món rồi (Trạng thái: ${order.status}), nên mình không sửa/xóa được nữa nha!` 
            };
        }
        order.status = 'Đã hủy'; await order.save();
        ban.trangThai = 'Trống'; ban.donHangHienTai = null; await ban.save();
        
        sendTelegram(`❌ <b>HỦY ĐƠN</b>\n- Bàn: ${ban.soBan}`);

        // 🔥 SOCKET UPDATE
        if (io) io.emit('SERVER_UPDATE_ORDER', { tableId: ban._id, tableName: ban.soBan, actionType: 'CLEAR' });

        return { success: true, message: `✅ Đã hủy đơn bàn ${ban.soBan}.` };
    } catch (e) { return { success: false, message: "Lỗi hủy." }; }
};

// --- SỬA ĐƠN ---
const xuLySuaDon = async (data, userId, io) => {
    try {
        const ban = await Ban.findOne({ soBan: { $regex: new RegExp(`^${data.tableName}$`, 'i') } }).populate('donHangHienTai');
        if (!ban || !ban.donHangHienTai) return { success: false, message: "⚠️ Bàn hiện đang trống." };
        
        const order = ban.donHangHienTai;
        if (order.user.toString() !== userId) return { success: false, message: "⛔ Bạn không phải chủ đơn này." };
         const LOCKED_STATUS = ['Đang xử lý', 'Đang nấu', 'Đang giao', 'Hoàn tất'];
        if (LOCKED_STATUS.includes(order.status)) {
             return { 
                success: false, 
                message: `⛔ Bác đầu bếp đang làm món rồi (Trạng thái: ${order.status}), nên mình không sửa/xóa được nữa nha!` 
            };
        }
        let logs = [];
        for (const item of data.items) {
            const f = await MonAn.findOne({ name: { $regex: new RegExp(item.foodName, 'i') } });
            if (!f) continue;
            
            const idx = order.items.findIndex(i => i.itemId.toString() === f._id.toString());
            if (item.quantity === 0) { 
                if (idx > -1) { order.items.splice(idx, 1); logs.push(`❌ Xóa ${f.name}`); } 
            } else { 
                if (idx > -1) { 
                    logs.push(`✏️ Sửa ${f.name} (${order.items[idx].quantity} -> ${item.quantity})`);
                    order.items[idx].quantity = item.quantity; 
                } else { 
                    order.items.push({ itemId: f._id, quantity: item.quantity }); 
                    logs.push(`➕ Thêm ${item.quantity} ${f.name}`);
                } 
            }
        }

        // Tính lại tổng tiền
        let newTotal = 0;
        for (const i of order.items) {
            const foodInfo = await MonAn.findById(i.itemId);
            if(foodInfo) newTotal += foodInfo.price * i.quantity;
        }
        order.totalPrice = newTotal;
        await order.save();

        if (logs.length > 0) {
            sendTelegram(`✏️ <b>KHÁCH SỬA ĐƠN</b>\n- Bàn: ${ban.soBan}\n- Chi tiết:\n${logs.join('\n')}`);
            if (io) io.emit('SERVER_UPDATE_ORDER', { tableId: ban._id, tableName: ban.soBan, actionType: 'UPDATE' });
            return { success: true, message: `✅ Cập nhật xong!\n${logs.join(', ')}` };
        } else {
            return { success: true, message: "✅ Không có thay đổi nào." };
        }
    } catch (e) { return { success: false, message: "Lỗi sửa đơn." }; }
};

// --- CHUYỂN BÀN ---
const xuLyChuyenBan = async (data, userId, io) => {
    try {
        const { currentTable, newTable } = data;
        const banMoi = await Ban.findOne({ soBan: { $regex: new RegExp(`^${newTable}$`, 'i') } }).populate('donHangHienTai');
        if (!banMoi) return { success: false, message: `⚠️ Không tìm thấy ${newTable}.` };
        if (banMoi.donHangHienTai) return { success: false, message: `⚠️ ${banMoi.soBan} đang có khách.` };

        const banCu = await Ban.findOne({ soBan: { $regex: new RegExp(`^${currentTable}$`, 'i') } }).populate('donHangHienTai');
        if (!banCu || !banCu.donHangHienTai) return { success: false, message: `⚠️ ${currentTable} đang trống.` };
        
        const order = banCu.donHangHienTai;
        if (order.user.toString() !== userId) return { success: false, message: "⛔ Không có quyền." };
        
        order.banId = banMoi._id; await order.save();
        banCu.donHangHienTai = null; banCu.trangThai = 'Trống'; await banCu.save();
        banMoi.donHangHienTai = order._id; banMoi.trangThai = 'Đang phục vụ'; await banMoi.save();
        
        sendTelegram(`🔄 <b>CHUYỂN BÀN</b>\n- ${banCu.soBan} -> ${banMoi.soBan}`);
        
        if (io) {
            io.emit('SERVER_UPDATE_ORDER', { tableId: banCu._id, tableName: banCu.soBan, actionType: 'CLEAR' });
            io.emit('SERVER_UPDATE_ORDER', { tableId: banMoi._id, tableName: banMoi.soBan, actionType: 'UPDATE' });
        }

        return { success: true, message: `✅ Đã chuyển từ ${banCu.soBan} sang ${banMoi.soBan}.` };
    } catch (e) { return { success: false, message: "Lỗi chuyển bàn." }; }
};



// ============================================================
// 5. MAIN CONTROLLER (MASTER VERSION - HIỂU MỌI NGỮ CẢNH)
// ============================================================
const handleChat = async (req, res) => {
    try {
        const { message, userId, history } = req.body;

        // 1. Lấy dữ liệu (Song song)
     // ✅ CODE ĐÚNG:
const [restaurantInfo, contextData, orderSearch, userProfile, userData] = await Promise.all([
    getStoreInfoFromDB(), 
    getContextFromDB(), 
    findOrderInfo(message, userId), 
    analyzeUserHistory(userId), 
    User.findById(userId)
]);

        const currentUserName = userData ? (userData.username || userData.name) : "Khách";
        let messages = [];
        
        // --- A. SYSTEM PROMPT (BẢN ĐẦY ĐỦ NHẤT) ---
        const systemPrompt = `
       Bạn là FoodBot - Nhân viên phục vụ siêu vui tính, hòa đồng và nhanh nhẹn 🍕🍜.
        
        === DỮ LIỆU THỜI GIAN THỰC ===
        - Thông tin quán: ${restaurantInfo}
        - Menu quán: ${contextData.menuString}
        - Trạng thái bàn: ${contextData.tableString}
        - Khách hàng: "${currentUserName}"
        
        👉 KẾT QUẢ TRA CỨU TỪ HỆ THỐNG (Dùng để trả lời khi khách hỏi): 
        "${orderSearch}"
        ====================================================
        🎭 PHONG CÁCH TRẢ LỜI (TONE OF VOICE)
        ====================================================
        - Luôn dùng từ ngữ thân thiện: "Dạ", "Vâng ạ", "nhé", "nha", "ui chà".
        - Dùng nhiều Emoji phù hợp: 😋, 🍜, 🍻, ❤️, 🏃‍♂️💨.
        - Nếu khách hỏi món, hãy tư vấn nhiệt tình như người bạn.
        - Ví dụ: "Dạ Cơm Tấm bên em là số dzách luôn ạ 😋", "Món ruột Bún Bò của anh/chị đây rồi!".

        ===================================================================
        🛑 BỘ LUẬT XỬ LÝ HÀNH ĐỘNG (ĐỌC KỸ ĐỂ KHÔNG BỊ SAI) 🛑
        ===================================================================

        Bạn phải phân loại câu nói của khách vào 1 trong 4 nhóm sau:

        ✅ NHÓM 1: TẠO ĐƠN / GỌI THÊM (Dùng lệnh: "CREATE_ORDER")
        - Khi khách nói: "Cho anh...", "Lấy thêm...", "Gọi món...", "Đặt...", "Kêu thêm...".
        - QUY TẮC VÀNG: Dù bàn đang trống hay đang có khách, hễ khách muốn GỌI MÓN hoặc THÊM MÓN -> BẮT BUỘC dùng "CREATE_ORDER".
        - (Lý do: Hệ thống sẽ tự gộp món nếu bàn đã có khách).

        ⚠️ NHÓM 2: SỬA ĐỔI / TRẢ MÓN (Dùng lệnh: "UPDATE_ORDER")
        - Chỉ dùng khi khách muốn THAY ĐỔI món đã gọi trước đó.
        - Ví dụ: "Đổi món A thành B", "Giảm bớt 1 cái", "Sửa lại thành...".
        - Ví dụ: "Hủy món A", "Không lấy món B nữa", "Xóa món C" -> Trả về quantity: 0.

        ⛔ NHÓM 3: CÁC HÀNH ĐỘNG KHÁC
        - Hủy toàn bộ đơn bàn -> Dùng lệnh "CANCEL_ORDER".
        - Chuyển sang bàn khác -> Dùng lệnh "SWITCH_TABLE" (Cần: currentTable, newTable).

        👀 NHÓM 4: HỎI ĐÁP / TRA CỨU (Tuyệt đối KHÔNG tạo Action)
        - Khi khách dùng từ: "Kiểm tra", "Check", "Xem", "Đến đâu rồi".
        - ĐẶC BIỆT CHÚ Ý: Nếu khách nói "Cập nhật tiến trình" hoặc "Cập nhật tình hình" -> Đây là xem thông tin -> Action rỗng [].
        - Xử lý: Mảng "actions" để RỖNG []. Field "reply" trả lời dựa trên "KẾT QUẢ TRA CỨU".


        QUY TẮC QUAN TRỌNG VỀ ĐƠN HÀNG:
Dữ liệu đầu vào sẽ có trường "order_status".
1. Nếu "order_status" là "PROCESSING" (Đang xử lý) hoặc "COOKING", "DELIVERING":
   - TUYỆT ĐỐI KHÔNG được gọi các tool: add_item, remove_item, update_note.
   - Hãy trả lời khách: "Đơn hàng đã được nhà bếp tiếp nhận nên không thể thay đổi món."
2. Chỉ khi "order_status" là "NEW" mới được phép gọi tool sửa đổi.
        ===================================================================
        YÊU CẦU ĐẦU RA (JSON FORMAT)
        ===================================================================
        1. Nếu thuộc NHÓM 1, 2, 3 (Có hành động):
           - Field "reply": ĐỂ CHUỖI RỖNG "" (Để hệ thống tự phản hồi kết quả).
           - Field "actions": Chứa lệnh tương ứng.
        
        2. Nếu thuộc NHÓM 4 (Hỏi đáp):
           - Field "reply": Trả lời khách thân thiện, ngắn gọn.
           - Field "actions": ĐỂ RỖNG [].

        Ví dụ mẫu JSON:
        {
          "reply": "", 
          "actions": [
             { "action": "CREATE_ORDER", "tableName": "Bàn 1", "items": [{ "foodName": "Cơm Tấm", "quantity": 2 }] }
          ]
        }
        `;

        messages.push({ role: "system", content: systemPrompt });

        // Thêm lịch sử chat
        if (history && Array.isArray(history)) {
           history.slice(-2).forEach(h => {
                let validRole = h.role;
                if (validRole === 'model' || validRole === 'bot') validRole = 'assistant';
                if (validRole === 'user' || validRole === 'assistant') {
                     messages.push({ role: validRole, content: String(h.content || "") });
                }
            });
        }
        messages.push({ role: "user", content: message });

        // --- B. GỌI GROQ API ---
      const completion = await callGroqWithRetry(messages);

        // --- C. XỬ LÝ KẾT QUẢ ---
        const rawContent = completion.choices[0].message.content;
        let parsedData = {};
        
        try { 
            parsedData = JSON.parse(rawContent); 
        } catch (e) { 
            console.error("⚠️ JSON Parse Error, trying clean up...");
            const cleanJson = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
            try { parsedData = JSON.parse(cleanJson); } catch (e2) {
                return res.json({ reply: rawContent || "Xin lỗi, em chưa hiểu ý anh chị." });
            }
        }

        const actionsList = parsedData.actions || [];
        let finalReply = "";

        // TRƯỜNG HỢP 1: CÓ HÀNH ĐỘNG
        if (actionsList.length > 0) {
            console.log("⚡ Action detected:", actionsList);
            let actionResults = [];
            
            for (const actionData of actionsList) {
                // 1. Check quyền sở hữu
                let targetTable = null;
                if (["CANCEL_ORDER", "UPDATE_ORDER", "CREATE_ORDER"].includes(actionData.action)) targetTable = actionData.tableName;
                else if (actionData.action === "SWITCH_TABLE") targetTable = actionData.currentTable;

                if (targetTable) {
                    const checkInfo = await checkTableOwnership(targetTable, userId);
                    if (!checkInfo.isEmpty && !checkInfo.isOwner) {
                        actionResults.push(`⛔ Bàn **${targetTable}** không phải của bạn.`);
                        continue; 
                    }
                }

                // 2. Thực thi
                let result = { message: "" };
                switch (actionData.action) {
                    case "CREATE_ORDER": result = await xuLyDatHang(actionData, userId, req.io); break;
                    case "CANCEL_ORDER": result = await xuLyHuyDon(actionData, userId, req.io); break;
                    case "UPDATE_ORDER": result = await xuLySuaDon(actionData, userId, req.io); break;
                    case "SWITCH_TABLE": result = await xuLyChuyenBan(actionData, userId, req.io); break;
                    default: 
                         console.log("⚠️ Action lạ:", actionData.action);
                         result = { message: "⚠️ Yêu cầu không được hỗ trợ." };
                }
                if(result.message) actionResults.push(result.message);
            }
            
            if (actionResults.length > 0) {
                finalReply = actionResults.join('\n\n');
            } else {
                finalReply = parsedData.reply || "⚠️ Yêu cầu chưa rõ ràng.";
            }

        } 
        // TRƯỜNG HỢP 2: HỎI ĐÁP
        else {
            finalReply = parsedData.reply || "Dạ, em nghe ạ.";
        }

        res.status(200).json({ reply: finalReply });

    } catch (error) {
        console.error("🔥 Lỗi Server/Groq:", error);
        res.status(200).json({ reply: "Hệ thống đang bận xíu, anh chị thử lại sau nhé!" });
    }
};

module.exports = { handleChat };
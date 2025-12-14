document.addEventListener("DOMContentLoaded", function () {
    
    // --- 1. LẤY THÔNG TIN USER ---
    let userId = null;
    const rawData = localStorage.getItem('userInfo') || localStorage.getItem('user');
    if (rawData) {
        try {
            const data = JSON.parse(rawData);
            if (data.userId) userId = data.userId;
            else if (data._id) userId = data._id;
            else if (data.id) userId = data.id;
            else if (data.user && data.user._id) userId = data.user._id;
        } catch (e) { console.error(e); }
    }

    // --- 2. KHỞI TẠO BIẾN LỊCH SỬ TỪ LOCAL STORAGE ---
    // Tạo key riêng theo userId để tránh User A nhìn thấy chat của User B
    const STORAGE_KEY = userId ? `chatHistory_${userId}` : 'tempChatHistory';
    let chatHistory = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    // --- 3. TẠO GIAO DIỆN CHAT (Giữ nguyên) ---
    if (!document.getElementById('ai-chat-widget')) {
        const chatHTML = `
        <div id="ai-chat-widget" style="z-index: 10000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
            <button id="ai-toggle-btn" style="
                position: fixed; bottom: 20px; right: 20px; 
                width: 60px; height: 60px; border-radius: 50%; 
                background: linear-gradient(135deg, #ff6b6b, #ff4757); 
                color: white; border: none; font-size: 28px; 
                cursor: pointer; box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
                transition: transform 0.2s;">💬</button>
            
            <div id="ai-chat-window" style="
                position: fixed; bottom: 90px; right: 20px; 
                width: 350px; height: 500px; 
                background: white; border-radius: 15px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.15); 
                display: none; flex-direction: column; overflow: hidden;
                border: 1px solid #f1f1f1;">
                
                <div style="background: linear-gradient(135deg, #ff6b6b, #ff4757); color: white; padding: 15px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 16px;">🤖 Trợ lý FoodBot</span> 
                    <span id="ai-close-btn" style="cursor: pointer; font-size: 20px; opacity: 0.8;">✖</span>
                </div>
                
                <div id="ai-messages" style="flex: 1; padding: 15px; overflow-y: auto; font-size: 14px; background-color: #f8f9fa;">
                    <div style="background: #e9ecef; color: #333; padding: 10px 12px; border-radius: 15px 15px 15px 0; max-width: 85%; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        Xin chào! Em có thể giúp anh/chị xem menu hoặc kiểm tra đơn hàng ạ?
                    </div>
                </div>
                
                <div style="padding: 15px; display: flex; border-top: 1px solid #eee; background: white;">
                    <input id="ai-input" type="text" placeholder="Nhập câu hỏi..." style="
                        flex: 1; padding: 10px 15px; border: 1px solid #ddd; border-radius: 25px; outline: none; transition: border 0.3s;">
                    <button id="ai-send-btn" style="
                        margin-left: 10px; background: #ff6b6b; color: white; border: none; 
                        width: 40px; height: 40px; border-radius: 50%; cursor: pointer;
                        display: flex; align-items: center; justify-content: center;">➤</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', chatHTML);
    }

    const toggleBtn = document.getElementById('ai-toggle-btn');
    const chatWindow = document.getElementById('ai-chat-window');
    const closeBtn = document.getElementById('ai-close-btn');
    const input = document.getElementById('ai-input');
    const sendBtn = document.getElementById('ai-send-btn');
    const messages = document.getElementById('ai-messages');

    // --- 4. HÀM HIỂN THỊ TIN NHẮN ---
    function addMessageUI(text, sender) {
        const div = document.createElement('div');
        div.style.padding = '10px 12px';
        div.style.marginBottom = '10px';
        div.style.maxWidth = '85%';
        div.style.wordWrap = 'break-word';
        div.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
        div.style.lineHeight = '1.5'; 
        div.style.whiteSpace = 'pre-wrap'; 

        if (sender === 'userInfo' || sender === 'user') {
            div.style.alignSelf = 'flex-end';
            div.style.marginLeft = 'auto'; 
            div.style.background = '#ff6b6b';
            div.style.color = 'white';
            div.style.borderRadius = '15px 15px 0 15px';
        } else {
            div.style.alignSelf = 'flex-start';
            div.style.marginRight = 'auto'; 
            div.style.background = 'white';
            div.style.color = '#333';
            div.style.border = '1px solid #e9ecef';
            div.style.borderRadius = '15px 15px 15px 0';
        }

        div.innerText = text;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    // --- 5. 🔥 VẼ LẠI LỊCH SỬ CŨ KHI LOAD TRANG 🔥 ---
    if (chatHistory.length > 0) {
        chatHistory.forEach(msg => {
            // role 'user' -> hiển thị user, 'model' -> hiển thị bot
            const sender = msg.role === 'user' ? 'userInfo' : 'bot';
            addMessageUI(msg.content, sender);
        });
    }

    // Hiệu ứng nút
    toggleBtn.onmouseover = () => toggleBtn.style.transform = 'scale(1.1)';
    toggleBtn.onmouseout = () => toggleBtn.style.transform = 'scale(1)';

    toggleBtn.onclick = () => {
        chatWindow.style.display = 'flex';
        toggleBtn.style.display = 'none';
        input.focus();
        // Cuộn xuống cuối khi mở
        messages.scrollTop = messages.scrollHeight;
    };
    closeBtn.onclick = () => {
        chatWindow.style.display = 'none';
        toggleBtn.style.display = 'block';
    };

    // --- 6. HÀM GỬI TIN NHẮN ---
    async function send() {
        const text = input.value.trim();
        if (!text) return;

        if (!userId) {
            addMessageUI("⚠️ Lỗi: Bạn chưa đăng nhập. Vui lòng đăng nhập lại.", 'bot');
            return;
        }

        // Hiện tin nhắn user
        addMessageUI(text, 'userInfo');
        input.value = '';

        // 🔥 LƯU VÀO HISTORY & STORAGE
        chatHistory.push({ role: "user", content: text });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));

        // Hiện loading
        const loadingId = 'loading-' + Date.now();
        const loadingDiv = document.createElement('div');
        loadingDiv.id = loadingId;
        loadingDiv.innerText = 'FoodBot đang soạn tin...';
        loadingDiv.style.fontSize = '12px';
        loadingDiv.style.color = '#888';
        loadingDiv.style.marginLeft = '10px';
        messages.appendChild(loadingDiv);
        messages.scrollTop = messages.scrollHeight;

        try {
            const res = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: text,
                    userId: userId,
                    history: chatHistory // Gửi lịch sử đi
                })
            });

            const data = await res.json();
            document.getElementById(loadingId)?.remove();
            
            addMessageUI(data.reply, 'bot');

            // 🔥 LƯU CÂU TRẢ LỜI CỦA BOT VÀO HISTORY & STORAGE
            if (!data.reply.includes("✅")) {
                chatHistory.push({ role: "model", content: data.reply });
            }
            
            // Giới hạn 15 câu gần nhất để không bị đầy bộ nhớ
            if (chatHistory.length > 15) {
                chatHistory = chatHistory.slice(chatHistory.length - 15);
            }
            
            // Cập nhật lại Storage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));

        } catch (e) {
            console.error(e);
            document.getElementById(loadingId)?.remove();
            addMessageUI('Lỗi kết nối server!', 'bot');
        }
    }

    sendBtn.onclick = send;
    input.onkeypress = (e) => { if(e.key==='Enter') send(); };
});
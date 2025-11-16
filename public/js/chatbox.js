// File: public/js/chatbox.js (ĐÃ CẬP NHẬT CHO CSS MỚI)

document.addEventListener('DOMContentLoaded', () => {

    console.log("chatbox.js: DOM đã tải, bắt đầu chạy...");

    if (typeof io === 'undefined') {
        console.error("LỖI: file /socket.io/socket.io.js chưa được tải TRƯỚC chatbox.js!");
        return; 
    }
    const socket = io();
    
    // === TẠO VÀ CHÈN HTML (KHỚP VỚI CSS MỚI) ===
    const chatButton = document.createElement('div');
    chatButton.className = 'chat-icon'; 
    chatButton.innerHTML = '💬'; // Icon mặc định
    document.body.appendChild(chatButton);

    const chatContainer = document.createElement('div');
    chatContainer.className = 'chat-window'; 
    chatContainer.innerHTML = `
      <div class="chat-header" id="chat-header">
        <span id="chat-header-title">
             <span style="font-size: 1.2em;">💡</span> Hỗ trợ trực tuyến
         </span>
         <button id="chat-close">×</button>
      </div>
      <div class="chat-messages" id="chat-messages">
          </div>
      <div class="chat-input" id="chat-input-area">
          <input id="chat-input-field" type="text" placeholder="Nhập tin nhắn..."/>
          <button id="chat-send-button">➤</button>   </div>
    `;
    document.body.appendChild(chatContainer);


    // === LOGIC CHÍNH (Không thay đổi) ===
    const messageSound = new Audio('/sounds/ting.mp3');
    messageSound.volume = 0.4;
    const chatClose = document.getElementById('chat-close'); 
    const chatInput = document.getElementById('chat-input-field'); 
    const chatSend = document.getElementById('chat-send-button'); 
    const chatMessages = document.getElementById('chat-messages');
    const chatHeaderTitle = document.getElementById('chat-header-title');

    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const username = userInfo?.username || 'Khách';
    const isUserAdmin = userInfo?.role === 'admin';
    let adminChatTargetId = null; 
    
    function appendMessage(user, message, isSelf = false) {
      const msgDiv = document.createElement('div');
      msgDiv.className = isSelf ? 'message sent' : 'message received';
      
      if (!isSelf) {
          const nameSpan = document.createElement('span');
          nameSpan.className = 'user-name';
          nameSpan.textContent = user === 'BotNhaHang' ? 'Bot' : user; 
          msgDiv.appendChild(nameSpan);
      }
      
      const textNode = document.createTextNode(message);
      msgDiv.appendChild(textNode);
      
      chatMessages.appendChild(msgDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function sendMessage() {
      const message = chatInput.value.trim();
      if (!message) return;

      if (isUserAdmin) {
        if (!adminChatTargetId) {
          alert('Chưa có người dùng nào cần hỗ trợ! Vui lòng chờ tin nhắn mới.');
          return;
        }
        socket.emit('admin:sendMessage', {
          targetSocketId: adminChatTargetId,
          message: message,
          user: username 
        });

      } else {
        socket.emit('user:sendMessage', { user: username, message });
      }

      appendMessage(username, message, true);
      chatInput.value = '';
    }
    
    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
    });
    chatButton.addEventListener('click', () => {
        chatContainer.style.display = 'flex';
        chatButton.style.display = 'none';
    });
    chatClose.addEventListener('click', () => {
        chatContainer.style.display = 'none';
        chatButton.style.display = 'flex';
    });
    
    socket.on('chat:receiveMessage', (data) => {
      if (data.user !== username) {
        appendMessage(data.user, data.message, false);
        messageSound.play().catch(err => {});
      }
    });

    if (isUserAdmin) {
        console.log("Admin: Đã gửi yêu cầu tham gia phòng chat.");
        socket.emit('admin:joinRoom'); 

        socket.on('chat:needsAdmin', (data) => {
            console.log(`[Chat Admin] Tin nhắn cần hỗ trợ từ ${data.user}: ${data.message}`);
            
            if (adminChatTargetId !== data.userSocketId) {
                chatMessages.innerHTML = ""; 
            }
            
            adminChatTargetId = data.userSocketId; 
            appendMessage(data.user, data.message, false); 
            
            if(chatHeaderTitle) chatHeaderTitle.textContent = `Đang trả lời: ${data.user}`;
            
            messageSound.play().catch(err => {});
        });
        
        window.chatSocket = socket; 
    }

});
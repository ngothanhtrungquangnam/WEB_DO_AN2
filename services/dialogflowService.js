const dialogflow = require('@google-cloud/dialogflow');
const uuid = require('uuid');
const path = require('path');

// 1. Cấu hình Key và Project ID
// Lấy đường dẫn tuyệt đối tới file key
const KEY_FILE_PATH = path.join(__dirname, '..', 'dialogflow-key.json'); 
// Đảm bảo bạn đã đặt file key ở thư mục gốc

// Đọc Project ID từ file key. 
// Nếu tên file key của bạn không phải là 'dialogflow-key.json', hãy kiểm tra lại.
const keyFileContent = require(KEY_FILE_PATH);
const PROJECT_ID = keyFileContent.project_id;


// Tạo một session client với key đã tải
const sessionClient = new dialogflow.SessionsClient({
    keyFilename: KEY_FILE_PATH
});

/**
 * Gửi tin nhắn đến Dialogflow để nhận diện ý định và lấy câu trả lời.
 * @param {string} userMessage - Tin nhắn của người dùng.
 * @param {string} sessionId - ID phiên duy nhất (ví dụ: socket.id hoặc user ID).
 * @returns {object} Kết quả truy vấn từ Dialogflow.
 */
async function sendToDialogflow(userMessage, sessionId) {
    // Tạo ID phiên nếu chưa có (để bot nhớ bối cảnh cuộc trò chuyện)
    if (!sessionId) {
        sessionId = uuid.v4(); 
    }
  
    const sessionPath = sessionClient.projectAgentSessionPath(
        PROJECT_ID,
        sessionId
    );

    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: userMessage,
                languageCode: 'vi-VN', // Mã ngôn ngữ Việt Nam
            },
        },
    };

    try {
        const responses = await sessionClient.detectIntent(request);
        const result = responses[0].queryResult;
        
        return result; 

    } catch (error) {
        console.error('LỖI KHI GỌI DIALOGFLOW:', error);
        // Trả về một đối tượng lỗi để xử lý phía server
        return { 
            error: true, 
            fulfillmentText: "Xin lỗi, hiện tại tôi không thể kết nối với dịch vụ bot. Vui lòng thử lại sau.",
            intent: { isFallback: true } // Coi như bot không hiểu
        }; 
    }
}

// Xuất hàm này để sử dụng trong controller/logic chat
module.exports = {
    sendToDialogflow
};
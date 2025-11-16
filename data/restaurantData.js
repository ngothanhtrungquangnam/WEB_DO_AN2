// File: data/restaurantData.js (PHIÊN BẢN CÓ TIẾN TRÌNH CHI TIẾT)

// Giả lập cơ sở dữ liệu (Database)
const ORDERS = [
    { 
        id: '12345', 
        status: 'Đang chuẩn bị', 
        progress: 'Đầu bếp đang chọn nguyên liệu tươi và bắt đầu chế biến món Pizza Hải Sản.', 
        items: ['Pizza Hải Sản', 'Coca-cola'], 
        total: '350.000 VNĐ' 
    },
    { 
        id: '67890', 
        status: 'Đang giao hàng', 
        progress: 'Đơn hàng vừa rời khỏi nhà hàng lúc 10:15 sáng. Shipper Nguyễn Văn A sẽ giao đến bạn trong khoảng 15 phút tới.', 
        items: ['Gà Quay Lu', 'Trà Sữa'], 
        total: '200.000 VNĐ' 
    },
    { 
        id: '11223', 
        status: 'Đã hoàn thành', 
        progress: 'Đơn hàng này đã được giao thành công vào 1 ngày trước. Cảm ơn bạn đã tin tưởng!', 
        items: ['Mì Ý Bò Bằm'], 
        total: '120.000 VNĐ' 
    },
    { 
        id: '99999', 
        status: 'Đã xác nhận', 
        progress: 'Đơn hàng đã được xác nhận và đang chờ chuyển sang khu vực chế biến. Dự kiến bắt đầu làm món Gà trong 5 phút.', 
        items: ['Gà Nướng Muối Ớt'], 
        total: '280.000 VNĐ' 
    },
];

const MENU = [
    // ... (Giữ nguyên phần MENU nếu bạn đã có, hoặc dùng code dưới nếu chưa có)
    { name: 'Pizza Thập Cẩm Đặc Biệt', description: 'Sự kết hợp hoàn hảo giữa phô mai, thịt bò, xúc xích và rau củ tươi ngon.', price: '180.000 VNĐ' },
    { name: 'Gà Quay Mật Ong', description: 'Gà tươi ướp mật ong, quay lu giòn da, thơm lừng. Phục vụ kèm xôi chiên.', price: '250.000 VNĐ' },
    { name: 'Salad Caesar Tôm', description: 'Salad tươi mát với sốt Caesar đặc trưng, thịt tôm sú và bánh mì nướng giòn.', price: '100.000 VNĐ' },
];

/**
 * Kiểm tra trạng thái đơn hàng theo ID.
 * @param {string} orderId - ID đơn hàng cần kiểm tra.
 * @returns {string} Trạng thái chi tiết hoặc thông báo lỗi.
 */
function getOrderStatus(orderId) {
    const order = ORDERS.find(o => o.id === orderId);
    
    if (order) {
        // Trả về tiến trình chi tiết
        return `✅ **TIẾN TRÌNH ĐƠN HÀNG ${order.id}**:\n\nTrạng thái hiện tại: **${order.status}**.\nChi tiết: ${order.progress}\n\nTổng tiền: ${order.total}.`;
    }
    
    return `Xin lỗi, tôi không tìm thấy đơn hàng nào có mã **${orderId}**. Vui lòng kiểm tra lại.`;
}

/**
 * Lấy danh sách các món ăn hấp dẫn.
 * @returns {string} Danh sách món ăn được định dạng.
 */
function getFeaturedMenu() {
    let response = "Thực đơn hấp dẫn nhất của chúng tôi gồm:\n\n";
    MENU.forEach((item, index) => {
        response += `*️⃣ **${item.name}**\n   - Mô tả: ${item.description}\n   - Giá: ${item.price}\n\n`;
    });
    response += "Bạn muốn hỏi thêm về món nào không?";
    return response;
}

module.exports = {
    getOrderStatus,
    getFeaturedMenu,
};
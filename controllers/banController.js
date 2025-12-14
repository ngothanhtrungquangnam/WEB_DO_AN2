// File: controllers/banController.js
const Ban = require('../models/ban');
const DonHang = require('../models/donHang');

/**
 * @desc    Lấy tất cả bàn (cho sơ đồ bàn)
 * @route   GET /api/ban
 * @access  Public
 */
exports.getAllBan = async (req, res) => {
    try {
        // Tìm tất cả bàn và sắp xếp
        const banList = await Ban.find({}).sort('soBan'); 
        
        res.status(200).json(banList);

    } catch (error) {
        console.error('Lỗi khi lấy danh sách bàn:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// THANH TOÁN / TRẢ BÀN
/**
 * @desc    Admin trả bàn (thanh toán xong)
 * @route   PATCH /api/ban/:id/release
 * @access  Private (Admin)
 */
exports.releaseBan = async (req, res) => {
    const { id } = req.params; // ID của Bàn
    const io = req.io;

    try {
        const updatedBan = await Ban.findByIdAndUpdate(
            id,
            { 
                trangThai: 'Trống', 
                donHangHienTai: null,
                soKhach: 0 // Reset số khách khi trả bàn
            },
            { new: true, runValidators: true }
        );

        if (!updatedBan) {
            return res.status(404).json({ message: 'Không tìm thấy bàn.' });
        }

        // Gửi tín hiệu cập nhật bàn qua Socket.IO
        if (io) {
            io.emit('banUpdated', { 
                _id: updatedBan._id,
                soBan: updatedBan.soBan,
                trangThai: updatedBan.trangThai,
                donHangHienTai: null,
                soKhach: updatedBan.soKhach
            }); 
        }

        res.status(200).json(updatedBan);

    } catch (error) {
        console.error("Lỗi khi trả bàn:", error);
        res.status(500).json({ message: 'Lỗi server khi trả bàn: ' + error.message });
    }
};

// CẬP NHẬT SỐ KHÁCH
/**
 * @desc    Admin cập nhật số khách tại bàn
 * @route   PATCH /api/ban/:id/update-guests
 * @access  Private (Admin)
 */
exports.updateSoKhach = async (req, res) => {
    const { id } = req.params; // ID của Bàn
    const { soKhach } = req.body;
    const io = req.io;

    // Kiểm tra đầu vào
    if (soKhach === undefined || soKhach < 0) {
        return res.status(400).json({ message: 'Số khách không hợp lệ.' });
    }

    try {
        const updatedBan = await Ban.findByIdAndUpdate(
            id,
            { soKhach: parseInt(soKhach, 10) }, // Chuyển sang số nguyên
            { new: true, runValidators: true }
        );

        if (!updatedBan) {
            return res.status(404).json({ message: 'Không tìm thấy bàn.' });
        }

        // Gửi tín hiệu cập nhật bàn qua Socket.IO (chỉ cập nhật số khách)
        if (io) {
            io.emit('banGuestUpdated', { 
                _id: updatedBan._id,
                soKhach: updatedBan.soKhach
            }); 
        }

        res.status(200).json(updatedBan);

    } catch (error) {
        console.error("Lỗi khi cập nhật số khách:", error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật số khách: ' + error.message });
    }
};

// --- THAY THẾ HÀM RESET CŨ BẰNG HÀM NÀY ---

exports.resetAllTables = async (req, res) => {
    try {
        // 1. Import cả 2 Model
        const Ban = require('../models/ban'); 
        const DonHang = require('../models/donHang'); 

        console.log("🧹 Đang bắt đầu dọn dẹp hệ thống...");

        // 2. RESET BÀN: Chuyển tất cả về trạng thái trống
        await Ban.updateMany({}, { 
            status: 'trống',      
            isOccupied: false,    
            currentOrder: null    
        });

        // 3. RESET ĐƠN HÀNG: Hủy tất cả các đơn đang "Mới" hoặc "Đang xử lý"
        // (Bước này cực quan trọng để bàn không bị đỏ lại)
        await DonHang.updateMany(
            { status: { $in: ['Mới', 'Đang xử lý'] } }, // Tìm các đơn chưa xong
            { 
                status: 'Đã hủy', // Chuyển thành Đã hủy (hoặc 'Hoàn thành' tùy bạn)
                notes: 'Hệ thống tự động hủy khi Reset' 
            } 
        );

        console.log("✅ Đã dọn dẹp xong!");

        res.json({ 
            success: true, 
            message: "🧹 Đã Reset toàn bộ! Bàn ghế sạch sẽ, đơn hàng cũ đã hủy." 
        });

    } catch (error) {
        console.error("Lỗi Reset:", error);
        res.status(500).json({ error: "Lỗi khi reset bàn" });
    }
};
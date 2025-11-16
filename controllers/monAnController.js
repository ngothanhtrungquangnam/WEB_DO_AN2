// controllers/monAnController.js
const MonAn = require("../models/monAn");

exports.getAllMonAn = async (req, res) => {
  try {
    const monAn = await MonAn.find();
    res.json(monAn);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách món ăn" });
  }
};


exports.createMonAn = async (req, res) => {
    const { name, price, image, category } = req.body;
    try {
        const newItem = await MonAn.create({ name, price, image, category });
        res.status(201).json(newItem);
    } catch (error) {
        res.status(400).json({ message: 'Lỗi tạo món ăn: ' + error.message });
    }
};

exports.updateMonAn = async (req, res) => {
    const { id } = req.params;
    const { name, price, image, category } = req.body;
    try {
        const updatedItem = await MonAn.findByIdAndUpdate(
            id,
            { name, price, image, category },
            { new: true, runValidators: true }
        );
        if (!updatedItem) {
            return res.status(404).json({ message: 'Không tìm thấy món ăn.' });
        }
        res.status(200).json(updatedItem);
    } catch (error) {
        res.status(400).json({ message: 'Lỗi cập nhật món ăn: ' + error.message });
    }
};

exports.deleteMonAn = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedItem = await MonAn.findByIdAndDelete(id);
        if (!deletedItem) {
            return res.status(404).json({ message: 'Không tìm thấy món ăn.' });
        }
        res.status(200).json({ message: 'Xóa món ăn thành công.' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi xóa món ăn: ' + error.message });
    }
};
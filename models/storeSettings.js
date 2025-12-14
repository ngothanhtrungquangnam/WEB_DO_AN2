// File: models/storeSettings.js
const mongoose = require('mongoose');

const storeSettingsSchema = new mongoose.Schema({
    name: { type: String, required: true, default: "Bếp Nhà FoodBot" },
    address: { type: String, required: true },
    hotline: { type: String, required: true },
    openHours: { type: String, required: true }, // VD: "07:00 - 22:30"
    wifiName: { type: String, default: "" },
    wifiPass: { type: String, default: "" },
    features: { type: String, default: "" },     // VD: "Có chỗ đậu xe hơi..."
    note: { type: String, default: "" }          // VD: "Giá chưa bao gồm VAT"
}, { timestamps: true });

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);
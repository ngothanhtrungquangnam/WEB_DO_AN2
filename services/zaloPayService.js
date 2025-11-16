// File: services/zaloPayService.js
const crypto = require("crypto");
const axios = require("axios");
const moment = require("moment");
require("dotenv").config();

const config = {
  app_id: process.env.ZALOPAY_APP_ID,
  key1: process.env.ZALOPAY_KEY1,
  key2: process.env.ZALOPAY_KEY2,
  endpoint: "https://sb-openapi.zalopay.vn/v2/create",
  redirect_url: process.env.ZALOPAY_REDIRECT_URL,
  ipn_url: process.env.ZALOPAY_IPN_URL,
};

/**
 * ==========================================
 * ✅ TẠO URL THANH TOÁN ZALOPAY — FIX FULL
 * ==========================================
 */
exports.createPaymentUrl = async (order) => {
  try {

    // ✅ 1) Tạo app_trans_id đúng chuẩn (Không dùng ObjectId)
    const app_trans_id = `${moment().format("YYMMDD")}_${Math.floor(Math.random() * 1000000)}`;

    // ✅ 2) amount phải là integer
    const amount = parseInt(order.totalPrice);

    const orderData = {
      app_id: config.app_id,
      app_trans_id,
      app_user: order.user?.toString() || "guest",
      app_time: Date.now(),
      amount,
      item: "[]",
      embed_data: JSON.stringify({
        redirecturl: config.redirect_url
      }),
      bank_code: "zalopayapp",
      description: `Thanh toán đơn hàng #${order._id}`,
      callback_url: config.ipn_url
    };

    // ✅ 3) Chuỗi tạo MAC (đúng format ZaloPay)
    const mac_input =
      `${orderData.app_id}|${orderData.app_trans_id}|${orderData.app_user}` +
      `|${orderData.amount}|${orderData.app_time}|${orderData.embed_data}|${orderData.item}`;

    orderData.mac = crypto
      .createHmac("sha256", config.key1)
      .update(mac_input)
      .digest("hex");

    // ✅ 4) Gửi body JSON (không dùng params)
    const response = await axios.post(config.endpoint, orderData);

    if (response.data.return_code === 1 && response.data.order_url) {
      return {
        paymentUrl: response.data.order_url,
        app_trans_id
      };
    }

    throw new Error(response.data.return_message || "ZaloPay error");

  } catch (error) {
    console.error(
      "❌ [ZaloPay] createPaymentUrl Error:",
      error.response?.data || error.message
    );
    throw new Error("Giao dịch thất bại");
  }
};


/**
 * ==========================================
 * ✅ VERIFY CALLBACK — CHUẨN ZALOPAY
 * ==========================================
 */
exports.verifyCallback = (dataStr, mac) => {
  try {
    const calculatedMac = crypto
      .createHmac("sha256", config.key2)
      .update(dataStr)
      .digest("hex");

    return calculatedMac === mac;
  } catch (err) {
    console.error("❌ Verify MAC error:", err.message);
    return false;
  }
};

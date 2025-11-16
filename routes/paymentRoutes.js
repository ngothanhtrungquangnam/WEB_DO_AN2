// File: routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Thanh toán tiền mặt
router.post('/pay_direct', paymentController.payDirect);

// Tạo đơn thanh toán ZaloPay
router.post('/zalopay/create', paymentController.createZaloPayPayment);

// Callback / IPN của ZaloPay
router.post('/zalopay/callback', paymentController.handleZaloPayIPN);
router.post('/confirm-online', paymentController.confirmOnlinePayment);
module.exports = router;

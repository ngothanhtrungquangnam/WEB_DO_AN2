// File: routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
router.post('/switch-bank', paymentController.switchBankAccount);
router.post('/create-vietqr', paymentController.createVietQR);
// Thanh toán tiền mặt
router.post('/pay_direct', paymentController.payDirect);
router.get('/current-bank', paymentController.getCurrentBankStatus);
// Tạo đơn thanh toán ZaloPay
router.post('/zalopay/create', paymentController.createZaloPayPayment);

router.post('/vietqr/create', paymentController.createVietQR);
router.post('/casso', paymentController.handleCassoWebhook);
// Callback / IPN của ZaloPay
router.post('/zalopay/callback', paymentController.handleZaloPayIPN);
router.post('/confirm-online', paymentController.confirmOnlinePayment);

module.exports = router;

// routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const aiChatController = require('../controllers/aiChatController');

// Định nghĩa API: POST /api/ai-chat
router.post('/', aiChatController.handleChat);

module.exports = router;
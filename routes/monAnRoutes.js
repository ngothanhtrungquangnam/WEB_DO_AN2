// routes/monAnRoutes.js
const express = require('express');
const router = express.Router();
const monAnController = require('../controllers/monAnController');
const { protect, isAdmin } = require('../middleware/authMiddleware');
router.post('/', protect, isAdmin, monAnController.createMonAn);
router.patch('/:id', protect, isAdmin, monAnController.updateMonAn);
router.delete('/:id', protect, isAdmin, monAnController.deleteMonAn);
router.put('/:id', protect, isAdmin, monAnController.updateMonAn);
router.get('/', monAnController.getAllMonAn);
module.exports = router;
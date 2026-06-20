const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../../controllers/admin/dashboardController');
const { protect, adminOrInstitute } = require('../../middleware/authMiddleware');

router.get('/stats', protect, adminOrInstitute, getDashboardStats);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getTests, getTestById } = require('../../controllers/student/testController');
const { protect } = require('../../middleware/authMiddleware');

router.route('/')
    .get(protect, getTests);

router.route('/:id')
    .get(protect, getTestById);

module.exports = router;

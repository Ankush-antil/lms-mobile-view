const express = require('express');
const router = express.Router();
const { createTest, getTests, getTestById, updateTest, deleteTest } = require('../../controllers/admin/testController');
const { protect, admin } = require('../../middleware/authMiddleware');

router.route('/')
    .get(protect, getTests)
    .post(protect, admin, createTest);

router.route('/:id')
    .get(protect, getTestById)
    .put(protect, admin, updateTest)
    .delete(protect, admin, deleteTest);

module.exports = router;

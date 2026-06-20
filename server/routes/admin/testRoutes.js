const express = require('express');
const router = express.Router();
const { createTest, getTests, getTestById, updateTest, deleteTest } = require('../../controllers/admin/testController');
const { protect, admin, adminOrEditor } = require('../../middleware/authMiddleware');

router.route('/')
    .get(protect, getTests)
    .post(protect, adminOrEditor, createTest);

router.route('/:id')
    .get(protect, getTestById)
    .put(protect, adminOrEditor, updateTest)
    .delete(protect, adminOrEditor, deleteTest);

module.exports = router;

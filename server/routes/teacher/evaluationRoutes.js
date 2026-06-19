const express = require('express');
const router = express.Router();
const {
    getSubmissions,
    getSubmissionsByTest,
    getSubmissionById,
    evaluateSubmission
} = require('../../controllers/teacher/evaluationController');
const { protect } = require('../../middleware/authMiddleware');

router.route('/')
    .get(protect, getSubmissions);

router.route('/test/:testId')
    .get(protect, getSubmissionsByTest);

router.route('/:id')
    .get(protect, getSubmissionById);

router.route('/:id/evaluate')
    .put(protect, evaluateSubmission);

module.exports = router;

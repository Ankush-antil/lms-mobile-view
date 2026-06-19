const express = require('express');
const router = express.Router();
const {
    submitTest,
    getSubmissions,
    getSubmissionById,
    updateStudentComment
} = require('../../controllers/student/submissionController');
const { protect } = require('../../middleware/authMiddleware');

router.route('/')
    .get(protect, getSubmissions)
    .post(protect, submitTest);

router.route('/:id')
    .get(protect, getSubmissionById);

router.route('/:id/student-comment')
    .put(protect, updateStudentComment);

module.exports = router;

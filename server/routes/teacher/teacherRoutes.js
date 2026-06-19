const express = require('express');
const router = express.Router();
const { getTeacherStudents } = require('../../controllers/teacher/teacherController');
const { protect } = require('../../middleware/authMiddleware');

router.get('/', protect, getTeacherStudents);

module.exports = router;

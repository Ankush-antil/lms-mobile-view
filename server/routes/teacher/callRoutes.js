const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const uploadAudio = require('../../middleware/uploadAudio');

const {
    getAllTeachers,
    toggleTeacherCall,
    getMissedCalls,
    clearMissedCalls,
    markCallAsRead,
    uploadCallRecording,
    getStudentCallHistory,
    deleteCallRecording,
    deleteCallLog
} = require('../../controllers/teacher/callController');

router.get(
    '/teachers',
    protect,
    getAllTeachers
);

router.put(
    '/teachers/:teacherId/toggle',
    protect,
    toggleTeacherCall
);

router.get(
    '/missed',
    protect,
    getMissedCalls
);

router.post(
    '/missed/clear',
    protect,
    clearMissedCalls
);

router.post(
    '/missed/:id/read',
    protect,
    markCallAsRead
);

router.post(
    '/recordings/:callLogId',
    protect,
    uploadAudio.single('recording'),
    uploadCallRecording
);

router.delete(
    '/recordings/:callLogId',
    protect,
    deleteCallRecording
);

router.delete(
    '/history/:callLogId',
    protect,
    deleteCallLog
);

router.get(
    '/history/:studentId',
    protect,
    getStudentCallHistory
);

module.exports = router;

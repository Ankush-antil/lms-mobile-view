const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const uploadVideo = require('../middleware/uploadVideo');

const adminTestRoutes = require('./admin/testRoutes');
const studentTestRoutes = require('./student/testRoutes');

// Video upload route (admin/teacher only)
router.post('/upload/video',protect,admin,uploadVideo.single('video'),(req, res) => {
    console.log("FILE =>", req.file);
    res.json({
        success: true,
        videoUrl: `/uploads/videos/${req.file.filename}`
    });
}
);

const uploadAudio = require("../middleware/uploadAudio");

router.post("/upload/audio",protect,admin,uploadAudio.single("audio"),
    (req, res) => {
        res.status(200).json({
            success: true,
            audioUrl: `/uploads/audios/${req.file.filename}`,
        });
    }
);

// Gateway router: forwards requests based on user role
router.use((req, res, next) => {
    protect(req, res, () => {
        if (req.user && req.user.role === 'Student') {
            studentTestRoutes(req, res, next);
        } else {
            adminTestRoutes(req, res, next);
        }
    });
});

module.exports = router;
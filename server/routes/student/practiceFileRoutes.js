const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PracticeFile = require('../../models/PracticeFile');
const { protect } = require('../../middleware/authMiddleware');

const CLOUD_STORAGE_LIMIT_BYTES = 300 * 1024 * 1024; // 300 MB

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/practice');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/practice');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB max per file
    }
});

// @route   GET /api/practice-files
// @desc    Get all practice files uploaded by the student and the storage space usage
// @access  Private (Student)
router.get('/', protect, async (req, res) => {
    try {
        const filter = { user: req.user._id };
        if (req.query.googleDriveEmail) {
            filter.googleDriveEmail = req.query.googleDriveEmail;
        }
        if (req.query.inbox) {
            filter.inbox = req.query.inbox;
        }
        const files = await PracticeFile.find(filter).sort({ createdAt: -1 });
        
        // Calculate total space used
        const totalUsedBytes = files.reduce((sum, file) => sum + file.size, 0);
        
        res.json({
            files,
            limitBytes: CLOUD_STORAGE_LIMIT_BYTES,
            usedBytes: totalUsedBytes,
            remainingBytes: Math.max(0, CLOUD_STORAGE_LIMIT_BYTES - totalUsedBytes)
        });
    } catch (err) {
        console.error('[GET Practice Files Error]', err);
        res.status(500).json({ message: 'Server error retrieving practice files.' });
    }
});

// @route   POST /api/practice-files/upload
// @desc    Upload a practice file and verify storage limit
// @access  Private (Student)
router.post('/upload', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        const { toolType, duration, resolution, format, googleDriveEmail, inbox } = req.body;
        if (!toolType) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'Tool type is required.' });
        }

        // Fetch existing files size
        const existingFiles = await PracticeFile.find({ user: req.user._id });
        const totalUsedBytes = existingFiles.reduce((sum, file) => sum + file.size, 0);
        
        // Check if upload exceeds the 300MB limit
        if (totalUsedBytes + req.file.size > CLOUD_STORAGE_LIMIT_BYTES) {
            // Delete the file uploaded by multer
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                message: `Storage Limit Exceeded! You have used ${(totalUsedBytes / (1024 * 1024)).toFixed(1)}MB of your 300MB limit. This file requires ${(req.file.size / (1024 * 1024)).toFixed(1)}MB.`
            });
        }

        // Create practice file record
        const fileUrl = `/uploads/practice/${req.file.filename}`;
        const newFile = await PracticeFile.create({
            user: req.user._id,
            toolType,
            inbox: inbox || '',
            filename: req.file.originalname,
            fileUrl,
            size: req.file.size,
            mimeType: req.file.mimetype,
            googleDriveEmail: googleDriveEmail || '',
            metadata: {
                duration,
                resolution,
                format
            }
        });

        const updatedUsedBytes = totalUsedBytes + req.file.size;

        res.status(201).json({
            message: 'File uploaded to cloud successfully!',
            file: newFile,
            usedBytes: updatedUsedBytes,
            limitBytes: CLOUD_STORAGE_LIMIT_BYTES
        });
    } catch (err) {
        console.error('[Upload Practice File Error]', err);
        // Safely clean up file if it exists and error happened
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: 'Server error uploading practice file.' });
    }
});

// @route   DELETE /api/practice-files/:id
// @desc    Delete a practice file from cloud storage
// @access  Private (Student)
router.delete('/:id', protect, async (req, res) => {
    try {
        const file = await PracticeFile.findOne({ _id: req.params.id, user: req.user._id });
        if (!file) {
            return res.status(404).json({ message: 'File not found or unauthorized.' });
        }

        // Delete physical file
        const filePath = path.join(__dirname, '../../', file.fileUrl);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await file.deleteOne();

        // Recalculate space usage
        const remainingFiles = await PracticeFile.find({ user: req.user._id });
        const totalUsedBytes = remainingFiles.reduce((sum, f) => sum + f.size, 0);

        res.json({
            message: 'File deleted from cloud storage.',
            usedBytes: totalUsedBytes,
            limitBytes: CLOUD_STORAGE_LIMIT_BYTES
        });
    } catch (err) {
        console.error('[Delete Practice File Error]', err);
        res.status(500).json({ message: 'Server error deleting practice file.' });
    }
});

module.exports = router;

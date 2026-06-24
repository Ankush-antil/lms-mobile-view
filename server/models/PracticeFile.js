const mongoose = require('mongoose');

const practiceFileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    toolType: {
        type: String,
        required: true,
        enum: ['screenshot', 'screen-recorder', 'voice-recorder', 'video-recorder', 'web-calling']
    },
    inbox: {
        type: String,
        default: ''
    },
    filename: {
        type: String,
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    size: {
        type: Number, // in bytes
        required: true
    },
    mimeType: {
        type: String,
        default: 'application/octet-stream'
    },
    metadata: {
        duration: String, // for audio/video
        resolution: String, // for images/video
        format: String
    },
    googleDriveEmail: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

const PracticeFile = mongoose.model('PracticeFile', practiceFileSchema);
module.exports = PracticeFile;

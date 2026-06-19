const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
    caller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    guestName: {
        type: String
    },
    guestEmail: {
        type: String
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['initiated', 'connected', 'rejected', 'ended', 'missed'],
        default: 'initiated'
    },
    callType: {
        type: String,
        enum: ['audio', 'video'],
        default: 'audio'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    startTime: {
        type: Date
    },
    endTime: {
        type: Date
    },
    recordingUrl: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('CallLog', callLogSchema);
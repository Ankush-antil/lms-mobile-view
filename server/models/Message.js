const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        default: ''
    },
    fileUrl: {
        type: String,
        default: ''
    },
    fileName: {
        type: String,
        default: ''
    },
    fileType: {
        type: String,
        default: ''
    },
    isRead: {
        type: Boolean,
        default: false
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    originalText: {
        type: String,
        default: ''
    },
    inboxId: {
        type: String,
        default: ''
    },
    test: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test'
    },
    testTitle: {
        type: String,
        default: ''
    },
    questionIndex: {
        type: Number
    },
    questionText: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;

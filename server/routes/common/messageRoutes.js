const express = require('express');
const router = express.Router();
const { 
    getChatHistory, 
    markAsRead, 
    getRecentConversations, 
    uploadFile,
    sendMessage,
    editMessage
} = require('../../controllers/common/messageController');
const { protect } = require('../../middleware/authMiddleware');
const uploadAttachment = require('../../middleware/uploadAttachment');

router.route('/')
    .post(protect, sendMessage);

router.route('/conversations/recent')
    .get(protect, getRecentConversations);

router.route('/upload')
    .post(protect, uploadAttachment.single('file'), uploadFile);

router.get('/:contactId', protect, getChatHistory);
router.put('/:id', protect, editMessage);

router.route('/:contactId/read')
    .put(protect, markAsRead);

module.exports = router;

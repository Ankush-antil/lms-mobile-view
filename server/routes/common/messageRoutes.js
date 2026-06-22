const express = require('express');
const router = express.Router();
const { getChatHistory, markAsRead, getRecentConversations } = require('../../controllers/common/messageController');
const { protect } = require('../../middleware/authMiddleware');

router.route('/conversations/recent')
    .get(protect, getRecentConversations);

router.route('/:contactId')
    .get(protect, getChatHistory);

router.route('/:contactId/read')
    .put(protect, markAsRead);

module.exports = router;

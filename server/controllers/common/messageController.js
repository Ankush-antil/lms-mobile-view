const asyncHandler = require('express-async-handler');
const Message = require('../../models/Message');

// @desc    Get chat history with a specific contact
// @route   GET /api/messages/:contactId
// @access  Private
const getChatHistory = asyncHandler(async (req, res) => {
    const { contactId } = req.params;
    const userId = req.user._id;

    try {
        const messages = await Message.find({
            $or: [
                { sender: userId, receiver: contactId },
                { sender: contactId, receiver: userId }
            ]
        })
        .sort({ createdAt: 1 })
        .populate('sender', '_id name email role avatar')
        .populate('receiver', '_id name email role avatar');

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Mark all messages from a specific contact as read
// @route   PUT /api/messages/:contactId/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
    const { contactId } = req.params;
    const userId = req.user._id;

    try {
        await Message.updateMany(
            { sender: contactId, receiver: userId, isRead: false },
            { $set: { isRead: true } }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get recent conversations list for the current user
// @route   GET /api/messages/conversations/recent
// @access  Private
const getRecentConversations = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    try {
        const messages = await Message.find({
            $or: [{ sender: userId }, { receiver: userId }]
        })
        .sort({ createdAt: -1 })
        .populate('sender', '_id name email role avatar')
        .populate('receiver', '_id name email role avatar');

        const conversationsMap = {};
        messages.forEach(msg => {
            const isSender = msg.sender?._id.toString() === userId.toString();
            const contact = isSender ? msg.receiver : msg.sender;
            
            if (!contact) return; // Skip if contact deleted
            
            const contactId = contact._id.toString();

            if (!conversationsMap[contactId]) {
                conversationsMap[contactId] = {
                    contact,
                    lastMessage: msg,
                    unreadCount: 0
                };
            }

            if (!isSender && !msg.isRead) {
                conversationsMap[contactId].unreadCount += 1;
            }
        });

        res.json(Object.values(conversationsMap));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = {
    getChatHistory,
    markAsRead,
    getRecentConversations
};

const asyncHandler = require('express-async-handler');
const Message = require('../../models/Message');

// @desc    Get chat history with a specific contact
// @route   GET /api/messages/:contactId
// @access  Private
const getChatHistory = asyncHandler(async (req, res) => {
    const { contactId } = req.params;
    const userId = req.user._id;
    const { search, date, inboxId } = req.query;

    try {
        let query = {
            $or: [
                { sender: userId, receiver: contactId },
                { sender: contactId, receiver: userId }
            ]
        };

        if (inboxId !== undefined) {
            query.inboxId = inboxId || '';
        } else {
            query.inboxId = { $in: [null, '', undefined] };
        }

        if (search) {
            query.text = { $regex: search, $options: 'i' };
        }

        if (date) {
            const startOfDay = new Date(date + "T00:00:00.000Z");
            const endOfDay = new Date(date + "T23:59:59.999Z");
            query.createdAt = { $gte: startOfDay, $lte: endOfDay };
        }

        const messages = await Message.find(query)
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

// @desc    Upload file attachment for chat
// @route   POST /api/messages/upload
// @access  Private
const uploadFile = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/attachments/${req.file.filename}`;
    res.json({
        fileUrl,
        fileName: req.file.originalname,
        fileType: req.file.mimetype
    });
});

// @desc    Send a new message
// @route   POST /api/messages
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
    const { receiver, text, test, testTitle, questionIndex, questionText, fileUrl, fileName, fileType, inboxId } = req.body;
    const sender = req.user._id;

    if (!receiver || (!text && !fileUrl)) {
        return res.status(400).json({ message: 'Receiver and either text or file are required' });
    }

    const message = await Message.create({
        sender,
        receiver,
        text: text || '',
        isRead: false,
        test: test || null,
        testTitle: testTitle || '',
        questionIndex: questionIndex !== undefined ? Number(questionIndex) : undefined,
        questionText: questionText || '',
        fileUrl: fileUrl || '',
        fileName: fileName || '',
        fileType: fileType || '',
        inboxId: inboxId || ''
    });

    const populatedMsg = await Message.findById(message._id)
        .populate('sender', '_id name email role avatar')
        .populate('receiver', '_id name email role avatar');

    res.status(201).json(populatedMsg);
});

// @desc    Edit a message
// @route   PUT /api/messages/:id
// @access  Private
const editMessage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    try {
        const message = await Message.findById(id);

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (message.sender.toString() !== userId.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (!message.isEdited) {
            message.originalText = message.text;
            message.isEdited = true;
        }

        message.text = text;
        const updatedMessage = await message.save();

        const populatedMsg = await Message.findById(updatedMessage._id)
            .populate('sender', '_id name email role avatar')
            .populate('receiver', '_id name email role avatar');

        res.json(populatedMsg);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = {
    getChatHistory,
    markAsRead,
    getRecentConversations,
    uploadFile,
    sendMessage,
    editMessage
};

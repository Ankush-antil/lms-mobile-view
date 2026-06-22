const { Server } = require('socket.io');
const mongoose = require('mongoose');
const CallLog = require('./models/CallLog');

const onlineUsers = {}; // Map of userId -> socket.id

const initSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: true,
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log(`[SOCKET] Socket connected: ${socket.id}`);

        // Register user
        socket.on('register', ({ userId, role }) => {
            if (userId) {
                onlineUsers[userId] = socket.id;
                socket.userId = userId;
                socket.userRole = role;
                console.log(`[SOCKET] User registered: ${userId} (${role})`);
                io.emit('online-status-update', Object.keys(onlineUsers));
            }
        });

        // Request active list of online users
        socket.on('get-online-users', (callback) => {
            if (callback) {
                callback(Object.keys(onlineUsers));
            }
        });

        // Check if a user is online
        socket.on('check-online', ({ targetId }, callback) => {
            const isOnline = !!onlineUsers[targetId];
            if (callback) callback({ isOnline });
        });

        // Real-time Chat Messaging
        socket.on('send-message', async ({ receiverId, text }) => {
            console.log(`[SOCKET] Message from ${socket.userId} to ${receiverId}: ${text}`);
            if (!socket.userId) {
                console.error('[SOCKET] Cannot send message: Sender not registered');
                return;
            }
            try {
                const Message = require('./models/Message');
                const newMsg = await Message.create({
                    sender: socket.userId,
                    receiver: receiverId,
                    text: text
                });

                const populatedMsg = await Message.findById(newMsg._id)
                    .populate('sender', '_id name email role avatar')
                    .populate('receiver', '_id name email role avatar');

                // Broadcast to receiver if online
                const receiverSocketId = onlineUsers[receiverId];
                if (receiverSocketId) {
                    console.log(`[SOCKET] Routing real-time message to online user ${receiverId}`);
                    io.to(receiverSocketId).emit('new-message', populatedMsg);
                }

                // Acknowledge back to sender
                socket.emit('message-sent', populatedMsg);
            } catch (err) {
                console.error('[SOCKET] Error processing send-message:', err);
                socket.emit('message-send-error', { error: err.message });
            }
        });

        // Start a call
        socket.on('call-user', async ({ targetId, offer, callerName, callerId, callType }) => {
            const resolvedCallType = callType === 'video' ? 'video' : 'audio';
            console.log(`[SOCKET] ${resolvedCallType} call from ${callerId} (${callerName}) to target ${targetId}`);
            const receiverSocketId = onlineUsers[targetId];
            const isGuest = callerId && callerId.toString().startsWith('guest_');

            if (!receiverSocketId) {
                console.log(`[SOCKET] Receiver ${targetId} is offline. Creating missed call.`);
                try {
                    await CallLog.create({
                        caller: isGuest ? null : callerId,
                        guestName: isGuest ? callerName : undefined,
                        guestEmail: isGuest ? callerId.replace('guest_', '') : undefined,
                        receiver: targetId,
                        status: 'missed',
                        callType: resolvedCallType,
                        isRead: false
                    });
                } catch (err) {
                    console.error('[SOCKET] Error logging missed call:', err);
                }
                socket.emit('user-offline', { targetId });
                return;
            }

            let callLogId = null;
            try {
                const log = await CallLog.create({
                    caller: isGuest ? null : callerId,
                    guestName: isGuest ? callerName : undefined,
                    guestEmail: isGuest ? callerId.replace('guest_', '') : undefined,
                    receiver: targetId,
                    status: 'initiated',
                    callType: resolvedCallType
                });
                callLogId = log._id;
            } catch (err) {
                console.error('[SOCKET] Error logging initiated call:', err);
            }

            io.to(receiverSocketId).emit('incoming-call', {
                offer,
                callerId,
                callerName,
                callLogId,
                callType: resolvedCallType
            });
        });

        // Answer call
        socket.on('accept-call', async ({ callerId, answer, callLogId }) => {
            console.log(`[SOCKET] Call accepted by ${socket.userId} for caller ${callerId}`);
            const callerSocketId = onlineUsers[callerId];

            if (callLogId) {
                try {
                    await CallLog.findByIdAndUpdate(callLogId, {
                        status: 'connected',
                        startTime: new Date()
                    });
                } catch (err) {
                    console.error('[SOCKET] Error updating call log to connected:', err);
                }
            }

            if (callerSocketId) {
                io.to(callerSocketId).emit('call-accepted', { answer, callLogId });
            }
        });

        // Reject call
        socket.on('reject-call', async ({ callerId, callLogId }) => {
            console.log(`[SOCKET] Call rejected by ${socket.userId} for caller ${callerId}`);
            const callerSocketId = onlineUsers[callerId];

            if (callLogId) {
                try {
                    await CallLog.findByIdAndUpdate(callLogId, {
                        status: 'rejected'
                    });
                } catch (err) {
                    console.error('[SOCKET] Error updating call log to rejected:', err);
                }
            }

            if (callerSocketId) {
                io.to(callerSocketId).emit('call-rejected');
            }
        });

        // End call
        socket.on('end-call', async ({ targetId, callLogId }) => {
            console.log(`[SOCKET] Call ended by ${socket.userId} with target ${targetId}`);
            const targetSocketId = onlineUsers[targetId];

            if (callLogId) {
                try {
                    await CallLog.findByIdAndUpdate(callLogId, {
                        status: 'ended',
                        endTime: new Date()
                    });
                } catch (err) {
                    console.error('[SOCKET] Error updating call log to ended:', err);
                }
            }

            if (targetSocketId) {
                io.to(targetSocketId).emit('call-ended');
            }
        });

        // Exchange ICE candidates
        socket.on('ice-candidate', ({ targetId, candidate }) => {
            const targetSocketId = onlineUsers[targetId];
            if (targetSocketId) {
                io.to(targetSocketId).emit('ice-candidate', { candidate });
            }
        });

        // Handle disconnect
        socket.on('disconnect', async () => {
            console.log(`[SOCKET] Socket disconnected: ${socket.id}`);
            const userId = socket.userId;
            if (userId && onlineUsers[userId] === socket.id) {
                delete onlineUsers[userId];
                console.log(`[SOCKET] Deregistered user: ${userId}`);
                io.emit('online-status-update', Object.keys(onlineUsers));

                // Clean up any active/hanging calls this user was in
                try {
                    const activeCalls = await CallLog.find({
                        $or: [
                            { caller: mongoose.Types.ObjectId.isValid(userId) ? userId : null },
                            { receiver: mongoose.Types.ObjectId.isValid(userId) ? userId : null },
                            { guestEmail: userId.toString().startsWith('guest_') ? userId.toString().replace('guest_', '') : null }
                        ],
                        status: { $in: ['initiated', 'connected'] }
                    });

                    for (const call of activeCalls) {
                        const isUserCaller = (call.caller && call.caller.toString() === userId.toString()) || 
                                             (call.guestEmail && ('guest_' + call.guestEmail) === userId.toString());
                        const otherUserId = isUserCaller ? call.receiver : (call.caller || ('guest_' + call.guestEmail));
                        const otherSocketId = onlineUsers[otherUserId];
                        
                        // Update DB status
                        call.status = call.status === 'initiated' ? 'missed' : 'ended';
                        call.endTime = new Date();
                        await call.save();

                        // Notify the other user
                        if (otherSocketId) {
                            io.to(otherSocketId).emit('call-ended');
                        }
                    }
                } catch (err) {
                    console.error('[SOCKET] Error cleaning up active calls on disconnect:', err);
                }
            }
        });
    });

    return io;
};

module.exports = {
    initSocket
};
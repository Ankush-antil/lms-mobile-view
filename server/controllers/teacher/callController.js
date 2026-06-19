const User = require('../../models/User');
const CallLog = require('../../models/CallLog');

exports.getAllTeachers = async (req, res) => {
    try {

        const teachers = await User.find({
            role: 'Teacher',
            isActive: true
        }).select(
            '_id name email callEnabled'
        );

        res.json(teachers);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
};

exports.toggleTeacherCall = async (req, res) => {
    try {

        const { teacherId } = req.params;

        const teacher = await User.findById(
            teacherId
        );

        if (!teacher) {
            return res.status(404).json({
                message: 'Teacher not found'
            });
        }

        teacher.callEnabled =
            !teacher.callEnabled;

        await teacher.save();

        res.json({
            success: true,
            callEnabled:
                teacher.callEnabled
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
};

exports.getMissedCalls = async (req, res) => {
    try {
        const missedCalls = await CallLog.find({
            receiver: req.user._id,
            status: 'missed',
            isRead: false
        })
        .populate('caller', '_id name email role')
        .sort({ createdAt: -1 });

        res.json(missedCalls);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

exports.clearMissedCalls = async (req, res) => {
    try {
        await CallLog.updateMany(
            { receiver: req.user._id, status: 'missed', isRead: false },
            { $set: { isRead: true } }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

exports.markCallAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const call = await CallLog.findOneAndUpdate(
            { _id: id, receiver: req.user._id },
            { $set: { isRead: true } },
            { new: true }
        );
        if (!call) {
            return res.status(404).json({
                message: 'Call log not found'
            });
        }
        res.json({ success: true, call });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

exports.uploadCallRecording = async (req, res) => {
    try {
        const { callLogId } = req.params;
        if (!req.file) {
            return res.status(400).json({ message: 'No recording file uploaded' });
        }

        const recordingUrl = `/uploads/audios/${req.file.filename}`;

        const callLog = await CallLog.findByIdAndUpdate(
            callLogId,
            { recordingUrl },
            { new: true }
        );

        if (!callLog) {
            return res.status(404).json({ message: 'Call log not found' });
        }

        res.json({ success: true, recordingUrl, callLog });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getStudentCallHistory = async (req, res) => {
    try {
        const { studentId } = req.params;
        const teacherId = req.user._id;

        const isGuest = studentId.startsWith('guest_');
        let query = {};
        if (isGuest) {
            const guestEmail = studentId.replace('guest_', '');
            query = {
                receiver: teacherId,
                guestEmail: guestEmail
            };
        } else {
            query = {
                $or: [
                    { caller: teacherId, receiver: studentId },
                    { caller: studentId, receiver: teacherId }
                ]
            };
        }

        const history = await CallLog.find(query)
            .populate('caller', '_id name email role')
            .populate('receiver', '_id name email role')
            .sort({ createdAt: -1 });

        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteCallRecording = async (req, res) => {
    try {
        const { callLogId } = req.params;
        const callLog = await CallLog.findById(callLogId);

        if (!callLog) {
            return res.status(404).json({ message: 'Call log not found' });
        }

        if (callLog.recordingUrl) {
            const fs = require('fs');
            const path = require('path');
            const filePath = path.join(__dirname, '../..', callLog.recordingUrl);
            
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            callLog.recordingUrl = undefined;
            await callLog.save();
        }

        res.json({ success: true, message: 'Recording deleted successfully', callLog });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteCallLog = async (req, res) => {
    try {
        const { callLogId } = req.params;
        const callLog = await CallLog.findById(callLogId);

        if (!callLog) {
            return res.status(404).json({ message: 'Call log not found' });
        }

        if (callLog.recordingUrl) {
            const fs = require('fs');
            const path = require('path');
            const filePath = path.join(__dirname, '../..', callLog.recordingUrl);
            
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await CallLog.findByIdAndDelete(callLogId);

        res.json({ success: true, message: 'Call log deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


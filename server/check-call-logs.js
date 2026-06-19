const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const User = require('./models/User');
const CallLog = require('./models/CallLog');

async function checkLogs() {
    try {
        console.log("Connecting to:", process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected!\n");

        console.log("Fetching latest 10 Call Logs...");
        const logs = await CallLog.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('caller', 'name email role')
            .populate('receiver', 'name email role');

        logs.forEach((log, idx) => {
            console.log(`[LOG #${idx + 1}]`);
            console.log(`- ID: ${log._id}`);
            console.log(`- Status: ${log.status}`);
            console.log(`- Type: ${log.callType}`);
            console.log(`- Caller: ${log.caller ? `${log.caller.name} (${log.caller.role})` : (log.guestName ? `${log.guestName} (Guest)` : 'Unknown')}`);
            console.log(`- Receiver: ${log.receiver ? `${log.receiver.name} (${log.receiver.role})` : 'Unknown'}`);
            console.log(`- Created At: ${log.createdAt}`);
            console.log(`- Start Time: ${log.startTime}`);
            console.log(`- End Time: ${log.endTime}`);
            console.log('------------------------------------');
        });

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

checkLogs();

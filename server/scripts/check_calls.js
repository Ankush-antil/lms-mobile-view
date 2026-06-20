const mongoose = require('mongoose');
const User = require('../models/User');
const CallLog = require('../models/CallLog');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '../.env') });

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const calls = await CallLog.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('caller', 'name email role')
            .populate('receiver', 'name email role');
            
        console.log("================ RECENT 10 CALL LOGS ================");
        calls.forEach((c, idx) => {
            console.log(`[${idx + 1}] ID: ${c._id}`);
            console.log(`    Caller: ${c.caller ? `${c.caller.name} (${c.caller.role})` : `Guest: ${c.guestName} (${c.guestEmail})`}`);
            console.log(`    Receiver: ${c.receiver ? `${c.receiver.name} (${c.receiver.role})` : 'N/A'}`);
            console.log(`    Status: ${c.status}`);
            console.log(`    Created: ${c.createdAt}`);
            console.log(`--------------------------------------------------`);
        });
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
check();

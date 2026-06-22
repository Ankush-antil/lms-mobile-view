const mongoose = require('mongoose');
const Institute = require('../models/Institute');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://digitalstudy5555_db_user:t040XELTgLuIXZgq@digitalstudycluster.tkpcaax.mongodb.net/');
        console.log("Connected to MongoDB");

        const institute = await Institute.findOne({ code: 'DSI20026' });
        if (!institute) {
            console.error("Institute DSI20026 not found");
            return;
        }

        console.log(`\nFound institute: ${institute.name}`);
        const userBefore = await User.findOne({ institute: institute._id, role: 'Institute' });
        if (!userBefore) {
            console.error("User portal account not found");
            return;
        }
        
        const oldHash = userBefore.password;
        console.log(`Original password hash: ${oldHash}`);

        // Simulate password update
        const newPasswordTest = 'new_inst_pass_123';
        userBefore.password = newPasswordTest;
        await userBefore.save();

        const userAfter = await User.findOne({ institute: institute._id, role: 'Institute' });
        const newHash = userAfter.password;
        console.log(`New password hash: ${newHash}`);

        if (oldHash === newHash) {
            console.error("FAIL: Password hash did not change!");
        } else {
            console.log("SUCCESS: Password hash changed.");
        }

        const isMatch = await bcrypt.compare(newPasswordTest, newHash);
        if (isMatch) {
            console.log("SUCCESS: New password matches the hash correctly.");
        } else {
            console.error("FAIL: New password does not match hash.");
        }

        // Revert it back to something known, e.g., '123456' or whatever it was
        userAfter.password = '123456';
        await userAfter.save();
        console.log("Reverted password back to '123456'");

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}

run();

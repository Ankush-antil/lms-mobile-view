const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const connectDB = require('../config/db');

dotenv.config({ path: require('path').join(__dirname, '../.env') });

const resetUser = async () => {
    try {
        await connectDB();

        const users = await User.find({ email: /rahul/i });
        for (let user of users) {
            console.log(`Resetting ${user.email}...`);
            user.password = 'rahul';
            await user.save();
            console.log(`Success: ${user.email} password is now "rahul"`);
        }

        process.exit();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

resetUser();

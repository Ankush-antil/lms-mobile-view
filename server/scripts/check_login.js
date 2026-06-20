const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '../.env') });

const checkUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: /rahul/i });
        if (user) {
            console.log('USER_FOUND:');
            console.log('Name:', user.name);
            console.log('Email:', user.email);
            console.log('Role:', user.role);
            console.log('Password (hashed):', user.password);
        } else {
            console.log('USER_NOT_FOUND');
        }
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
checkUser();

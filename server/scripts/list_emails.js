const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '../.env') });

const checkEmails = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({ role: 'Student' });
        users.forEach(u => console.log(`Email: "${u.email}" | Name: "${u.name}"`));
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
checkEmails();

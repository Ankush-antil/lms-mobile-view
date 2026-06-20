require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const checkDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        const users = await User.find({}, 'name email role password');
        console.log('Users in DB:');
        users.forEach(u => {
            console.log(`- ${u.name} (${u.email}) [${u.role}] password_hash: ${u.password.substring(0, 10)}...`);
        });
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkDB();

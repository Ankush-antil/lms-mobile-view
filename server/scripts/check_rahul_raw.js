const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '../.env') });

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const rahul = await User.findOne({ name: 'rahul' });
        console.log('NAME:', rahul.name);
        console.log('INST_ID:', rahul.institute); // Check if it's an ObjectId or a String
        console.log('INST_TYPE:', typeof rahul.institute);
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
check();

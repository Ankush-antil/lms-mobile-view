const mongoose = require('mongoose');
const Institute = require('../models/Institute');
const User = require('../models/User');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '../.env') });

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const rahul = await User.findOne({ name: 'rahul' });
        if (!rahul) {
            console.log('Rahul not found');
            process.exit();
        }
        const inst = await Institute.findById(rahul.institute);
        console.log('INST_DOC_NAME:', inst?.name);
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
check();

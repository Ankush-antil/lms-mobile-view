const mongoose = require('mongoose');
const Test = require('../models/Test');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '../.env') });

const checkTests = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const tests = await Test.find({});
        console.log('TESTS:');
        tests.forEach(t => {
            console.log(`Title: ${t.title} | Category (Activity): ${t.activity}`);
        });
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
checkTests();

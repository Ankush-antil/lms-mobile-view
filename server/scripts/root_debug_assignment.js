const mongoose = require('mongoose');
const User = require('../models/User');
const Test = require('../models/Test');
const Institute = require('../models/Institute');
const Course = require('../models/Course');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '../.env') });

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const students = await User.find({ role: 'Student' })
            .populate('institute')
            .populate('studentProfile.course');

        console.log('\n--- STUDENTS ---');
        students.forEach(s => {
            console.log(`Name: ${s.name}`);
            console.log(`Email: ${s.email}`);
            console.log(`Institute Name: ${s.institute?.name}`);
            console.log(`Course Name: ${s.studentProfile?.course?.name}`);
            console.log(`Subject: "${s.studentProfile?.subject}"`);
            console.log('----------------');
        });

        const tests = await Test.find({});
        console.log('\n--- TESTS ---');
        tests.forEach(t => {
            console.log(`Title: ${t.title}`);
            console.log(`Institute: "${t.institute}"`);
            console.log(`Course: "${t.course}"`);
            console.log(`Subject: "${t.subject}"`);
            console.log('----------------');
        });

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debug();

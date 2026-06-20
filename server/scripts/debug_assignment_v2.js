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

        const students = await User.find({ role: 'Student' }).populate('institute').populate('studentProfile.course');
        console.log('STUDENT_COUNT:', students.length);
        students.forEach(s => {
            console.log(`STUDENT|${s.name}|${s.institute?.name?.trim()}|${s.studentProfile?.course?.name?.trim()}|${s.studentProfile?.subject}`);
        });

        const tests = await Test.find({});
        console.log('TEST_COUNT:', tests.length);
        tests.forEach(t => {
            console.log(`TEST|${t.title}|${t.institute?.trim()}|${t.course?.trim()}|${t.subject?.trim()}`);
        });

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debug();


const mongoose = require('mongoose');
require('../models/Institute');
require('../models/Course');
const User = require('../models/User');
const Test = require('../models/Test');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const students = await User.find({ role: 'Student' })
            .populate('institute')
            .populate('studentProfile.course');

        console.log('STUDENTS_START');
        students.forEach(s => {
            console.log(JSON.stringify({
                name: s.name,
                email: s.email,
                institute: s.institute?.name,
                course: s.studentProfile?.course?.name
            }));
        });
        console.log('STUDENTS_END');

        const tests = await Test.find({});
        console.log('TESTS_START');
        tests.forEach(t => {
            console.log(JSON.stringify({
                title: t.title,
                institute: t.institute,
                course: t.course,
                subject: t.subject
            }));
        });
        console.log('TESTS_END');

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
debug();

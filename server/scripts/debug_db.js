
const mongoose = require('mongoose');
const User = require('../models/User');
const Test = require('../models/Test');
const Institute = require('../models/Institute');
const Course = require('../models/Course');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const students = await User.find({ role: 'Student' }).populate('institute').populate('studentProfile.course');
        console.log('\n--- Students ---');
        students.forEach(s => {
            console.log(`Name: ${s.name}, Institute: ${s.institute?.name}, Course: ${s.studentProfile?.course?.name}`);
        });

        const tests = await Test.find({});
        console.log('\n--- Tests ---');
        tests.forEach(t => {
            console.log(`Title: ${t.title}, Institute: ${t.institute}, Course: ${t.course}, Subject: ${t.subject}`);
        });

        const institutes = await Institute.find({});
        console.log('\n--- Institutes ---');
        institutes.forEach(i => console.log(`Name: ${i.name}`));

        const courses = await Course.find({}).populate('institute');
        console.log('\n--- Courses ---');
        courses.forEach(c => console.log(`Name: ${c.name}, Institute: ${c.institute?.name}`));

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

debug();

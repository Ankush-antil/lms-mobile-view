const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Test = require('../models/Test');
const Submission = require('../models/Submission');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://digitalstudy5555_db_user:t040XELTgLuIXZgq@digitalstudycluster.tkpcaax.mongodb.net/');
        console.log("Connected to MongoDB");
        
        const users = await User.find({}).populate('studentProfile.course').populate('teacherProfile.assignedCourses');
        console.log(`Total users found: ${users.length}`);
        
        console.log("\n--- Teachers ---");
        const teachers = users.filter(u => u.role === 'Teacher');
        teachers.forEach(t => {
            console.log(`Teacher ID: ${t._id}, Name: ${t.name}, Email: ${t.email}`);
            console.log(`  Assigned Courses:`, t.teacherProfile?.assignedCourses?.map(c => c.name));
            console.log(`  Subjects:`, t.teacherProfile?.subjects);
        });
        
        console.log("\n--- Students ---");
        const students = users.filter(u => u.role === 'Student');
        students.forEach(s => {
            console.log(`Student ID: ${s._id}, Name: ${s.name}, Email: ${s.email}`);
            console.log(`  Course:`, s.studentProfile?.course?.name);
            console.log(`  Subject:`, s.studentProfile?.subject);
        });

        console.log("\n--- Submissions ---");
        const submissions = await Submission.find({}).populate('student').populate('test');
        console.log(`Total submissions found: ${submissions.length}`);
        submissions.slice(0, 10).forEach(sub => {
            console.log(`Sub ID: ${sub._id}, Student: ${sub.student?.name}, Test: ${sub.test?.title}, Status: ${sub.status}`);
        });

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}

run();

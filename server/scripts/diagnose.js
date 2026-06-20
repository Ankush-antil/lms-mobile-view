const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Submission = require('../models/Submission');
const connectDB = require('../config/db');

dotenv.config({ path: require('path').join(__dirname, '../.env') });

const diagnose = async () => {
    try {
        await connectDB();
        console.log('DB Connected.');

        const teacher = await User.findOne({ email: /rahul1@gmail.com/i });
        if (!teacher) {
            console.log('Teacher Rahul1 not found.');
            process.exit();
        }

        console.log('Found Teacher:', teacher.name, 'ID:', teacher._id);
        console.log('Teacher Profile:', JSON.stringify(teacher.teacherProfile, null, 2));

        const assignedCourses = teacher.teacherProfile?.assignedCourses || [];
        console.log('Assigned Courses:', assignedCourses);

        const students = await User.find({
            role: 'Student',
            'studentProfile.course': { $in: assignedCourses }
        }).populate('studentProfile.course');

        console.log('Students found:', students.length);
        for (const s of students) {
            console.log(` - ${s.name} (${s.email}) Course: ${s.studentProfile?.course?.name}`);
            const subs = await Submission.find({ student: s._id });
            console.log(`   - Submissions: ${subs.length}`);
        }

        process.exit();
    } catch (error) {
        console.error('DIAGNOSTIC FAILED:', error);
        process.exit(1);
    }
};

diagnose();

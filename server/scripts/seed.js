const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const connectDB = require('../config/db');

dotenv.config({ path: require('path').join(__dirname, '../.env') });

const seedData = async () => {
    try {
        await connectDB();

        console.log('Checking for existing users...');
        const userExists = await User.findOne({ email: 'admin@lms.com' });

        if (userExists) {
            console.log('Admin user already exists. Resetting password...');
            userExists.password = 'admin';
            await userExists.save();
        } else {
            console.log('Creating admin user...');
            await User.create({
                name: 'Admin User',
                email: 'admin@lms.com',
                password: 'admin',
                role: 'Admin'
            });
            console.log('Admin user created successfully.');
        }

        // Teacher
        const teacherExists = await User.findOne({ email: 'teacher@lms.com' });
        if (teacherExists) {
            console.log('Teacher user already exists.');
        } else {
            console.log('Creating teacher user...');
            await User.create({
                name: 'Teacher User',
                email: 'teacher@lms.com',
                password: 'teacher',
                role: 'Teacher',
                teacherProfile: {
                    subjects: ['Mathematics', 'Physics']
                }
            });
            console.log('Teacher user created successfully.');
        }

        // Student
        const studentExists = await User.findOne({ email: 'student@lms.com' });
        if (studentExists) {
            console.log('Student user already exists.');
        } else {
            console.log('Creating student user...');
            await User.create({
                name: 'Student User',
                email: 'student@lms.com',
                password: 'student',
                role: 'Student',
                studentProfile: {
                    course: null, // connect to a course later if needed
                    enrollmentDate: new Date()
                }
            });
            console.log('Student user created successfully.');
        }

        // Setup Initial Data (Institute & Course)
        const Institute = require('../models/Institute');
        const Course = require('../models/Course');

        let institute = await Institute.findOne({ name: 'Digital Study Institute' });
        if (!institute) {
            console.log('Creating initial institute...');
            institute = await Institute.create({
                name: 'Digital Study Institute',
                code: 'DSI001',
                address: 'Main St, Education Hub',
                contactEmail: 'contact@digitalstudy.com'
            });
            console.log('Institute created.');
        }

        let course = await Course.findOne({ name: 'Web Development Bootcamp' });
        if (!course) {
            console.log('Creating initial course...');
            course = await Course.create({
                name: 'Web Development Bootcamp',
                code: 'WDB01',
                description: 'Full stack development with React and Node',
                institute: institute._id,
                subjects: ['React', 'NodeJS', 'MongoDB', 'CSS']
            });
            console.log('Course created.');
        }

        // Link existing users to the new institute for a fresh start
        await User.updateMany({ role: 'Admin' }, { institute: institute._id });
        await User.updateMany({ role: 'Teacher' }, { institute: institute._id });
        const student = await User.findOne({ email: 'student@lms.com' });
        if (student) {
            student.institute = institute._id;
            student.studentProfile.course = course._id;
            student.studentProfile.subject = 'React';
            await student.save();
        }
        const teacher = await User.findOne({ email: 'teacher@lms.com' });
        if (teacher) {
            teacher.teacherProfile.assignedCourses = [course._id];
            await teacher.save();
        }

        process.exit();
    } catch (error) {
        console.error('Error seeding data:', error.message);
        process.exit(1);
    }
};

seedData();

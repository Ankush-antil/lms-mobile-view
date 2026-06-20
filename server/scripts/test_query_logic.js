const mongoose = require('mongoose');
const User = require('../models/User');
const Test = require('../models/Test');
const Institute = require('../models/Institute');
const Course = require('../models/Course');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '../.env') });

const testQuery = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const rahul = await User.findOne({ name: 'rahul' }).populate('institute').populate('studentProfile.course');
        if (!rahul) {
            console.log('Rahul not found');
            process.exit();
        }

        const studentInstitute = rahul.institute?.name?.trim();
        const studentSubject = rahul.studentProfile?.subject?.trim();

        console.log(`Student: "${rahul.name}"`);
        console.log(`Inst: "${studentInstitute}"`);
        console.log(`Subs: "${studentSubject}"`);

        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        let query = {};
        if (studentInstitute) {
            query.institute = { $regex: new RegExp(`^\\s*${escapeRegex(studentInstitute)}\\s*$`, 'i') };
        }

        if (studentSubject) {
            const subjects = studentSubject.split(',').map(s => s.trim()).filter(Boolean);
            if (subjects.length > 0) {
                query.subject = {
                    $in: subjects.map(sub => new RegExp(`^\\s*${escapeRegex(sub)}\\s*$`, 'i'))
                };
            }
        }

        console.log('Final Query:', JSON.stringify(query));

        const tests = await Test.find(query);
        console.log('Results Count:', tests.length);
        tests.forEach(t => console.log(` - ${t.title} (${t.subject})`));

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

testQuery();

const asyncHandler = require('express-async-handler');
const Test = require('../../models/Test');
const User = require('../../models/User');

// @desc    Get assigned tests for a Student
// @route   GET /api/student/tests
// @access  Private/Student
const getTests = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
        .populate('institute')
        .populate('studentProfile.course');

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const studentInstitute = user.institute?.name?.trim();
    const studentCourse = user.studentProfile?.course?.name?.trim();
    const studentSubject = user.studentProfile?.subject?.trim();

    console.log(`[Student-Tests-Query] Processing for ${user.name}`);
    console.log(`[Student-Tests-Query] Student Details: Inst="${studentInstitute}", Course="${studentCourse}", Subjects="${studentSubject}"`);

    if (!studentInstitute) {
        console.warn(`[Student-Tests-Query] Student ${user.name} missing institute.`);
        return res.json([]);
    }

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let query = {};

    // 1. MUST match Institute (case-insensitive, flexible whitespace)
    query.institute = { $regex: new RegExp(`^\\s*${escapeRegex(studentInstitute)}\\s*$`, 'i') };

    // 2. MUST match at least one Subject from student's comma-separated list
    if (studentSubject) {
        const subjects = studentSubject.split(',').map(s => s.trim()).filter(Boolean);
        if (subjects.length > 0) {
            query.subject = {
                $in: subjects.map(sub => new RegExp(`^\\s*${escapeRegex(sub)}\\s*$`, 'i'))
            };
        } else {
            query.subject = { $in: [null, '', undefined] };
        }
    } else {
        query.subject = { $in: [null, '', undefined] };
    }

    // 3. IF the student has a course AND the test has a course name, they should match
    // If the test has NO course name, it's visible to any course in that institute/subject.
    if (studentCourse) {
        query.$or = [
            { course: { $in: [null, '', undefined] } },
            { course: { $regex: new RegExp(`^\\s*${escapeRegex(studentCourse)}\\s*$`, 'i') } }
        ];
    }

    console.log(`[Student-Tests-Query] Formulated Query:`, JSON.stringify(query));

    const tests = await Test.find(query).sort({ createdAt: -1 });
    console.log(`[Student-Tests] Found ${tests.length} tests for ${user.name}`);
    res.json(tests);
});

// @desc    Get test details by ID (for Student)
// @route   GET /api/student/tests/:id
// @access  Private/Student
const getTestById = asyncHandler(async (req, res) => {
    const test = await Test.findById(req.params.id);
    if (!test) {
        res.status(404);
        throw new Error('Test not found');
    }
    res.json(test);
});

module.exports = { getTests, getTestById };

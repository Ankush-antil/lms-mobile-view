const asyncHandler = require('express-async-handler');
const User = require('../../models/User');
const Course = require('../../models/Course');
const Test = require('../../models/Test');
const Activity = require('../../models/Activity');
const Institute = require('../../models/Institute');

// @desc    Get dashboard stats and activities
// @route   GET /api/dashboard/stats
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
    let studentQuery = { role: 'Student' };
    let teacherQuery = { role: 'Teacher' };
    let editorQuery = { role: 'Editor' };
    let courseQuery = {};
    let testQuery = {};
    let activityQuery = {};

    if (req.user && req.user.role === 'Institute') {
        const instId = req.user.institute;
        studentQuery.institute = instId;
        teacherQuery.institute = instId;
        editorQuery.institute = instId;
        courseQuery.institute = instId;

        // Tests: filter by either institute ID (ObjectId) or matching name string
        const instituteDoc = await Institute.findById(instId);
        const instName = instituteDoc ? instituteDoc.name : '';
        testQuery.$or = [
            { institute: instId },
            { institute: instName }
        ];

        // Activities: filter by activities created by users belonging to this institute
        const instituteUsers = await User.find({ institute: instId }).select('_id');
        const userIds = instituteUsers.map(u => u._id);
        activityQuery.user = { $in: userIds };
    }

    const studentCount = await User.countDocuments(studentQuery);
    const teacherCount = await User.countDocuments(teacherQuery);
    const editorCount = await User.countDocuments(editorQuery);
    const courseCount = await Course.countDocuments(courseQuery);
    const testCount = await Test.countDocuments(testQuery);

    const activities = await Activity.find(activityQuery)
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'name');

    res.json({
        stats: {
            students: studentCount,
            teachers: teacherCount,
            editors: editorCount,
            courses: courseCount,
            tests: testCount
        },
        activities
    });
});

module.exports = { getDashboardStats };

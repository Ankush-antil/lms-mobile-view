const asyncHandler = require('express-async-handler');
const User = require('../../models/User');
const Course = require('../../models/Course');
const Test = require('../../models/Test');
const Activity = require('../../models/Activity');

// @desc    Get dashboard stats and activities
// @route   GET /api/dashboard/stats
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
    const studentCount = await User.countDocuments({ role: 'Student' });
    const teacherCount = await User.countDocuments({ role: 'Teacher' });
    const editorCount = await User.countDocuments({ role: 'Editor' });
    const courseCount = await Course.countDocuments({});
    const testCount = await Test.countDocuments({});

    const activities = await Activity.find({})
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

const asyncHandler = require('express-async-handler');
const User = require('../../models/User');
const Test = require('../../models/Test');
const Submission = require('../../models/Submission');

// @desc    Get students for the logged in teacher
// @route   GET /api/users/teacher-students
// @access  Private (Teacher)
const getTeacherStudents = asyncHandler(async (req, res) => {
    try {
        const teacher = await User.findById(req.user._id).populate('teacherProfile.assignedCourses', 'name');
        if (!teacher || teacher.role !== 'Teacher') {
            return res.status(403).json({ message: 'Not authorized as a teacher' });
        }

        const assignedCourses = teacher.teacherProfile?.assignedCourses || [];
        const courseIds = assignedCourses.map(c => c._id || c);
        console.log(`[API] Teacher ${teacher.name} fetching students for courses:`, courseIds);

        // Find students whose course ID is in the teacher's assignedCourses list
        const students = await User.find({
            role: 'Student',
            'studentProfile.course': { $in: courseIds }
        })
            .select('-password')
            .populate('institute', 'name')
            .populate('studentProfile.course', 'name');

        const studentsWithStats = await Promise.all(students.map(async (student) => {
            try {
                // Find tests matching teacher's assignments
                const matchingTests = await Test.find({
                    $or: [
                        { course: { $in: teacher.teacherProfile?.assignedCourses?.map(c => c.name) || [] } },
                        { subject: { $in: teacher.teacherProfile?.subjects || [] } }
                    ]
                }).select('_id');
                const testIds = matchingTests.map(t => t._id);

                const subs = await Submission.find({
                    student: student._id,
                    test: { $in: testIds }
                });

                return {
                    ...student.toObject(),
                    stats: {
                        pending: subs.filter(s => s.status === 'submitted').length,
                        completed: subs.filter(s => s.status === 'evaluated').length,
                        total: subs.length
                    }
                };
            } catch (err) {
                console.error(`Error processing stats for student ${student._id}:`, err);
                return { ...student.toObject(), stats: { pending: 0, completed: 0, total: 0 } };
            }
        }));

        res.json(studentsWithStats);
    } catch (error) {
        console.error('CRITICAL ERROR IN getTeacherStudents:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = {
    getTeacherStudents
};

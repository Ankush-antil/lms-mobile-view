const asyncHandler = require('express-async-handler');
const User = require('../../models/User');
const Test = require('../../models/Test');
const Submission = require('../../models/Submission');

// @desc    Get students for the logged in teacher
// @route   GET /api/users/teacher-students
// @access  Private (Teacher)
const getTeacherStudents = asyncHandler(async (req, res) => {
    try {
        const teacher = await User.findById(req.user._id)
            .populate('teacherProfile.assignedCourses', 'name')
            .populate('institute', 'name');
            
        if (!teacher || teacher.role !== 'Teacher') {
            return res.status(403).json({ message: 'Not authorized as a teacher' });
        }

        const assignedCourses = teacher.teacherProfile?.assignedCourses || [];
        const courseIds = assignedCourses.map(c => c._id || c);
        console.log(`[API] Teacher ${teacher.name} fetching students for courses:`, courseIds);

        let studentQuery = { role: 'Student' };
        if (courseIds.length > 0) {
            studentQuery['studentProfile.course'] = { $in: courseIds };
        } else if (teacher.institute) {
            studentQuery.institute = teacher.institute._id || teacher.institute;
        } else {
            return res.json([]);
        }

        const students = await User.find(studentQuery)
            .select('-password')
            .populate('institute', 'name')
            .populate('studentProfile.course', 'name');

        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const studentsWithStats = await Promise.all(students.map(async (student) => {
            try {
                // Find tests matching teacher's assignments or created by teacher
                const teacherCourseNames = teacher.teacherProfile?.assignedCourses?.map(c => c.name) || [];
                const testOrConditions = [
                    { createdBy: teacher._id }
                ];
                
                if (teacherCourseNames.length > 0) {
                    testOrConditions.push({ course: { $in: teacherCourseNames } });
                }
                if (teacher.teacherProfile?.subjects?.length > 0) {
                    testOrConditions.push({ subject: { $in: teacher.teacherProfile.subjects } });
                }
                if (testOrConditions.length === 1 && teacher.institute?.name) {
                    testOrConditions.push({ institute: { $regex: new RegExp(`^\\s*${escapeRegex(teacher.institute.name)}\\s*$`, 'i') } });
                }

                const matchingTests = await Test.find({ $or: testOrConditions }).select('_id');
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

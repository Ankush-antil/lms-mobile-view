const asyncHandler = require('express-async-handler');
const Institute = require('../../models/Institute');
const Course = require('../../models/Course');
const Activity = require('../../models/Activity');

// @desc    Get all institutes
// @route   GET /api/institutes
// @access  Public (or Private)
const getInstitutes = asyncHandler(async (req, res) => {
    // Get all institutes and their course counts
    const institutes = await Institute.aggregate([
        {
            $lookup: {
                from: 'courses',
                localField: '_id',
                foreignField: 'institute',
                as: 'courses'
            }
        },
        {
            $project: {
                name: 1,
                code: 1,
                address: 1,
                contactEmail: 1,
                courseCount: { $size: '$courses' },
                courses: { $slice: ['$courses', 5] } // Just some preview courses
            }
        }
    ]);
    res.json(institutes);
});

// @desc    Get single institute details
// @route   GET /api/setup/institutes/:id
// @access  Private/Admin
const getInstituteDetails = asyncHandler(async (req, res) => {
    const institute = await Institute.findById(req.params.id);
    if (!institute) {
        res.status(404);
        throw new Error('Institute not found');
    }

    const courses = await Course.find({ institute: req.params.id });
    res.json({ ...institute._doc, courses });
});

// @desc    Update institute
// @route   PUT /api/setup/institutes/:id
// @access  Private/Admin
const updateInstitute = asyncHandler(async (req, res) => {
    const { name, code, address, contactEmail } = req.body;
    const institute = await Institute.findById(req.params.id);

    if (institute) {
        institute.name = name || institute.name;
        institute.code = code || institute.code;
        institute.address = address || institute.address;
        institute.contactEmail = contactEmail || institute.contactEmail;

        const updatedInstitute = await institute.save();

        await Activity.create({
            type: 'INSTITUTE_UPDATED',
            message: 'Institute details updated',
            detail: `${updatedInstitute.name} (${updatedInstitute.code})`
        });

        res.json(updatedInstitute);
    } else {
        res.status(404);
        throw new Error('Institute not found');
    }
});

// @desc    Create new institute
// @route   POST /api/institutes
// @access  Private/Admin
const createInstitute = asyncHandler(async (req, res) => {
    const { name, code, address, contactEmail } = req.body;

    const instituteExists = await Institute.findOne({ code });
    if (instituteExists) {
        res.status(400);
        throw new Error('Institute code already exists');
    }

    const institute = await Institute.create({
        name,
        code,
        address,
        contactEmail
    });

    // Log Activity
    await Activity.create({
        type: 'INSTITUTE_CREATED',
        message: 'New Institute registered',
        detail: `${institute.name} (${institute.code})`
    });

    res.status(201).json(institute);
});

// @desc    Get all courses (optionally filter by institute)
// @route   GET /api/courses
// @access  Public
const getCourses = asyncHandler(async (req, res) => {
    const { instituteId, institute } = req.query;
    const finalInstituteId = instituteId || institute;
    const query = finalInstituteId ? { institute: finalInstituteId } : {};

    // Populate institute details
    const courses = await Course.find(query).populate('institute', 'name code');
    res.json(courses);
});

// @desc    Create new course
// @route   POST /api/courses
// @access  Private/Admin
const createCourse = asyncHandler(async (req, res) => {
    const { name, code, description, instituteId, institute, subjects } = req.body;
    const finalInstituteId = instituteId || institute;

    if (!finalInstituteId) {
        res.status(400);
        throw new Error('Institute is required');
    }

    const courseExists = await Course.findOne({ code });
    if (courseExists) {
        res.status(400);
        throw new Error('Course code already exists');
    }

    // subjects can be comma separated string or array or undefined
    let subjectsArray = [];
    if (subjects) {
        subjectsArray = Array.isArray(subjects) ? subjects : subjects.split(',').map(s => s.trim());
    }

    const course = await Course.create({
        name,
        code,
        description,
        institute: finalInstituteId,
        subjects: subjectsArray
    });

    // Log Activity
    await Activity.create({
        type: 'COURSE_CREATED',
        message: 'New Course added',
        detail: `${course.name} (${course.code})`
    });

    res.status(201).json(course);
});

// @desc    Delete institute
// @route   DELETE /api/setup/institutes/:id
// @access  Private/Admin
const deleteInstitute = asyncHandler(async (req, res) => {
    const institute = await Institute.findById(req.params.id);

    if (institute) {
        await institute.deleteOne();

        await Activity.create({
            type: 'INSTITUTE_DELETED',
            message: 'Institute removed',
            detail: `${institute.name} (${institute.code})`
        });

        res.json({ message: 'Institute removed' });
    } else {
        res.status(404);
        throw new Error('Institute not found');
    }
});

// @desc    Delete course
// @route   DELETE /api/setup/courses/:id
// @access  Private/Admin
const deleteCourse = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);

    if (course) {
        await course.deleteOne();

        await Activity.create({
            type: 'COURSE_DELETED',
            message: 'Course removed',
            detail: `${course.name} (${course.code})`
        });

        res.json({ message: 'Course removed' });
    } else {
        res.status(404);
        throw new Error('Course not found');
    }
});

module.exports = {
    getInstitutes,
    createInstitute,
    updateInstitute,
    getInstituteDetails,
    deleteInstitute,
    getCourses,
    createCourse,
    deleteCourse
};

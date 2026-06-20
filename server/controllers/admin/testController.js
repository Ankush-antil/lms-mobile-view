const asyncHandler = require('express-async-handler');
const Test = require('../../models/Test');
const Activity = require('../../models/Activity');

// @desc    Create new test
// @route   POST /api/tests
// @access  Private/Admin

const validateWebpageQuestions = (questions = []) => {
    for (const question of questions) {

        if (question.type !== "webpage") continue;

        if (!question.webpageUrl) {
            throw new Error("Webpage URL is required");
        }

        let parsedUrl;

        try {
            parsedUrl = new URL(question.webpageUrl);
        } catch {
            throw new Error("Invalid webpage URL");
        }

        if (parsedUrl.protocol !== "https:") {
            throw new Error("Only HTTPS URLs are allowed");
        }

        const blockedHosts = [
            "localhost",
            "127.0.0.1"
        ];

        if (
            blockedHosts.includes(
                parsedUrl.hostname.toLowerCase()
            )
        ) {
            throw new Error("Invalid webpage URL");
        }
    }
};

const createTest = asyncHandler(async (req, res) => {
    const { testDetails, settings, questions } = req.body;

    validateWebpageQuestions(questions);

    let details = { ...testDetails };
    if (req.user && req.user.role === 'Institute') {
        const Institute = require('../../models/Institute');
        const instituteDoc = await Institute.findById(req.user.institute);
        if (instituteDoc) {
            details.institute = instituteDoc.name;
        }
    }

    const test = await Test.create({
        ...details,
        settings,
        questions,
        createdBy: req.user._id
    });

    // Log Activity
    await Activity.create({
        type: 'TEST_CREATED',
        message: 'New Test created',
        detail: `${test.title} (${test.course})`,
        user: req.user._id
    });

    res.status(201).json(test);
});

// @desc    Get all tests (for Admin/Teacher)
// @route   GET /api/tests
// @access  Private/Admin
const getTests = asyncHandler(async (req, res) => {
    let query = {};
    if (req.user && req.user.role === 'Institute') {
        const Institute = require('../../models/Institute');
        const instituteDoc = await Institute.findById(req.user.institute);
        const instName = instituteDoc ? instituteDoc.name : '';
        query.$or = [
            { institute: req.user.institute },
            { institute: instName }
        ];
    }
    const tests = await Test.find(query).sort({ createdAt: -1 });
    console.log(`[Admin-Tests] Found ${tests.length} tests`);
    res.json(tests);
});

// @desc    Get test by ID
// @route   GET /api/tests/:id
// @access  Private
const getTestById = asyncHandler(async (req, res) => {
    const test = await Test.findById(req.params.id);
    if (!test) {
        res.status(404);
        throw new Error('Test not found');
    }
    res.json(test);
});

// @desc    Update test
// @route   PUT /api/tests/:id
// @access  Private/Admin
const updateTest = asyncHandler(async (req, res) => {
    const { testDetails, settings, questions } = req.body;

    validateWebpageQuestions(questions);

    const test = await Test.findById(req.params.id);

    if (test) {
        if (req.user && req.user.role === 'Institute') {
            const Institute = require('../../models/Institute');
            const instituteDoc = await Institute.findById(req.user.institute);
            const instName = instituteDoc ? instituteDoc.name : '';
            if (test.institute !== req.user.institute?.toString() && test.institute !== instName) {
                res.status(403);
                throw new Error('Not authorized to access tests of other institutes');
            }
        }

        if (testDetails.title !== undefined) test.title = testDetails.title;
        // Institute users cannot assign to other institutes
        if (testDetails.institute !== undefined && req.user.role !== 'Institute') {
            test.institute = testDetails.institute;
        }
        if (testDetails.course !== undefined) test.course = testDetails.course;
        if (testDetails.subject !== undefined) test.subject = testDetails.subject;
        if (testDetails.date !== undefined) test.date = testDetails.date;
        if (testDetails.index !== undefined) test.index = testDetails.index;
        if (testDetails.activity !== undefined) test.activity = testDetails.activity;
        if (testDetails.publishMode !== undefined) test.publishMode = testDetails.publishMode;
        if (testDetails.publicSettings !== undefined) test.publicSettings = testDetails.publicSettings;
        if (testDetails.status !== undefined) test.status = testDetails.status;
        if (testDetails.discussionActivity !== undefined) test.discussionActivity = testDetails.discussionActivity;

        if (settings !== undefined) test.settings = settings;
        if (questions !== undefined) test.questions = questions;

        const updatedTest = await test.save();
        res.json(updatedTest);
    } else {
        res.status(404);
        throw new Error('Test not found');
    }
});

// @desc    Delete test
// @route   DELETE /api/tests/:id
// @access  Private/Admin
const deleteTest = asyncHandler(async (req, res) => {
    const test = await Test.findById(req.params.id);
    if (test) {
        if (req.user && req.user.role === 'Institute') {
            const Institute = require('../../models/Institute');
            const instituteDoc = await Institute.findById(req.user.institute);
            const instName = instituteDoc ? instituteDoc.name : '';
            if (test.institute !== req.user.institute?.toString() && test.institute !== instName) {
                res.status(403);
                throw new Error('Not authorized to delete tests of other institutes');
            }
        }
        await test.deleteOne();
        res.json({ message: 'Test removed' });
    } else {
        res.status(404);
        throw new Error('Test not found');
    }
});

module.exports = { createTest, getTests, getTestById, updateTest, deleteTest };

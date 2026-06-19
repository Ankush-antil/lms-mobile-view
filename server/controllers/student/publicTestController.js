const asyncHandler = require('express-async-handler');
const Test = require('../../models/Test');
const PublicSubmission = require('../../models/PublicSubmission');

// @desc    Get public test by ID
// @route   GET /api/public-tests/:id
// @access  Public
const getPublicTestById = asyncHandler(async (req, res) => {
    const test = await Test.findById(req.params.id);
    if (!test) {
        return res.status(404).json({ message: 'Test not found' });
    }

    if (test.publishMode !== 'public') {
        return res.status(403).json({ message: 'This test is not published to the web.' });
    }

    if (test.status === 'disabled') {
        return res.status(403).json({ message: 'This test link has been disabled by the instructor.' });
    }

    // Check Start / End date
    const now = new Date();
    if (test.publicSettings?.startDate && new Date(test.publicSettings.startDate) > now) {
        return res.status(403).json({ message: `This test starts on ${new Date(test.publicSettings.startDate).toLocaleString()}.` });
    }
    if (test.publicSettings?.endDate && new Date(test.publicSettings.endDate) < now) {
        return res.status(403).json({ message: 'This test has ended and is no longer accepting responses.' });
    }
    if (test.publicSettings?.expiryDate && new Date(test.publicSettings.expiryDate) < now) {
        return res.status(403).json({ message: 'This test link has expired.' });
    }

    // Check Password Protection
    const password = req.headers['x-test-password'] || req.query.password;
    const hasPassword = test.publicSettings?.password && test.publicSettings.password.trim() !== '';

    if (hasPassword) {
        if (!password || password !== test.publicSettings.password) {
            return res.json({
                isPasswordProtected: true,
                title: test.title,
                description: test.description
            });
        }
    }

    // Prepare questions (hide correct answers to prevent source inspection)
    const sanitizedQuestions = test.questions.map(q => {
        const qObj = q.toObject ? q.toObject() : { ...q };
        if (qObj.options && Array.isArray(qObj.options)) {
            qObj.options = qObj.options.map(opt => ({
                _id: opt._id,
                text: opt.text
                // isCorrect is omitted
            }));
        }
        return qObj;
    });

    res.json({
        _id: test._id,
        title: test.title,
        description: test.description,
        subject: test.subject,
        activity: test.activity,
        discussionActivity: test.discussionActivity,
        questions: sanitizedQuestions,
        publicSettings: {
            timeLimit: test.publicSettings?.timeLimit || 0,
            showScoreAfterSubmission: test.publicSettings?.showScoreAfterSubmission !== false,
            showCorrectAnswers: !!test.publicSettings?.showCorrectAnswers,
            antiSpam: !!test.publicSettings?.antiSpam,
            assistiveFeatures: test.publicSettings?.assistiveFeatures || {}
        }
    });
});

// @desc    Verify password for protected public test
// @route   POST /api/public-tests/:id/verify-password
// @access  Public
const verifyPublicTestPassword = asyncHandler(async (req, res) => {
    const { password } = req.body;
    const test = await Test.findById(req.params.id);
    if (!test) {
        return res.status(404).json({ message: 'Test not found' });
    }

    const correctPassword = test.publicSettings?.password || '';
    if (password === correctPassword) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Incorrect password' });
    }
});

// @desc    Increment public test views
// @route   POST /api/public-tests/:id/view
// @access  Public
const incrementPublicTestViews = asyncHandler(async (req, res) => {
    const test = await Test.findById(req.params.id);
    if (test) {
        test.publicViews = (test.publicViews || 0) + 1;
        await test.save();
        res.json({ success: true, views: test.publicViews });
    } else {
        res.status(404).json({ message: 'Test not found' });
    }
});

// @desc    Submit guest answers for a public test
// @route   POST /api/public-tests/:id/submit
// @access  Public
const submitPublicTest = asyncHandler(async (req, res) => {
    const { name, email, phone, organization, answers, deviceInfo } = req.body;

    if (!name || !email) {
        return res.status(400).json({ message: 'Name and Email are mandatory fields.' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email address format.' });
    }

    const test = await Test.findById(req.params.id);
    if (!test) {
        return res.status(404).json({ message: 'Test not found.' });
    }

    if (test.publishMode !== 'public' || test.status === 'disabled') {
        return res.status(403).json({ message: 'This test is not active.' });
    }

    // Check Start / End date again
    const now = new Date();
    if (test.publicSettings?.startDate && new Date(test.publicSettings.startDate) > now) {
        return res.status(403).json({ message: 'This test has not started yet.' });
    }
    if (test.publicSettings?.endDate && new Date(test.publicSettings.endDate) < now) {
        return res.status(403).json({ message: 'This test has ended.' });
    }

    // Duplicate submission check (One Response Per Email)
    const allowMultiple = test.publicSettings?.allowMultiple || false;
    if (!allowMultiple) {
        const existing = await PublicSubmission.findOne({ test: test._id, email: email.toLowerCase(), completedStatus: 'Completed' });
        if (existing) {
            return res.status(400).json({ message: 'You have already submitted this test.' });
        }
    }

    // Check Max Responses Limit
    if (test.publicSettings?.maxResponses) {
        const responsesCount = await PublicSubmission.countDocuments({ test: test._id });
        if (responsesCount >= test.publicSettings.maxResponses) {
            return res.status(403).json({ message: 'This test has reached its maximum response capacity.' });
        }
    }

    // Calculate score for auto-graded questions (Multiple Choice, Checkboxes, Dropdown)
    let totalScore = 0;
    const gradedAnswers = answers.map(submitted => {
        const q = test.questions.find(item => item.id === submitted.questionId);
        let marksEarned = 0;

        if (q) {
            const qType = q.type?.toLowerCase();
            const isMcq = qType === 'multiple choice' || qType === 'dropdown';
            const isCheckboxes = qType === 'checkboxes';

            if (isMcq && q.options) {
                const correctOpt = q.options.find(opt => opt.isCorrect);
                if (correctOpt && submitted.textAnswer?.trim() === correctOpt.text?.trim()) {
                    marksEarned = q.marks || 1;
                }
            } else if (isCheckboxes && q.options) {
                const correctTexts = q.options.filter(opt => opt.isCorrect).map(opt => opt.text?.trim());
                let submittedTexts = [];
                if (Array.isArray(submitted.textAnswer)) {
                    submittedTexts = submitted.textAnswer.map(t => t?.trim());
                } else if (typeof submitted.textAnswer === 'string') {
                    submittedTexts = submitted.textAnswer.split(',').map(t => t?.trim()).filter(Boolean);
                }

                const allCorrectMatched = correctTexts.every(c => submittedTexts.includes(c));
                const noIncorrectMatched = submittedTexts.every(s => correctTexts.includes(s));

                if (allCorrectMatched && noIncorrectMatched && correctTexts.length > 0) {
                    marksEarned = q.marks || 1;
                }
            }
            totalScore += marksEarned;
        }

        return {
            questionId: submitted.questionId,
            questionText: submitted.questionText || q?.text || 'Question',
            questionType: q?.type || submitted.questionType,
            textAnswer: typeof submitted.textAnswer === 'object' ? JSON.stringify(submitted.textAnswer) : (submitted.textAnswer || ''),
            audioData: submitted.audioData || '',
            videoData: submitted.videoData || '',
            marks: marksEarned
        };
    });

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    let submission = await PublicSubmission.findOne({
        test: test._id,
        email: email.toLowerCase(),
        completedStatus: 'Incomplete'
    });

    if (submission) {
        submission.name = name;
        submission.phone = phone || submission.phone;
        submission.organization = organization || submission.organization;
        submission.answers = gradedAnswers;
        submission.score = totalScore;
        submission.completedStatus = 'Completed';
        submission.ipAddress = ipAddress;
        submission.deviceInfo = deviceInfo || submission.deviceInfo;
        submission.submittedAt = new Date();
        await submission.save();
    } else {
        submission = await PublicSubmission.create({
            test: test._id,
            name,
            email: email.toLowerCase(),
            phone: phone || '',
            organization: organization || '',
            ipAddress,
            deviceInfo: deviceInfo || 'Unknown Device',
            answers: gradedAnswers,
            score: totalScore,
            completedStatus: 'Completed',
            submittedAt: new Date()
        });
    }

    // Simulate Emails in Backend console logs
    console.log(`\n================ SIMULATED EMAILS FOR PUBLIC TEST SUBMISSION ================`);
    if (test.publicSettings?.emailNotification?.sendConfirmationEmail) {
        console.log(`[EMAIL CONFIRMATION] Sent to: ${email}`);
        console.log(`Dear ${name}, thank you for attempting "${test.title}". Your submission has been saved.`);
    }
    if (test.publicSettings?.emailNotification?.sendScoreEmail && test.publicSettings?.showScoreAfterSubmission) {
        console.log(`[EMAIL SCORE REPORT] Sent to: ${email}`);
        console.log(`Your Score for "${test.title}" is: ${totalScore} points.`);
    }
    if (test.publicSettings?.emailNotification?.sendSubmissionNotification) {
        console.log(`[EMAIL ADMIN ALERT] Sent to: Instructor/Admin`);
        console.log(`New response submitted for public test "${test.title}" by ${name} (${email}). Score: ${totalScore}`);
    }
    console.log(`============================================================================\n`);

    res.status(201).json({
        success: true,
        submissionId: submission._id,
        score: totalScore,
        showScore: test.publicSettings?.showScoreAfterSubmission !== false
    });
});

// @desc    Check duplicate email or resume draft for a public test
// @route   POST /api/public-tests/:id/check-email
// @access  Public
const checkPublicTestEmail = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const test = await Test.findById(req.params.id);
    if (!test) {
        return res.status(404).json({ message: 'Test not found' });
    }

    const draft = await PublicSubmission.findOne({ test: test._id, email: email.toLowerCase(), completedStatus: 'Incomplete' });
    if (draft) {
        return res.json({
            exists: false,
            isDraft: true,
            draftSubmissionId: draft._id,
            draftAnswers: draft.answers,
            draftName: draft.name,
            draftPhone: draft.phone,
            draftOrg: draft.organization
        });
    }

    const allowMultiple = test.publicSettings?.allowMultiple || false;
    if (!allowMultiple) {
        const existing = await PublicSubmission.findOne({ test: test._id, email: email.toLowerCase(), completedStatus: 'Completed' });
        if (existing) {
            return res.json({ exists: true });
        }
    }
    res.json({ exists: false });
});

// @desc    Save public test draft
// @route   POST /api/public-tests/:id/save-draft
// @access  Public
const savePublicTestDraft = asyncHandler(async (req, res) => {
    const { name, email, phone, organization, answers } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required to save a draft.' });
    }

    const test = await Test.findById(req.params.id);
    if (!test) {
        return res.status(404).json({ message: 'Test not found.' });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';

    const formattedAnswers = answers.map(ans => ({
        questionId: ans.questionId,
        questionText: ans.questionText || '',
        questionType: ans.questionType || '',
        textAnswer: typeof ans.textAnswer === 'object' ? JSON.stringify(ans.textAnswer) : (ans.textAnswer || ''),
        audioData: ans.audioData || '',
        videoData: ans.videoData || '',
        marks: 0
    }));

    let submission = await PublicSubmission.findOne({
        test: test._id,
        email: email.toLowerCase(),
        completedStatus: 'Incomplete'
    });

    if (submission) {
        submission.name = name || submission.name;
        submission.phone = phone !== undefined ? phone : submission.phone;
        submission.organization = organization !== undefined ? organization : submission.organization;
        submission.answers = formattedAnswers;
        submission.ipAddress = ipAddress;
        submission.deviceInfo = deviceInfo;
        await submission.save();
    } else {
        const allowMultiple = test.publicSettings?.allowMultiple || false;
        if (!allowMultiple) {
            const completed = await PublicSubmission.findOne({
                test: test._id,
                email: email.toLowerCase(),
                completedStatus: 'Completed'
            });
            if (completed) {
                return res.status(400).json({ message: 'You have already submitted this test.' });
            }
        }

        submission = await PublicSubmission.create({
            test: test._id,
            name: name || 'Guest User',
            email: email.toLowerCase(),
            phone: phone || '',
            organization: organization || '',
            answers: formattedAnswers,
            completedStatus: 'Incomplete',
            ipAddress,
            deviceInfo
        });
    }

    res.json({
        success: true,
        message: 'Draft saved successfully.',
        submissionId: submission._id
    });
});

module.exports = {
    getPublicTestById,
    verifyPublicTestPassword,
    incrementPublicTestViews,
    submitPublicTest,
    checkPublicTestEmail,
    savePublicTestDraft
};

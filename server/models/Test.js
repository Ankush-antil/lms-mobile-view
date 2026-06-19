const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    institute: {
        type: String
    },
    course: {
        type: String
    },
    subject: {
        type: String
    },
    date: {
        type: String
    },
    index: {
        type: String
    },
    activity: {
        type: String
    },
    discussionActivity: {
        activityName: String,
        activityLink: String
    },
    questions: [{
        id: String,
        text: String,
        type: { type: String },
        marks: Number,
        description: String,
        helperText: String,
        instructions: String,
        required: { type: Boolean, default: false },
        enabled: { type: Boolean, default: true },
        negativeMarks: { type: Number, default: 0 },
        partialMarks: { type: Boolean, default: false },
        evaluationMode: { type: String, default: 'auto' },
        validation: { type: mongoose.Schema.Types.Mixed },
        validationSettings: { type: mongoose.Schema.Types.Mixed },
        assistive: { type: mongoose.Schema.Types.Mixed },
        particulars: { type: mongoose.Schema.Types.Mixed },
        logicalSettings: { type: mongoose.Schema.Types.Mixed },
        logic: { type: mongoose.Schema.Types.Mixed },
        textLogic: { type: mongoose.Schema.Types.Mixed },
        videoSettings: { type: mongoose.Schema.Types.Mixed },
        advanced: { type: mongoose.Schema.Types.Mixed },
        options: [{
            text: String,
            isCorrect: Boolean
        }],
        matchingPairs: [{
            key: String,
            value: String
        }],
        blankAnswers: [String],
        uploadedFiles: [{
            name: String,
            size: Number
        }],
        uploadedResource: {
            name: String,
            size: Number,
            type: { type: String },
            url: String
        },
        mediaUrl: String,
        writeMode: { type: Boolean, default: false },
        audioUrl: String,
        imageUrl: String,
        altText: String,
        align: String,
        pdfUrl: String,
        youtubeUrl: String,
        embeddedVideoUrl: String,
        webpageUrl: String,
        webpageHeight: Number,
        webpageScroll: String,
        smPlatform: String,
        smPostUrl: String,
        multiMaxFiles: Number,
        multiMaxSizeMB: Number,
        multiFileType: String,
        videoCallDuration: Number,
        videoCallRole: String,
        videoCallScenario: String,
        videoUrl: String,
        webpageUrl: String,
        webpageHeight: {
            type: Number,
            default: ""
        },
        webpageScroll: {
            type: String,
            enum: ["yes", "no"],
            default: "yes"
        },
        htmlContent: {
            type: String,
            default: ""
        },
        autoplay: Boolean,
        loop: Boolean,
        quality: String,
        includeMic: Boolean,
        screenshotScope: String,
        agentName: String,
        greetingMessage: String,
        systemPersona: String,
        voicePersona: String,
        scriptScenario: String,
        activityType: String,
        activityRules: String,
        addons: [String],
        appliedToAllAddons: [String],
        appliedToAllMoreSettings: [String],
        moreSettings: {
            allowUpload: { type: Boolean, default: false },
            allowAudioAnswer: { type: Boolean, default: false },
            allowChat: { type: Boolean, default: false },
            allowVideo: { type: Boolean, default: false }
        },
        insertedImages: [String]
    }],
    settings: {
        duration: Number,
        passingMarks: Number,
        startTime: Date,
        endTime: Date
    },
    publishMode: {
        type: String,
        enum: ['connected', 'public'],
        default: 'connected'
    },
    publicViews: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'disabled'],
        default: 'active'
    },
    publicSettings: {
        allowMultiple: { type: Boolean, default: false },
        startDate: { type: Date },
        endDate: { type: Date },
        expiryDate: { type: Date },
        maxResponses: { type: Number },
        timeLimit: { type: Number },
        randomizeQuestions: { type: Boolean, default: false },
        showScoreAfterSubmission: { type: Boolean, default: true },
        showCorrectAnswers: { type: Boolean, default: false },
        allowRetake: { type: Boolean, default: false },
        password: { type: String, default: '' },
        antiSpam: { type: Boolean, default: false },
        emailNotification: {
            sendSubmissionNotification: { type: Boolean, default: true },
            sendScoreEmail: { type: Boolean, default: true },
            sendConfirmationEmail: { type: Boolean, default: true }
        },
        assistiveFeatures: {
            relevantInformation: { type: Boolean, default: false },
            temporaryFill: { type: Boolean, default: false },
            audioAnswer: { type: Boolean, default: false },
            chatWithTeacher: { type: Boolean, default: false },
            uploadAttachment: { type: Boolean, default: false },
            exampleSection: { type: Boolean, default: false },
            calculator: { type: Boolean, default: false },
            aiReader: { type: Boolean, default: false },
            textToSpeech: { type: Boolean, default: false },
            speechToText: { type: Boolean, default: false },
            translation: { type: Boolean, default: false },
            accessibilityMode: { type: Boolean, default: false }
        }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

const Test = mongoose.model('Test', testSchema);
module.exports = Test;

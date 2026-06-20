const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['Admin', 'Teacher', 'Student', 'Editor'],
        default: 'Student'
    },
    institute: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institute'
    },
    avatar: {
        type: String,
        default: ''
    },
    mobileNumber: {
        type: String,
        default: ''
    },
    callEnabled: {
        type: Boolean,
        default: false
    },
    // Role specific fields
    studentProfile: {
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        subject: { type: String, default: '' },   // ← new: subject assigned by admin
        batch: { type: String },
        enrollmentDate: { type: Date, default: Date.now }
    },

    teacherProfile: {
        assignedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
        subjects: [{ type: String }]
    },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});

// Encrypt password using bcrypt
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;

const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Log for debugging
        console.log(`Login attempt for: ${email}`);

        const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } }).populate('institute');

        if (user && (await user.matchPassword(password))) {
            const token = generateToken(user._id);

            // Set Cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            });

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                institute: user.institute,
                token: token
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('CRITICAL LOGIN ERROR:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password').populate('institute');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = async (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0)
    });
    res.json({ message: 'Logged out successfully' });
};

// @desc    Register a new user (Admin specific for this use case, or public)
// @route   POST /api/auth/register
// @access  Public (for initial setup) / Admin
const registerUser = async (req, res) => {
    const { name, email, password, role, course, subjects } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const userFields = {
        name,
        email,
        password,
        role
    };

    if (role === 'Student') {
        userFields.studentProfile = {
            course: course,
            enrollmentDate: new Date()
        };
    } else if (role === 'Teacher') {
        userFields.teacherProfile = {
            assignedCourses: course ? [course] : [], // Simplified for now
            subjects: subjects ? subjects.split(',').map(s => s.trim()) : []
        };
    }

    const user = await User.create(userFields);

    if (user) {
        const token = generateToken(user._id);

        // Set Cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: token
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

module.exports = { loginUser, registerUser, getMe, logoutUser };

const asyncHandler = require('express-async-handler');
const User = require('../../models/User');

// @desc    Get User Profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
        .select('-password')
        .populate('institute', 'name')
        .populate('studentProfile.course', 'name');
    if (user) {
        res.json(user);
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = asyncHandler(async (req, res) => {
    console.log(`FETCH PROFILE - Requested ID: ${req.params.id} by User: ${req.user._id}`);

    if (!req.params.id || req.params.id === 'undefined' || req.params.id === '[object Object]') {
        console.error('FETCH PROFILE - Invalid ID provided');
        return res.status(400).json({ message: 'Invalid User ID format' });
    }

    const user = await User.findById(req.params.id)
        .select('-password')
        .populate('institute', 'name')
        .populate('studentProfile.course', 'name')
        .populate('teacherProfile.assignedCourses', 'name');

    if (user) {
        console.log(`FETCH PROFILE - Found user: ${user.name} (${user.role})`);
        res.json(user);
    } else {
        console.warn(`FETCH PROFILE - User not found for ID: ${req.params.id}`);
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Update User Profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.avatar = req.body.avatar !== undefined ? req.body.avatar : user.avatar;

        if (req.body.password && req.body.password.trim() !== '') {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            avatar: updatedUser.avatar
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

module.exports = {
    getUserProfile,
    getUserById,
    updateUserProfile
};

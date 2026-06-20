const express = require('express');
const router = express.Router();
const {
    getUsers,
    createUser,
    deleteUser,
    updateUser
} = require('../../controllers/admin/userController');
const { getUserById } = require('../../controllers/common/profileController');
const { protect, admin, adminOrInstitute } = require('../../middleware/authMiddleware');

// Public view - accessible by ANY logged in user (student, teacher, admin)
router.get('/view/:id', protect, getUserById);

// Specific routes
router.get('/:id', protect, getUserById);
router.delete('/:id', protect, adminOrInstitute, deleteUser);
router.put('/:id', protect, adminOrInstitute, updateUser);

// Base routes
router.get('/', protect, adminOrInstitute, getUsers);
router.post('/', protect, adminOrInstitute, createUser);

module.exports = router;

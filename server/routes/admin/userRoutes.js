const express = require('express');
const router = express.Router();
const {
    getUsers,
    createUser,
    deleteUser,
    updateUser
} = require('../../controllers/admin/userController');
const { getUserById } = require('../../controllers/common/profileController');
const { protect, admin } = require('../../middleware/authMiddleware');

// Public view - accessible by ANY logged in user (student, teacher, admin)
router.get('/view/:id', protect, getUserById);

// Specific routes
router.get('/:id', protect, getUserById);
router.delete('/:id', protect, admin, deleteUser);
router.put('/:id', protect, admin, updateUser);

// Base routes
router.get('/', protect, admin, getUsers);
router.post('/', protect, admin, createUser);

module.exports = router;

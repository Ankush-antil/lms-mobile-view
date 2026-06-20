const express = require('express');
const router = express.Router();
const {
    getInstitutes,
    createInstitute,
    updateInstitute,
    getInstituteDetails,
    deleteInstitute,
    getCourses,
    createCourse,
    deleteCourse
} = require('../../controllers/admin/setupController');
const { protect, admin, adminOrInstitute } = require('../../middleware/authMiddleware');

router.route('/institutes')
    .get(protect, getInstitutes)
    .post(protect, admin, createInstitute);

router.route('/institutes/:id')
    .get(protect, admin, getInstituteDetails)
    .put(protect, admin, updateInstitute)
    .delete(protect, admin, deleteInstitute);

router.route('/courses')
    .get(protect, getCourses)
    .post(protect, adminOrInstitute, createCourse);

router.route('/courses/:id')
    .delete(protect, adminOrInstitute, deleteCourse);

module.exports = router;

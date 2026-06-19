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
const { protect, admin } = require('../../middleware/authMiddleware');

router.route('/institutes')
    .get(getInstitutes)
    .post(protect, admin, createInstitute);

router.route('/institutes/:id')
    .get(protect, admin, getInstituteDetails)
    .put(protect, admin, updateInstitute)
    .delete(protect, admin, deleteInstitute);

router.route('/courses')
    .get(getCourses)
    .post(protect, admin, createCourse);

router.route('/courses/:id')
    .delete(protect, admin, deleteCourse);

module.exports = router;

const express = require('express');
const router = express.Router();

const adminPublicTestRoutes = require('./admin/publicTestRoutes');
const studentPublicTestRoutes = require('./student/publicTestRoutes');

// Forward requests containing '/admin' to admin routes, otherwise student/guest routes
router.use((req, res, next) => {
    if (req.path.includes('/admin')) {
        adminPublicTestRoutes(req, res, next);
    } else {
        studentPublicTestRoutes(req, res, next);
    }
});

module.exports = router;

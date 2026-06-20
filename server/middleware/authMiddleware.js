const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    // Log auth attempt for debugging
    console.log(`[AUTH] Path: ${req.originalUrl}, Method: ${req.method}`);
    console.log(`[AUTH] Cookies present:`, req.cookies ? Object.keys(req.cookies) : 'None');

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
        console.log(`[AUTH] Token found in Authorization Header`);
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
        console.log(`[AUTH] Token found in Cookie`);
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                console.warn(`[AUTH] User not found for ID: ${decoded.id}`);
                return res.status(401).json({ message: 'User not found' });
            }
            next();
        } catch (error) {
            console.error(`[AUTH] Token verification failed:`, error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        console.warn(`[AUTH] No token found in request to ${req.originalUrl}`);
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'Admin') {
        next();
    } else {
        console.warn(`ADMIN UNAUTHORIZED: ${req.method} ${req.originalUrl} - Role: ${req.user?.role}`);
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

const adminOrEditor = (req, res, next) => {
    if (req.user && (req.user.role === 'Admin' || req.user.role === 'Editor' || req.user.role === 'Institute')) {
        next();
    } else {
        console.warn(`ADMIN/EDITOR/INSTITUTE UNAUTHORIZED: ${req.method} ${req.originalUrl} - Role: ${req.user?.role}`);
        res.status(401).json({ message: 'Not authorized as an admin, editor or institute' });
    }
};

const adminOrInstitute = (req, res, next) => {
    if (req.user && (req.user.role === 'Admin' || req.user.role === 'Institute')) {
        next();
    } else {
        console.warn(`ADMIN/INSTITUTE UNAUTHORIZED: ${req.method} ${req.originalUrl} - Role: ${req.user?.role}`);
        res.status(401).json({ message: 'Not authorized as an admin or institute portal' });
    }
};

module.exports = { protect, admin, adminOrEditor, adminOrInstitute };

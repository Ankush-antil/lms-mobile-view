// Final clean server file - Restarting for role-check verification
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');


const app = express();
const path = require('path');

// Trust proxy for secure cookies behind reverse proxies (like DigitalOcean)
app.set('trust proxy', 1);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: true,
    credentials: true
}));

// Prevent Cloudflare/CDN from caching API responses
app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    next();
});

// Health check
app.get('/api/health', async (req, res) => {
    const status = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    res.json({ server: 'Running', database: status, time: new Date() });
});

app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/common/authRoutes'));
app.use('/api/users/profile', require('./routes/common/profileRoutes'));
app.use('/api/users/teacher-students', require('./routes/teacher/teacherRoutes'));
app.use('/api/users', require('./routes/admin/userRoutes'));
app.use('/api/setup', require('./routes/admin/setupRoutes'));
app.use('/api/dashboard', require('./routes/admin/dashboardRoutes'));
app.use('/api/tests', require('./routes/testRoutes'));
app.use('/api/submissions', require('./routes/submissionRoutes'));
app.use('/api/public-tests', require('./routes/publicTestRoutes'));
app.use('/api/calls', require('./routes/teacher/callRoutes'));

// API-only server (Mobile App) — no static file serving
app.get('/', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    res.json({
        message: 'LMS Mobile API is running ✅',
        database: dbStatus,
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

const http = require('http');
const server = http.createServer(app);
const { initSocket } = require('./socket');

// Initialize Socket.io Connection Handlers
initSocket(server);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        server.listen(PORT, () => {
            console.log(`=========================================`);
            console.log(`Server running on: http://localhost:${PORT}`);
            console.log(`LMS API v1.0.1 Started with Socket.IO`);
            console.log(`MongoDB Connected successfully.`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`=========================================`);
        });
    } catch (error) {
        console.error('SERVER STARTUP FAILED:', error);
        process.exit(1);
    }
};

startServer();
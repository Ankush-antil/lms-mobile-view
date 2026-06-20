require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const express = require('express');
const authController = require('../controllers/common/authController'); // Import controller

const app = express();
const PORT = process.env.PORT || 5000;

console.log('Controller loaded');

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('DB Connected');
        app.listen(PORT, () => console.log('Server listening on ' + PORT));
    })
    .catch(err => {
        console.error('DB Error:', err);
        process.exit(1);
    });

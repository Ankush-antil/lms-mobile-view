const mongoose = require('mongoose');

const instituteSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    address: String,
    contactEmail: String
}, {
    timestamps: true
});

const Institute = mongoose.model('Institute', instituteSchema);
module.exports = Institute;

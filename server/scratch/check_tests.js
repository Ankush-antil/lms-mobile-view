const mongoose = require('mongoose');
const Test = require('../models/Test');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://digitalstudy5555_db_user:t040XELTgLuIXZgq@digitalstudycluster.tkpcaax.mongodb.net/');
        console.log("Connected to MongoDB");
        
        const tests = await Test.find({});
        console.log(`Total tests found: ${tests.length}`);
        
        tests.forEach(t => {
            console.log(`Test ID: ${t._id}, Title: ${t.title}, Institute: ${t.institute}, createdBy: ${t.createdBy}`);
        });

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}

run();

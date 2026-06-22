const mongoose = require('mongoose');
const User = require('../models/User');
const Institute = require('../models/Institute');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://digitalstudy5555_db_user:t040XELTgLuIXZgq@digitalstudycluster.tkpcaax.mongodb.net/');
        console.log("Connected to database successfully!");

        // Find existing institute
        const institute = await Institute.findOne({ name: 'Digital study' });
        const instId = institute ? institute._id : null;
        console.log(`Using institute ID: ${instId} (${institute ? institute.name : 'None found'})`);

        let adminUser = await User.findOne({ email: 'admin@lms.com' });

        if (adminUser) {
            console.log("Admin user 'admin@lms.com' already exists. Resetting password...");
            adminUser.password = 'admin'; // Will be hashed by pre-save hook
            adminUser.name = 'Admin User';
            adminUser.role = 'Admin';
            if (instId) adminUser.institute = instId;
            await adminUser.save();
            console.log("Password and details updated successfully!");
        } else {
            console.log("Creating new Admin user 'admin@lms.com'...");
            adminUser = await User.create({
                name: 'Admin User',
                email: 'admin@lms.com',
                password: 'admin', // Will be hashed by pre-save hook
                role: 'Admin',
                institute: instId
            });
            console.log("Admin user created successfully!");
        }

        // Print details
        console.log("Admin details in DB:", {
            id: adminUser._id,
            name: adminUser.name,
            email: adminUser.email,
            role: adminUser.role,
            institute: adminUser.institute
        });

    } catch (e) {
        console.error("Error creating/updating admin:", e);
    } finally {
        await mongoose.disconnect();
    }
}

createAdmin();

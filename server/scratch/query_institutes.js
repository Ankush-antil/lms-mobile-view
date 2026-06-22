const mongoose = require('mongoose');
const Institute = require('../models/Institute');
const User = require('../models/User');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://digitalstudy5555_db_user:t040XELTgLuIXZgq@digitalstudycluster.tkpcaax.mongodb.net/');
        console.log("Connected to MongoDB");
        
        const institutes = await Institute.find({});
        console.log(`\nTotal institutes found: ${institutes.length}`);
        
        for (const inst of institutes) {
            console.log(`\nInstitute: ${inst.name} (${inst.code})`);
            console.log(`  Contact Email: ${inst.contactEmail}`);
            console.log(`  Address: ${inst.address}`);
            
            const user = await User.findOne({ institute: inst._id, role: 'Institute' });
            if (user) {
                console.log(`  Associated Portal User: ${user.name} (${user.email})`);
                console.log(`  Is Active: ${user.isActive}`);
            } else {
                console.log(`  Associated Portal User: NONE`);
            }
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}

run();

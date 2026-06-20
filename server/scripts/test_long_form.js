const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const testLongForm = async () => {
    // Manually constructed long-form URI from SRV and TXT lookups
    const uri = "mongodb://digitalstudy:digitalstudy%23%405555@ac-khrbsml-shard-00-00.lzqs6z8.mongodb.net:27017,ac-khrbsml-shard-00-01.lzqs6z8.mongodb.net:27017,ac-khrbsml-shard-00-02.lzqs6z8.mongodb.net:27017/digitalstudy?ssl=true&replicaSet=atlas-8885yj-shard-0&authSource=admin&retryWrites=true&w=majority";

    console.log("Attempting to connect with long-form URI...");
    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 15000,
        });
        console.log("SUCCESS: Connected to MongoDB Atlas!");
        process.exit(0);
    } catch (err) {
        console.error("CONNECTION FAILED:", err.message);
        process.exit(1);
    }
};

testLongForm();

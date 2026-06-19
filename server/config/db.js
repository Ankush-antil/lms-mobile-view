const mongoose = require('mongoose');
const dns = require('dns');

const connectDB = async () => {
    try {
        // Fix for SRV lookup failure in restricted DNS environments
        dns.setServers(['8.8.8.8', '8.8.4.4']);
        console.log("MONGO_URI =", process.env.MONGO_URI);


        const conn = await mongoose.connect(process.env.MONGO_URI, {
            family: 4,
            serverSelectionTimeoutMS: 10000,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;

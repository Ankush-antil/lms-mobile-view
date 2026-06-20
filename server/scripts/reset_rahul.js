const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '../.env') });

const resetPassword = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('12345', salt);

        const result = await User.updateOne(
            { email: 'rahul1@gmail.com' },
            { $set: { password: hashedPassword } }
        );

        console.log('Password reset successful:', result);
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
resetPassword();

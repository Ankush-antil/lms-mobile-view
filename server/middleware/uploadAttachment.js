const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = "uploads/attachments";
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    },
});

const uploadAttachment = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50 MB
    },
});

module.exports = uploadAttachment;

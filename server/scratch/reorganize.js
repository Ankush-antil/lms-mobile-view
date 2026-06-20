const fs = require('fs');
const path = require('path');

const dirs = [
    'server/controllers/admin',
    'server/controllers/teacher',
    'server/controllers/student',
    'server/controllers/common',
    'server/routes/admin',
    'server/routes/teacher',
    'server/routes/student',
    'server/routes/common',
    'server/scripts'
];

// 1. Create directories
dirs.forEach(d => {
    const fullPath = path.resolve(__dirname, '../../', d);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`Created directory: ${d}`);
    }
});

const filesToMove = [
    'check_categories.js',
    'check_inst_exists.js',
    'check_login.js',
    'check_rahul_raw.js',
    'check_users.js',
    'debug_assignment.js',
    'debug_assignment_v2.js',
    'debug_db.js',
    'debug_db_v2.js',
    'diagnose.js',
    'list_emails.js',
    'read_debug.js',
    'reset_passwords.js',
    'reset_rahul.js',
    'seed.js',
    'test_connection.js',
    'test_long_form.js',
    'test_query_logic.js',
    'test_server.js'
];

// 2. Move files from server/ to server/scripts/ and adjust requires
filesToMove.forEach(file => {
    const srcPath = path.resolve(__dirname, '../../server', file);
    const destPath = path.resolve(__dirname, '../../server/scripts', file);

    if (fs.existsSync(srcPath)) {
        let content = fs.readFileSync(srcPath, 'utf8');

        // Adjust requires
        content = content
            .replace(/require\(['"]\.\/models\//g, "require('../models/")
            .replace(/require\(['"]\.\/config\//g, "require('../config/")
            .replace(/require\(['"]\.\/controllers\//g, "require('../controllers/")
            .replace(/require\(['"]\.\/routes\//g, "require('../routes/")
            .replace(/require\(['"]dotenv['"]\)\.config\(\)/g, "require('dotenv').config({ path: require('path').join(__dirname, '../.env') })")
            .replace(/dotenv\.config\(\)/g, "dotenv.config({ path: require('path').join(__dirname, '../.env') })")
            .replace(/dotenv\.config\(\{ path: require\(['"]path['"]\)\.join\(__dirname, ['"]\.env['"]\) \}\)/g, "dotenv.config({ path: require('path').join(__dirname, '../.env') })")
            .replace(/require\(['"]dotenv['"]\)\.config\(\{ path: require\(['"]path['"]\)\.join\(__dirname, ['"]\.env['"]\) \}\)/g, "require('dotenv').config({ path: require('path').join(__dirname, '../.env') })");

        fs.writeFileSync(destPath, content, 'utf8');
        fs.unlinkSync(srcPath);
        console.log(`Moved & updated: ${file}`);
    } else {
        console.log(`File not found, skipping: ${file}`);
    }
});

// 3. Move debug_assignment.js from root to server/scripts/root_debug_assignment.js
const rootDebugSrc = path.resolve(__dirname, '../../debug_assignment.js');
const rootDebugDest = path.resolve(__dirname, '../../server/scripts/root_debug_assignment.js');
if (fs.existsSync(rootDebugSrc)) {
    let content = fs.readFileSync(rootDebugSrc, 'utf8');
    content = content
        .replace(/require\(['"]\.\/server\/models\//g, "require('../models/")
        .replace(/require\(['"]\.\/server\/config\//g, "require('../config/")
        .replace(/dotenv\.config\(\{ path: ['"]\.\/server\/\.env['"] \}\)/g, "dotenv.config({ path: require('path').join(__dirname, '../.env') })");
    fs.writeFileSync(rootDebugDest, content, 'utf8');
    fs.unlinkSync(rootDebugSrc);
    console.log(`Moved & updated root debug_assignment.js`);
}

console.log('Done!');

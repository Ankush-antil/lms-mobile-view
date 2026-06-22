const fs = require('fs');
const path = require('path');

function searchDir(dir, query) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                searchDir(fullPath, query);
            }
        } else if (file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.md')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.toLowerCase().includes(query.toLowerCase())) {
                const lines = content.split('\n');
                lines.forEach((line, idx) => {
                    if (line.toLowerCase().includes(query.toLowerCase())) {
                        console.log(`${fullPath}:${idx + 1}: ${line.trim().substring(0, 150)}`);
                    }
                });
            }
        }
    }
}

console.log("Searching for client/frontend URLs in server directory...");
searchDir('c:\\Users\\pc\\lms-mobile-view\\LMSMobileApp\\server', 'localhost:');
searchDir('c:\\Users\\pc\\lms-mobile-view\\LMSMobileApp\\server', '.com');
searchDir('c:\\Users\\pc\\lms-mobile-view\\LMSMobileApp\\server', '.in');

const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\pc\\.gemini\\antigravity-ide\\brain\\6d4cd806-d6df-4ef5-9f76-814b0d8f5b53\\.system_generated\\logs\\transcript.jsonl';

async function search() {
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let lineNum = 0;
    for await (const line of rl) {
        lineNum++;
        if (lineNum < 400) {
            const index = line.indexOf('mongodb+srv://');
            if (index !== -1) {
                console.log(`Line ${lineNum}: ${line.substring(index, index + 150)}`);
            }
            const index2 = line.indexOf('mongodb://');
            if (index2 !== -1) {
                console.log(`Line ${lineNum}: ${line.substring(index2, index2 + 150)}`);
            }
        }
    }
}

search();

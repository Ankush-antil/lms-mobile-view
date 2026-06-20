const fs = require('fs');
try {
  const content = fs.readFileSync('debug_output.txt', 'utf16le');
  console.log('=== debug_output.txt ===');
  console.log(content);
} catch (e) {
  console.error(e);
}

try {
  const content2 = fs.readFileSync('debug_output_assignments.txt', 'utf16le');
  console.log('=== debug_output_assignments.txt ===');
  console.log(content2);
} catch (e) {
  console.error(e);
}

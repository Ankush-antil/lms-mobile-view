const mongoose = require('mongoose');

const uris = [
  { name: 'ENV_CURRENT', uri: 'mongodb+srv://digitalstudy:digitalstudy%23%405555@digitalstudy.lzqs6z8.mongodb.net/digitalstudy?retryWrites=true&w=majority&appName=Digitalstudy' },
  { name: 'DEV_URI', uri: 'mongodb+srv://digitalstudy5555_db_user:digital%235555@digitalstudy.lzqs6z8.mongodb.net/?appName=DigitalStudyCluster' },
  { name: 'PROD_URI', uri: 'mongodb+srv://digitalstudy5555_db_user:digital%235555@digitalstudycluster.tkpcaax.mongodb.net/?appName=DigitalStudyCluster' }
];

async function testAll() {
  for (const {name, uri} of uris) {
    try {
      console.log(`Testing ${name}...`);
      const conn = await mongoose.createConnection(uri, {
        serverSelectionTimeoutMS: 5000
      }).asPromise();
      console.log(`${name}: CONNECTED OK!`);
      await conn.close();
    } catch(e) {
      console.log(`${name}: FAILED - ${e.message}`);
    }
  }
  process.exit(0);
}

testAll();

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const uri = process.env.MONGO_URI || 'mongodb+srv://digitalstudy5555_db_user:t040XELTgLuIXZgq@digitalstudycluster.tkpcaax.mongodb.net/';

async function main() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const adminDb = client.db().admin();
        const dbsList = await adminDb.listDatabases();
        console.log("Databases in the cluster:");
        dbsList.databases.forEach(db => {
            console.log(`- Name: ${db.name}, Size: ${db.sizeOnDisk}`);
        });
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.close();
    }
}

main();

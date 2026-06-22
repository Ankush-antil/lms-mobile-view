const { MongoClient } = require('mongodb');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const uri = process.env.MONGO_URI || 'mongodb+srv://digitalstudy5555_db_user:t040XELTgLuIXZgq@digitalstudycluster.tkpcaax.mongodb.net/';

async function main() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        
        // Let's check 'test' database
        const db = client.db('test');
        const collections = await db.listCollections().toArray();
        console.log("Collections in 'test' database:");
        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`- ${col.name}: ${count} documents`);
        }
        
        // Let's see if there is any other database that wasn't shown or if we can list all databases and their collections
        const adminDb = client.db().admin();
        const dbsList = await adminDb.listDatabases();
        for (const dbInfo of dbsList.databases) {
            if (dbInfo.name !== 'admin' && dbInfo.name !== 'local' && dbInfo.name !== 'test') {
                console.log(`Found database: ${dbInfo.name}`);
                const dbInstance = client.db(dbInfo.name);
                const cols = await dbInstance.listCollections().toArray();
                for (const col of cols) {
                    const count = await dbInstance.collection(col.name).countDocuments();
                    console.log(`  - ${col.name}: ${count} documents`);
                }
            }
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.close();
    }
}

main();

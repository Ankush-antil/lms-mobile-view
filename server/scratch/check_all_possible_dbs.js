const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://digitalstudy5555_db_user:t040XELTgLuIXZgq@digitalstudycluster.tkpcaax.mongodb.net/';

const dbNames = [
    'test',
    'digitalstudy',
    'digital_study',
    'digitalstudy5555',
    'lms',
    'lms-mobile-view',
    'lsm-mobile-view',
    'lms-project'
];

async function main() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        for (const dbName of dbNames) {
            console.log(`Checking database: ${dbName}...`);
            const db = client.db(dbName);
            try {
                const collections = await db.listCollections().toArray();
                if (collections.length > 0) {
                    console.log(`  -> FOUND collections in '${dbName}':`);
                    for (const col of collections) {
                        const count = await db.collection(col.name).countDocuments();
                        console.log(`     - ${col.name}: ${count} documents`);
                    }
                } else {
                    console.log(`  -> '${dbName}' has no collections`);
                }
            } catch (err) {
                console.log(`  -> Failed to list collections for '${dbName}': ${err.message}`);
            }
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.close();
    }
}

main();

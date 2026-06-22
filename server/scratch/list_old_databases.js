const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://Ankush:Ankush22@cluster0.fdixm8t.mongodb.net/';

async function main() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const adminDb = client.db().admin();
        const dbsList = await adminDb.listDatabases();
        console.log("Databases in the old cluster:");
        for (const db of dbsList.databases) {
            console.log(`- Name: ${db.name}, Size: ${db.sizeOnDisk}`);
            const dbInstance = client.db(db.name);
            const cols = await dbInstance.listCollections().toArray();
            for (const col of cols) {
                const count = await dbInstance.collection(col.name).countDocuments();
                console.log(`  - ${col.name}: ${count} documents`);
            }
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.close();
    }
}

main();

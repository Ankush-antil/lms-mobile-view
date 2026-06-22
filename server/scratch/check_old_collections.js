const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://Ankush:Ankush22@cluster0.fdixm8t.mongodb.net/lsm-mobile-view';

async function main() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('lsm-mobile-view');
        const collections = await db.listCollections().toArray();
        console.log("Collections in old cluster database 'lsm-mobile-view':");
        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`- ${col.name}: ${count} documents`);
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.close();
    }
}

main();

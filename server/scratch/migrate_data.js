const { MongoClient } = require('mongodb');

const sourceUri = 'mongodb+srv://Ankush:Ankush22@cluster0.fdixm8t.mongodb.net/';
const sourceDbName = 'lsm-mobile-view';

const destUri = 'mongodb+srv://digitalstudy5555_db_user:t040XELTgLuIXZgq@digitalstudycluster.tkpcaax.mongodb.net/';
const destDbName = 'test';

async function migrate() {
    const sourceClient = new MongoClient(sourceUri);
    const destClient = new MongoClient(destUri);

    try {
        console.log("Connecting to Source Database...");
        await sourceClient.connect();
        const sourceDb = sourceClient.db(sourceDbName);
        console.log("Connected to Source Database successfully!");

        console.log("Connecting to Destination Database...");
        await destClient.connect();
        const destDb = destClient.db(destDbName);
        console.log("Connected to Destination Database successfully!");

        // List all collections in source
        const collections = await sourceDb.listCollections().toArray();
        console.log(`Found ${collections.length} collections in source database.`);

        for (const colInfo of collections) {
            const colName = colInfo.name;
            console.log(`\nMigrating collection: '${colName}'...`);

            // Fetch source data
            const documents = await sourceDb.collection(colName).find({}).toArray();
            console.log(`- Source has ${documents.length} documents.`);

            // Drop destination collection if it exists
            const destCollections = await destDb.listCollections({ name: colName }).toArray();
            if (destCollections.length > 0) {
                console.log(`- Dropping existing collection '${colName}' in destination...`);
                await destDb.collection(colName).drop();
            }

            if (documents.length > 0) {
                console.log(`- Inserting ${documents.length} documents into destination '${colName}'...`);
                await destDb.collection(colName).insertMany(documents);
                console.log(`- Collection '${colName}' migrated successfully!`);
            } else {
                // Just create empty collection if it was empty
                console.log(`- Creating empty collection '${colName}' in destination...`);
                await destDb.createCollection(colName);
                console.log(`- Collection '${colName}' created empty successfully!`);
            }
        }

        console.log("\n================================================");
        console.log("MIGRATION COMPLETED SUCCESSFULLY! 🎉");
        console.log("================================================");

    } catch (e) {
        console.error("Migration failed with error:", e);
    } finally {
        await sourceClient.close();
        await destClient.close();
    }
}

migrate();

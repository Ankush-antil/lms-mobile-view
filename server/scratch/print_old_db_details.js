const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://Ankush:Ankush22@cluster0.fdixm8t.mongodb.net/';

async function main() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        
        // Print lsm-mobile-view database
        const db1 = client.db('lsm-mobile-view');
        console.log("\n================ LSM-MOBILE-VIEW DATABASE ===================");
        const users1 = await db1.collection('users').find({}).toArray();
        console.log("Users:");
        users1.forEach(u => console.log(`- Name: ${u.name}, Email: ${u.email}, Role: ${u.role}`));
        const tests1 = await db1.collection('tests').find({}).toArray();
        console.log("Tests:");
        tests1.forEach(t => console.log(`- Title: ${t.title || t.name}, Course: ${t.course}, Subject: ${t.subject}`));
        
        // Print e-comm database
        const db2 = client.db('e-comm');
        console.log("\n================ E-COMM DATABASE ===================");
        const users2 = await db2.collection('users').find({}).toArray();
        console.log("Users:");
        users2.forEach(u => console.log(`- Name: ${u.name}, Email: ${u.email}, Role: ${u.role}`));
        const tests2 = await db2.collection('tests').find({}).toArray();
        console.log("Tests:");
        tests2.forEach(t => console.log(`- Title: ${t.title || t.name}, Course: ${t.course}, Subject: ${t.subject}`));
        
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.close();
    }
}

main();

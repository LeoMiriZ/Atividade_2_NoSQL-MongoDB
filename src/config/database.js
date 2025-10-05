const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
if (!uri) {
    throw new Error('A variável de ambiente MONGO_URI não está definida no arquivo .env');
}

const client = new MongoClient(uri);

let db;

async function connectToDb() {
    if (db) return db;
    try {
        await client.connect();
        console.log("Conectado ao MongoDB Atlas!");
        db = client.db();
        return db;
    } catch (err) {
        console.error("Erro ao conectar ao MongoDB", err);
        process.exit(1);
    }
}

module.exports = { connectToDb };
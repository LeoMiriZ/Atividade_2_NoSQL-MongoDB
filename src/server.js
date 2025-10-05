require('dotenv').config();

const app = require('./app');
const { connectToDb } = require('./config/database');

const port = process.env.PORT || 3000;

async function startServer() {
    try {
        
        await connectToDb();
        
        app.listen(port, () => {
            console.log(`Servidor rodando em http://localhost:${port}`);
        });
    } catch (error) {
        console.error("Não foi possível iniciar o servidor.", error);
        process.exit(1);
    }
}

startServer();
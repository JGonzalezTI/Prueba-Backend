import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || ''),
    });

// Verificar conexión
pool.query('SELECT 1')
    .then(() => console.log('✅ Conexión a PostgreSQL establecida con éxito'))
    .catch(err => console.error('❌ Error conectando a PostgreSQL:', err));

// Manejar errores inesperados del pool
    pool.on('error', (err) => {
        console.error('⚠️ Error inesperado en el pool de conexiones:', err);
    });

export default pool;

const { Pool } = require('pg');
require('dotenv').config();

// En la nube (Render + Neon) se usa DATABASE_URL con SSL.
// En local (docker compose) se siguen usando DB_HOST, DB_USER, etc.
const config = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    };

const pool = new Pool(config);

pool.on('connect', () => {
  console.log('Conectado exitosamente a la base de datos PostgreSQL');
});

// Sin esto, una conexión caída (Neon cierra las inactivas) tumbaría el servidor
pool.on('error', (error) => {
  console.error('Error en una conexión inactiva de la base de datos:', error.message);
});

module.exports = pool;
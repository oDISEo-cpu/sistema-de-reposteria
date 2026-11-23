const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rutas de la API (cada archivo vive en src/routes/)
app.use('/api/usuarios', require('./routes/usuarios.routes'));
app.use('/api/inventario', require('./routes/inventario.routes'));
app.use('/api/recetas', require('./routes/recetas.routes'));
app.use('/api/produccion', require('./routes/produccion.routes'));
app.use('/api/pedidos', require('./routes/pedidos.routes'));
app.use('/api/pagos', require('./routes/pagos.routes'));
app.use('/api/reportes', require('./routes/reportes.routes'));
app.use('/api/tasas', require('./routes/tasas.routes'));

// Ruta de prueba inicial
app.get('/', (req, res) => {
  res.json({ mensaje: '¡Servidor de la Repostería funcionando al 100%!' });
});

// Cualquier ruta que no exista responde en JSON (así el frontend ve un mensaje claro y no HTML)
app.use((req, res) => {
  res.status(404).json({ error: `La ruta ${req.method} ${req.originalUrl} no existe en el servidor` });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  // Empieza a consultar las tasas (dólar BCV, euro BCV y USDT) cada pocos minutos
  require('./services/tasas').iniciar();
});
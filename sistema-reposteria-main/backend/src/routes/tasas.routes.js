const express = require('express');
const router = express.Router();
const tasas = require('../services/tasas');

const ESPERA_MS = 30 * 1000;
let ultimaForzada = 0;

// Última tasa guardada + estado de la fuente (el frontend lo consulta cada minuto)
router.get('/', async (req, res) => {
  try {
    const lista = await tasas.leerTasas();
    res.json({ tasas: lista, estado: tasas.estadoPublico(lista) });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Error al obtener las tasas' });
  }
});

// Forzar una actualización ahora (con espera mínima para no saturar la fuente)
router.post('/actualizar', async (req, res) => {
  const ahora = Date.now();
  if (ahora - ultimaForzada < ESPERA_MS) {
    return res.status(429).json({ error: 'Espera unos segundos antes de volver a actualizar' });
  }
  ultimaForzada = ahora;
  try {
    await tasas.actualizar();
    const lista = await tasas.leerTasas();
    res.json({ tasas: lista, estado: tasas.estadoPublico(lista) });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'No se pudo actualizar las tasas' });
  }
});

module.exports = router;
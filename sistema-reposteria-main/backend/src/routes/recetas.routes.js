const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Valida y normaliza la lista de ingredientes que llega del front
const validarIngredientes = (ingredientes) => {
  if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
    return 'La receta debe tener al menos un ingrediente';
  }
  const ids = new Set();
  for (const ing of ingredientes) {
    if (!ing.inventario_id || !(Number(ing.cantidad) > 0)) {
      return 'Cada ingrediente necesita un insumo y una cantidad mayor a 0';
    }
    if (ids.has(ing.inventario_id)) {
      return 'No puedes repetir el mismo ingrediente en una receta';
    }
    ids.add(ing.inventario_id);
  }
  return null;
};

const insertarIngredientes = async (client, recetaId, ingredientes) => {
  for (const ing of ingredientes) {
    await client.query(
      'INSERT INTO receta_ingredientes (receta_id, inventario_id, cantidad) VALUES ($1, $2, $3)',
      [recetaId, ing.inventario_id, ing.cantidad]
    );
  }
};

// Listar recetas con sus ingredientes y costo calculado
router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT r.id, r.nombre, r.descripcion, r.precio_venta,
             COALESCE(SUM(ri.cantidad * i.precio_unitario), 0) AS costo,
             COALESCE(
               json_agg(
                 json_build_object(
                   'inventario_id', i.id,
                   'nombre_producto', i.nombre_producto,
                   'unidad_medida', i.unidad_medida,
                   'cantidad', ri.cantidad,
                   'precio_unitario', i.precio_unitario
                 ) ORDER BY i.nombre_producto
               ) FILTER (WHERE i.id IS NOT NULL),
               '[]'
             ) AS ingredientes
      FROM recetas r
      LEFT JOIN receta_ingredientes ri ON ri.receta_id = r.id
      LEFT JOIN inventario i ON i.id = ri.inventario_id
      GROUP BY r.id
      ORDER BY r.id ASC
    `);
    res.json(resultado.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Error al obtener las recetas' });
  }
});

// Crear receta
router.post('/', async (req, res) => {
  const { nombre, descripcion, precio_venta, ingredientes } = req.body;

  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });
  const errorIng = validarIngredientes(ingredientes);
  if (errorIng) return res.status(400).json({ error: errorIng });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const receta = await client.query(
      'INSERT INTO recetas (nombre, descripcion, precio_venta) VALUES ($1, $2, $3) RETURNING *',
      [nombre, descripcion || null, precio_venta ?? 0]
    );
    await insertarIngredientes(client, receta.rows[0].id, ingredientes);
    await client.query('COMMIT');

    res.status(201).json({ mensaje: 'Receta creada con éxito', receta: receta.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error.message);
    res.status(500).json({ error: 'Error al crear la receta' });
  } finally {
    client.release();
  }
});

// Actualizar receta (reemplaza la lista de ingredientes)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio_venta, ingredientes } = req.body;

  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });
  const errorIng = validarIngredientes(ingredientes);
  if (errorIng) return res.status(400).json({ error: errorIng });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const receta = await client.query(
      'UPDATE recetas SET nombre = $1, descripcion = $2, precio_venta = $3 WHERE id = $4 RETURNING *',
      [nombre, descripcion || null, precio_venta ?? 0, id]
    );
    if (receta.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Receta no encontrada' });
    }
    await client.query('DELETE FROM receta_ingredientes WHERE receta_id = $1', [id]);
    await insertarIngredientes(client, id, ingredientes);
    await client.query('COMMIT');

    res.json({ mensaje: 'Receta actualizada con éxito', receta: receta.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error.message);
    res.status(500).json({ error: 'Error al actualizar la receta' });
  } finally {
    client.release();
  }
});

// Eliminar receta (sus ingredientes se borran en cascada)
router.delete('/:id', async (req, res) => {
  try {
    const eliminada = await pool.query('DELETE FROM recetas WHERE id = $1 RETURNING id', [req.params.id]);
    if (eliminada.rows.length === 0) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }
    res.json({ mensaje: 'Receta eliminada con éxito' });
  } catch (error) {
    console.error(error.message);
    if (error.code === '23503') {
      return res.status(400).json({ error: 'No puedes eliminar una receta que ya hace parte de un pedido' });
    }
    res.status(500).json({ error: 'Error al eliminar la receta' });
  }
});

module.exports = router;
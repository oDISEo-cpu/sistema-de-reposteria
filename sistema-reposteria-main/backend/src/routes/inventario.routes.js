const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Obtener todos los productos del inventario
router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM inventario ORDER BY id ASC');
    res.json(resultado.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Error al obtener el inventario' });
  }
});

// Agregar un nuevo producto al inventario
router.post('/', async (req, res) => {
  try {
    const { nombre_producto, categoria, stock, unidad_medida, precio_unitario, stock_minimo } = req.body;

    if (!nombre_producto || !categoria || !unidad_medida) {
      return res.status(400).json({ error: 'Nombre, categoría y unidad de medida son requeridos' });
    }

    const nuevoProducto = await pool.query(
      `INSERT INTO inventario (nombre_producto, categoria, stock, unidad_medida, precio_unitario, stock_minimo)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nombre_producto, categoria, stock ?? 0, unidad_medida, precio_unitario ?? 0, stock_minimo ?? 0]
    );

    res.status(201).json({
      mensaje: 'Producto agregado al inventario con éxito',
      producto: nuevoProducto.rows[0],
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Error al agregar el producto al inventario' });
  }
});

// Actualizar un producto
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_producto, categoria, stock, unidad_medida, precio_unitario, stock_minimo } = req.body;

    const actualizado = await pool.query(
      `UPDATE inventario
       SET nombre_producto = $1, categoria = $2, stock = $3, unidad_medida = $4,
           precio_unitario = $5, stock_minimo = $6, actualizado_en = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [nombre_producto, categoria, stock, unidad_medida, precio_unitario, stock_minimo ?? 0, id]
    );

    if (actualizado.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ mensaje: 'Producto actualizado con éxito', producto: actualizado.rows[0] });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Error al actualizar el producto' });
  }
});

// Eliminar un producto
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const eliminado = await pool.query('DELETE FROM inventario WHERE id = $1 RETURNING id', [id]);

    if (eliminado.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ mensaje: 'Producto eliminado con éxito' });
  } catch (error) {
    console.error(error.message);
    if (error.code === '23503') {
      return res.status(400).json({ error: 'No puedes eliminar un insumo que está siendo usado en una receta' });
    }
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
});

module.exports = router;
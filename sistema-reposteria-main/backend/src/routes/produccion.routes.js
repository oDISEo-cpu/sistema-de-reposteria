const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Historial de órdenes de producción (las 50 más recientes)
router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT id, receta_id, receta_nombre, cantidad, costo_total, creado_en
       FROM ordenes_produccion
       ORDER BY id DESC
       LIMIT 50`
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Error al obtener el historial de producción' });
  }
});

// Registrar una orden de producción:
//   1) verifica que alcance el stock de cada ingrediente
//   2) descuenta los ingredientes del inventario
//   3) guarda la orden
// Todo ocurre en una transacción: si algo falla, no se descuenta nada.
router.post('/', async (req, res) => {
  const recetaId = Number(req.body.receta_id);
  const cantidad = Number(req.body.cantidad);

  if (!Number.isInteger(recetaId) || recetaId <= 0) {
    return res.status(400).json({ error: 'Debes elegir una receta' });
  }
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return res.status(400).json({ error: 'La cantidad debe ser un número entero mayor a 0' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const receta = await client.query('SELECT id, nombre FROM recetas WHERE id = $1', [recetaId]);
    if (receta.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Receta no encontrada' });
    }

    // FOR UPDATE bloquea esas filas de inventario hasta terminar la transacción,
    // así dos órdenes simultáneas no pueden gastar el mismo stock.
    // ORDER BY i.id mantiene siempre el mismo orden de bloqueo (evita interbloqueos).
    const requeridos = await client.query(
      `SELECT i.id, i.nombre_producto, i.unidad_medida,
              i.stock AS disponible,
              ri.cantidad * $2 AS necesario,
              ri.cantidad * i.precio_unitario * $2 AS costo,
              i.stock < ri.cantidad * $2 AS falta
       FROM receta_ingredientes ri
       JOIN inventario i ON i.id = ri.inventario_id
       WHERE ri.receta_id = $1
       ORDER BY i.id
       FOR UPDATE OF i`,
      [recetaId, cantidad]
    );

    if (requeridos.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'La receta no tiene ingredientes' });
    }

    const faltantes = requeridos.rows.filter((r) => r.falta);
    if (faltantes.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `Inventario insuficiente: ${faltantes.map((f) => f.nombre_producto).join(', ')}`,
        faltantes: faltantes.map((f) => ({
          nombre_producto: f.nombre_producto,
          unidad_medida: f.unidad_medida,
          necesario: f.necesario,
          disponible: f.disponible,
        })),
      });
    }

    const actualizados = await client.query(
      `UPDATE inventario i
       SET stock = i.stock - ri.cantidad * $2,
           actualizado_en = CURRENT_TIMESTAMP
       FROM receta_ingredientes ri
       WHERE ri.inventario_id = i.id AND ri.receta_id = $1
       RETURNING i.id, i.nombre_producto, i.unidad_medida, i.stock, i.stock_minimo`,
      [recetaId, cantidad]
    );

    const costoTotal =
      Math.round(requeridos.rows.reduce((acc, r) => acc + Number(r.costo), 0) * 100) / 100;

    const orden = await client.query(
      `INSERT INTO ordenes_produccion (receta_id, receta_nombre, cantidad, costo_total)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [recetaId, receta.rows[0].nombre, cantidad, costoTotal]
    );

    await client.query('COMMIT');

    // Insumos que quedaron en o por debajo de su mínimo (entran a la lista de compras)
    const bajoMinimo = actualizados.rows
      .filter((r) => Number(r.stock) <= Number(r.stock_minimo))
      .map((r) => ({
        id: r.id,
        nombre_producto: r.nombre_producto,
        unidad_medida: r.unidad_medida,
        stock: r.stock,
        stock_minimo: r.stock_minimo,
      }));

    res.status(201).json({
      mensaje: 'Producción registrada con éxito',
      orden: orden.rows[0],
      bajo_minimo: bajoMinimo,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(error.message);
    res.status(500).json({ error: 'Error al registrar la producción' });
  } finally {
    client.release();
  }
});

module.exports = router;
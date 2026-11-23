const express = require('express');
const router = express.Router();
const pool = require('../config/db');

const ESTADOS = ['pendiente', 'en_proceso', 'listo', 'entregado', 'cancelado'];

const redondear = (valor) => Math.round(Number(valor) * 100) / 100;

const validarPedido = (cliente, items, estado) => {
  if (!cliente || !String(cliente).trim()) {
    return 'El nombre del cliente es requerido';
  }
  if (estado && !ESTADOS.includes(estado)) {
    return 'El estado del pedido no es válido';
  }
  if (!Array.isArray(items) || items.length === 0) {
    return 'El pedido debe tener al menos un producto';
  }

  const recetas = new Set();
  for (const item of items) {
    const recetaId = Number(item.receta_id);
    const cantidad = Number(item.cantidad);
    if (!Number.isInteger(recetaId) || recetaId <= 0) {
      return 'Cada producto debe tener una receta válida';
    }
    if (!(cantidad > 0)) {
      return 'Las cantidades deben ser mayores a 0';
    }
    if (recetas.has(recetaId)) {
      return 'No puedes repetir la misma receta en el pedido';
    }
    recetas.add(recetaId);
  }
  return null;
};

// Trae precio de venta y costo actual de cada receta
const obtenerRecetas = async (client, ids) => {
  const resultado = await client.query(
    `SELECT r.id, r.nombre, r.precio_venta,
            COALESCE(SUM(ri.cantidad * i.precio_unitario), 0) AS costo_unitario
     FROM recetas r
     LEFT JOIN receta_ingredientes ri ON ri.receta_id = r.id
     LEFT JOIN inventario i ON i.id = ri.inventario_id
     WHERE r.id = ANY($1::int[])
     GROUP BY r.id`,
    [ids]
  );
  return new Map(resultado.rows.map((r) => [r.id, r]));
};

// Calcula cuánto inventario consume una lista de productos
const calcularRequerido = async (client, filas) => {
  const resultado = await client.query(
    `SELECT i.id, i.nombre_producto, i.unidad_medida, i.stock,
            SUM(ri.cantidad * x.cantidad) AS requerido
     FROM unnest($1::int[], $2::numeric[]) AS x(receta_id, cantidad)
     JOIN receta_ingredientes ri ON ri.receta_id = x.receta_id
     JOIN inventario i ON i.id = ri.inventario_id
     GROUP BY i.id`,
    [filas.map((f) => f.receta_id), filas.map((f) => f.cantidad)]
  );
  return resultado.rows;
};

const validarStock = (requerido) => {
  for (const fila of requerido) {
    if (Number(fila.stock) + 0.0001 < Number(fila.requerido)) {
      return `Stock insuficiente de "${fila.nombre_producto}": necesitas ${Number(
        fila.requerido
      ).toFixed(2)} ${fila.unidad_medida} y solo hay ${Number(fila.stock).toFixed(2)}`;
    }
  }
  return null;
};

// Ajusta el inventario: signo -1 descuenta, +1 devuelve
const ajustarStock = async (client, filas, signo) => {
  if (filas.length === 0) return;
  await client.query(
    `UPDATE inventario SET stock = inventario.stock + ($1 * t.requerido),
            actualizado_en = CURRENT_TIMESTAMP
     FROM (
       SELECT ri.inventario_id, SUM(ri.cantidad * x.cantidad) AS requerido
       FROM unnest($2::int[], $3::numeric[]) AS x(receta_id, cantidad)
       JOIN receta_ingredientes ri ON ri.receta_id = x.receta_id
       GROUP BY ri.inventario_id
     ) t
     WHERE inventario.id = t.inventario_id`,
    [signo, filas.map((f) => f.receta_id), filas.map((f) => f.cantidad)]
  );
};

const filasDePedido = async (client, pedidoId) => {
  const resultado = await client.query(
    'SELECT receta_id, cantidad FROM pedido_detalle WHERE pedido_id = $1 ORDER BY id',
    [pedidoId]
  );
  return resultado.rows.map((r) => ({ receta_id: r.receta_id, cantidad: Number(r.cantidad) }));
};

const totalPagado = async (client, pedidoId) => {
  const resultado = await client.query(
    'SELECT COALESCE(SUM(monto), 0) AS pagado FROM pagos WHERE pedido_id = $1',
    [pedidoId]
  );
  return Number(resultado.rows[0].pagado);
};

const estadoPago = (total, pagado) => {
  if (pagado <= 0) return 'pendiente';
  if (pagado + 0.0001 >= Number(total)) return 'pagado';
  return 'parcial';
};

// Listar pedidos con su detalle, pagos y saldo
router.get('/', async (req, res) => {
  try {
    const { estado } = req.query;
    const parametros = [];
    let filtro = '';

    if (estado) {
      if (!ESTADOS.includes(estado)) {
        return res.status(400).json({ error: 'El estado del pedido no es válido' });
      }
      parametros.push(estado);
      filtro = 'WHERE p.estado = $1';
    }

    const resultado = await pool.query(
      `SELECT p.id, p.cliente, p.telefono,
              to_char(p.fecha_entrega, 'YYYY-MM-DD') AS fecha_entrega,
              p.estado, p.notas, p.total, p.creado_en, p.actualizado_en,
              COALESCE((SELECT SUM(pg.monto) FROM pagos pg WHERE pg.pedido_id = p.id), 0) AS pagado,
              p.total - COALESCE((SELECT SUM(pg.monto) FROM pagos pg WHERE pg.pedido_id = p.id), 0) AS saldo,
              COALESCE((
                SELECT json_agg(json_build_object(
                  'id', d.id,
                  'receta_id', d.receta_id,
                  'nombre', r.nombre,
                  'cantidad', d.cantidad,
                  'precio_unitario', d.precio_unitario,
                  'costo_unitario', d.costo_unitario
                ) ORDER BY d.id)
                FROM pedido_detalle d
                JOIN recetas r ON r.id = d.receta_id
                WHERE d.pedido_id = p.id
              ), '[]') AS items
       FROM pedidos p
       ${filtro}
       ORDER BY p.id DESC`,
      parametros
    );

    res.json(
      resultado.rows.map((p) => ({
        ...p,
        total: Number(p.total),
        pagado: Number(p.pagado),
        saldo: Number(p.saldo),
        estado_pago: estadoPago(p.total, Number(p.pagado)),
      }))
    );
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Error al obtener los pedidos' });
  }
});

// Crear un pedido (descuenta los ingredientes del inventario)
router.post('/', async (req, res) => {
  const { cliente, telefono, fecha_entrega, notas, estado, items } = req.body;
  const errorValidacion = validarPedido(cliente, items, estado);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const estadoFinal = estado || 'pendiente';
  const filas = items.map((i) => ({
    receta_id: Number(i.receta_id),
    cantidad: Number(i.cantidad),
  }));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const recetas = await obtenerRecetas(client, filas.map((f) => f.receta_id));
    if (recetas.size !== filas.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Alguna de las recetas seleccionadas no existe' });
    }

    const detalle = filas.map((f) => {
      const receta = recetas.get(f.receta_id);
      return {
        ...f,
        precio_unitario: Number(receta.precio_venta),
        costo_unitario: Number(receta.costo_unitario),
      };
    });
    const total = redondear(
      detalle.reduce((acc, d) => acc + d.cantidad * d.precio_unitario, 0)
    );

    if (estadoFinal !== 'cancelado') {
      const requerido = await calcularRequerido(client, filas);
      const errorStock = validarStock(requerido);
      if (errorStock) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: errorStock });
      }
    }

    const pedido = await client.query(
      `INSERT INTO pedidos (cliente, telefono, fecha_entrega, estado, notas, total)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [String(cliente).trim(), telefono || null, fecha_entrega || null, estadoFinal, notas || null, total]
    );
    const pedidoId = pedido.rows[0].id;

    for (const d of detalle) {
      await client.query(
        `INSERT INTO pedido_detalle (pedido_id, receta_id, cantidad, precio_unitario, costo_unitario)
         VALUES ($1, $2, $3, $4, $5)`,
        [pedidoId, d.receta_id, d.cantidad, d.precio_unitario, d.costo_unitario]
      );
    }

    if (estadoFinal !== 'cancelado') {
      await ajustarStock(client, filas, -1);
    }

    await client.query('COMMIT');
    res.status(201).json({ mensaje: 'Pedido creado con éxito', id: pedidoId, total });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error.message);
    res.status(500).json({ error: 'Error al crear el pedido' });
  } finally {
    client.release();
  }
});

// Actualizar un pedido (repone y vuelve a descontar inventario)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { cliente, telefono, fecha_entrega, notas, estado, items } = req.body;
  const errorValidacion = validarPedido(cliente, items, estado);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const filas = items.map((i) => ({
    receta_id: Number(i.receta_id),
    cantidad: Number(i.cantidad),
  }));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const pedido = await client.query('SELECT * FROM pedidos WHERE id = $1 FOR UPDATE', [id]);
    if (pedido.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const estadoAnterior = pedido.rows[0].estado;
    const estadoFinal = estado || estadoAnterior;
    const pagado = await totalPagado(client, id);

    if (estadoFinal === 'cancelado' && pagado > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No puedes cancelar un pedido con pagos registrados' });
    }

    const filasAnteriores = await filasDePedido(client, id);

    // Se repone lo que consumía el pedido para poder validar el nuevo contenido
    if (estadoAnterior !== 'cancelado') {
      await ajustarStock(client, filasAnteriores, 1);
    }

    const recetas = await obtenerRecetas(client, filas.map((f) => f.receta_id));
    if (recetas.size !== filas.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Alguna de las recetas seleccionadas no existe' });
    }

    // Conserva el precio y costo con los que se vendió originalmente cada receta
    const detalleAnterior = await client.query(
      'SELECT receta_id, precio_unitario, costo_unitario FROM pedido_detalle WHERE pedido_id = $1',
      [id]
    );
    const preciosPrevios = new Map(
      detalleAnterior.rows.map((d) => [
        d.receta_id,
        { precio_unitario: Number(d.precio_unitario), costo_unitario: Number(d.costo_unitario) },
      ])
    );

    const detalle = filas.map((f) => {
      const previo = preciosPrevios.get(f.receta_id);
      const receta = recetas.get(f.receta_id);
      return {
        ...f,
        precio_unitario: previo ? previo.precio_unitario : Number(receta.precio_venta),
        costo_unitario: previo ? previo.costo_unitario : Number(receta.costo_unitario),
      };
    });
    const total = redondear(detalle.reduce((acc, d) => acc + d.cantidad * d.precio_unitario, 0));

    if (total + 0.0001 < pagado) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `El total del pedido no puede ser menor a lo ya pagado ($${pagado.toFixed(2)})`,
      });
    }

    if (estadoFinal !== 'cancelado') {
      const requerido = await calcularRequerido(client, filas);
      const errorStock = validarStock(requerido);
      if (errorStock) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: errorStock });
      }
    }

    await client.query(
      `UPDATE pedidos
       SET cliente = $1, telefono = $2, fecha_entrega = $3, estado = $4,
           notas = $5, total = $6, actualizado_en = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [String(cliente).trim(), telefono || null, fecha_entrega || null, estadoFinal, notas || null, total, id]
    );
    await client.query('DELETE FROM pedido_detalle WHERE pedido_id = $1', [id]);
    for (const d of detalle) {
      await client.query(
        `INSERT INTO pedido_detalle (pedido_id, receta_id, cantidad, precio_unitario, costo_unitario)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, d.receta_id, d.cantidad, d.precio_unitario, d.costo_unitario]
      );
    }

    if (estadoFinal !== 'cancelado') {
      await ajustarStock(client, filas, -1);
    }

    await client.query('COMMIT');
    res.json({ mensaje: 'Pedido actualizado con éxito', id: Number(id), total });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error.message);
    res.status(500).json({ error: 'Error al actualizar el pedido' });
  } finally {
    client.release();
  }
});

// Cambiar solo el estado del pedido
router.patch('/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!ESTADOS.includes(estado)) {
    return res.status(400).json({ error: 'El estado del pedido no es válido' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const pedido = await client.query('SELECT * FROM pedidos WHERE id = $1 FOR UPDATE', [id]);
    if (pedido.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const estadoAnterior = pedido.rows[0].estado;
    if (estadoAnterior === estado) {
      await client.query('ROLLBACK');
      return res.json({ mensaje: 'El pedido ya tiene ese estado' });
    }

    if (estado === 'cancelado') {
      const pagado = await totalPagado(client, id);
      if (pagado > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'No puedes cancelar un pedido con pagos registrados' });
      }
    }

    const filas = await filasDePedido(client, id);

    if (estadoAnterior !== 'cancelado' && estado === 'cancelado') {
      await ajustarStock(client, filas, 1);
    } else if (estadoAnterior === 'cancelado' && estado !== 'cancelado') {
      const requerido = await calcularRequerido(client, filas);
      const errorStock = validarStock(requerido);
      if (errorStock) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: errorStock });
      }
      await ajustarStock(client, filas, -1);
    }

    await client.query(
      'UPDATE pedidos SET estado = $1, actualizado_en = CURRENT_TIMESTAMP WHERE id = $2',
      [estado, id]
    );

    await client.query('COMMIT');
    res.json({ mensaje: 'Estado del pedido actualizado' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error.message);
    res.status(500).json({ error: 'Error al actualizar el estado del pedido' });
  } finally {
    client.release();
  }
});

// Eliminar un pedido (solo si no tiene pagos)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const pedido = await client.query('SELECT * FROM pedidos WHERE id = $1 FOR UPDATE', [id]);
    if (pedido.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const pagado = await totalPagado(client, id);
    if (pagado > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'No puedes eliminar un pedido con pagos registrados. Elimina primero los pagos.',
      });
    }

    if (pedido.rows[0].estado !== 'cancelado') {
      const filas = await filasDePedido(client, id);
      await ajustarStock(client, filas, 1);
    }

    await client.query('DELETE FROM pedidos WHERE id = $1', [id]);
    await client.query('COMMIT');
    res.json({ mensaje: 'Pedido eliminado con éxito' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error.message);
    res.status(500).json({ error: 'Error al eliminar el pedido' });
  } finally {
    client.release();
  }
});

module.exports = router;

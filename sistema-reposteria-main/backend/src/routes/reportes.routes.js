const express = require('express');
const router = express.Router();
const pool = require('../config/db');

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const num = (v) => Math.round(Number(v || 0) * 100) / 100;

const hoyISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const sumarDias = (iso, dias) => {
  const [y, m, d] = iso.split('-').map(Number);
  const f = new Date(Date.UTC(y, m - 1, d + dias));
  return f.toISOString().slice(0, 10);
};

/**
 * GET /api/reportes?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 * Una venta es un pedido NO cancelado creado dentro del rango.
 * Ganancia = cantidad * (precio_unitario - costo_unitario) guardados al vender.
 */
router.get('/', async (req, res) => {
  try {
    const hasta = FECHA.test(req.query.hasta || '') ? req.query.hasta : hoyISO();
    const desde = FECHA.test(req.query.desde || '') ? req.query.desde : sumarDias(hasta, -29);
    if (desde > hasta) {
      return res.status(400).json({ error: 'La fecha inicial no puede ser mayor que la final' });
    }
    const dias = Math.round((Date.parse(hasta) - Date.parse(desde)) / 86400000) + 1;
    if (dias > 800) {
      return res.status(400).json({ error: 'El rango máximo es de unos 2 años' });
    }
    const agrupar = dias <= 62 ? 'day' : dias <= 200 ? 'week' : 'month';

    const [resumen, serie, top, metodos, estados, cobrado] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS pedidos,
                COALESCE(SUM(p.total), 0) AS ventas,
                COALESCE(SUM(d.costo), 0) AS costo,
                COALESCE(SUM(GREATEST(p.total - COALESCE(pg.pagado, 0), 0)), 0) AS por_cobrar
           FROM pedidos p
           LEFT JOIN (SELECT pedido_id, SUM(cantidad * costo_unitario) AS costo
                        FROM pedido_detalle GROUP BY pedido_id) d ON d.pedido_id = p.id
           LEFT JOIN (SELECT pedido_id, SUM(monto) AS pagado FROM pagos GROUP BY pedido_id) pg ON pg.pedido_id = p.id
          WHERE p.estado <> 'cancelado' AND p.creado_en::date BETWEEN $1 AND $2`,
        [desde, hasta],
      ),
      pool.query(
        `SELECT to_char(g.f, 'YYYY-MM-DD') AS fecha,
                COALESCE(SUM(p.total), 0) AS ventas,
                COALESCE(SUM(p.total - COALESCE(d.costo, 0)), 0) AS ganancia,
                COUNT(p.id)::int AS pedidos
           FROM generate_series(date_trunc($3, $1::date), $2::date, ('1 ' || $3)::interval) AS g(f)
           LEFT JOIN pedidos p
                  ON p.estado <> 'cancelado'
                 AND p.creado_en::date BETWEEN GREATEST(g.f::date, $1::date) AND LEAST((g.f + ('1 ' || $3)::interval)::date - 1, $2::date)
           LEFT JOIN (SELECT pedido_id, SUM(cantidad * costo_unitario) AS costo
                        FROM pedido_detalle GROUP BY pedido_id) d ON d.pedido_id = p.id
          GROUP BY g.f ORDER BY g.f`,
        [desde, hasta, agrupar],
      ),
      pool.query(
        `SELECT r.id, r.nombre,
                SUM(d.cantidad) AS unidades,
                SUM(d.cantidad * d.precio_unitario) AS ingresos,
                SUM(d.cantidad * (d.precio_unitario - d.costo_unitario)) AS ganancia
           FROM pedido_detalle d
           JOIN pedidos p ON p.id = d.pedido_id
           JOIN recetas r ON r.id = d.receta_id
          WHERE p.estado <> 'cancelado' AND p.creado_en::date BETWEEN $1 AND $2
          GROUP BY r.id, r.nombre
          ORDER BY unidades DESC, ingresos DESC
          LIMIT 20`,
        [desde, hasta],
      ),
      pool.query(
        `SELECT metodo, COUNT(*)::int AS cantidad, SUM(monto) AS total
           FROM pagos WHERE creado_en::date BETWEEN $1 AND $2
          GROUP BY metodo ORDER BY total DESC`,
        [desde, hasta],
      ),
      pool.query(
        `SELECT estado, COUNT(*)::int AS cantidad FROM pedidos
          WHERE creado_en::date BETWEEN $1 AND $2 GROUP BY estado`,
        [desde, hasta],
      ),
      pool.query(`SELECT COALESCE(SUM(monto), 0) AS cobrado FROM pagos WHERE creado_en::date BETWEEN $1 AND $2`, [
        desde,
        hasta,
      ]),
    ]);

    const r = resumen.rows[0];
    const ventas = num(r.ventas);
    const costo = num(r.costo);
    const ganancia = num(ventas - costo);
    res.json({
      desde,
      hasta,
      agrupar,
      resumen: {
        pedidos: r.pedidos,
        ventas,
        costo,
        ganancia,
        margen: ventas > 0 ? Math.round((ganancia / ventas) * 1000) / 10 : 0,
        ticket: r.pedidos > 0 ? num(ventas / r.pedidos) : 0,
        cobrado: num(cobrado.rows[0].cobrado),
        por_cobrar: num(r.por_cobrar),
      },
      serie: serie.rows.map((s) => ({
        fecha: s.fecha,
        ventas: num(s.ventas),
        ganancia: num(s.ganancia),
        pedidos: s.pedidos,
      })),
      top: top.rows.map((t) => ({
        id: t.id,
        nombre: t.nombre,
        unidades: num(t.unidades),
        ingresos: num(t.ingresos),
        ganancia: num(t.ganancia),
      })),
      metodos: metodos.rows.map((m) => ({ metodo: m.metodo, cantidad: m.cantidad, total: num(m.total) })),
      estados: estados.rows,
    });
  } catch (error) {
    console.error('Error en reportes:', error);
    res.status(500).json({ error: 'Error al generar el reporte' });
  }
});

module.exports = router;
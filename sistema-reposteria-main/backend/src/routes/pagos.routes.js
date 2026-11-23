const express = require('express');
const multer = require('multer');
const router = express.Router();
const pool = require('../config/db');
const { obtenerTasa } = require('../services/tasas');

const METODOS = ['efectivo', 'tarjeta', 'transferencia', 'pago_movil', 'otro'];
// Métodos que admiten captura del pago (igual que en el frontend)
const METODOS_CON_CAPTURA = ['transferencia', 'pago_movil'];
// Tasas con las que se puede pagar en bolívares
const TIPOS_TASA = ['usd_bcv', 'eur_bcv', 'usdt'];
const MAX_BYTES = 5 * 1024 * 1024;

// El comprobante se guarda dentro de la base de datos (columna BYTEA), no en disco:
// los servidores en la nube borran el disco en cada reinicio y se perderían las imágenes.
const TIPOS_MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
}).single('comprobante');

// Sin esto, un archivo grande o mal formado se perdería sin mensaje claro
const subirComprobante = (req, res, next) => {
  upload(req, res, (err) => {
    if (!err) return next();
    const mensaje =
      err.code === 'LIMIT_FILE_SIZE' ? 'La imagen supera los 5 MB' : 'No se pudo leer el archivo adjunto';
    res.status(400).json({ error: mensaje });
  });
};

// No se confía en el tipo que declara el navegador: se mira el contenido real del archivo
const detectarImagen = (buf) => {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return { ext: 'png' };
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg' };
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return { ext: 'webp' };
  return null;
};

// Columnas nuevas (se crean solas si faltan; así una base vieja también sirve)
pool
  .query(
    `ALTER TABLE pagos
       ADD COLUMN IF NOT EXISTS ref_verificada BOOLEAN,
       ADD COLUMN IF NOT EXISTS comprobante_data BYTEA,
       ADD COLUMN IF NOT EXISTS comprobante_tipo VARCHAR(30)`
  )
  .catch((error) => console.error('No se pudieron agregar columnas de pagos:', error.message));

const aNumeroONull = (v) => (v === null || v === undefined ? null : Number(v));

// Listar todos los pagos con los datos del pedido
router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT pg.id, pg.pedido_id, pg.monto, pg.metodo, pg.referencia, pg.comprobante, pg.ref_verificada, pg.creado_en,
              pg.monto_bs, pg.tasa, pg.tasa_tipo,
              p.cliente, p.total, p.estado
       FROM pagos pg
       JOIN pedidos p ON p.id = pg.pedido_id
       ORDER BY pg.creado_en DESC, pg.id DESC`
    );

    res.json(
      resultado.rows.map((p) => ({
        ...p,
        monto: Number(p.monto),
        total: Number(p.total),
        monto_bs: aNumeroONull(p.monto_bs),
        tasa: aNumeroONull(p.tasa),
      }))
    );
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Error al obtener los pagos' });
  }
});

// Ver la captura de un pago (se pide con el token, no es una URL pública)
router.get('/:id/comprobante', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Pago no válido' });
  }
  try {
    const r = await pool.query('SELECT comprobante, comprobante_data, comprobante_tipo FROM pagos WHERE id = $1', [id]);
    const fila = r.rows[0];
    if (!fila || !fila.comprobante) {
      return res.status(404).json({ error: 'Este pago no tiene comprobante' });
    }
    if (!fila.comprobante_data) {
      return res.status(404).json({ error: 'No se encontró el archivo del comprobante' });
    }
    res.set('Content-Type', fila.comprobante_tipo || 'application/octet-stream');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'private, no-store');
    res.send(fila.comprobante_data);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Error al obtener el comprobante' });
  }
});

// Registrar un pago o abono a un pedido (JSON o multipart con captura).
// Si viene "monto_bs", el servidor calcula los $ con su propia tasa (la del navegador no se usa).
router.post('/', subirComprobante, async (req, res) => {
  const { pedido_id, monto, metodo, referencia, monto_bs, tasa_tipo, ref_verificada } = req.body || {};
  // Llega como texto cuando el pago va con captura (multipart): si los 4 dígitos coincidieron con la imagen
  const verificada = ref_verificada === true || ref_verificada === 'true' ? true : ref_verificada === false || ref_verificada === 'false' ? false : null;
  const pedidoId = Number(pedido_id);
  const metodoFinal = metodo || 'efectivo';
  const ref = referencia ? String(referencia).trim() : '';

  if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
    return res.status(400).json({ error: 'Selecciona un pedido válido' });
  }

  // Monto en $: directo, o calculado a partir de los bolívares pagados
  const pagaEnBs = monto_bs !== undefined && monto_bs !== null && monto_bs !== '';
  let valor = Number(monto);
  let montoBs = null;
  let tasaUsada = null;
  let tipoTasa = null;

  if (pagaEnBs) {
    montoBs = Math.round(Number(monto_bs) * 100) / 100;
    if (!(montoBs > 0)) {
      return res.status(400).json({ error: 'El monto en bolívares debe ser mayor a 0' });
    }
    tipoTasa = tasa_tipo || 'usd_bcv';
    // Una tasa desconocida se rechaza: nunca se cambia en silencio por otra
    if (!TIPOS_TASA.includes(tipoTasa)) {
      return res.status(400).json({ error: 'La tasa elegida no es válida' });
    }
    try {
      tasaUsada = (await obtenerTasa(tipoTasa)).valor;
    } catch (e) {
      return res.status(e.status || 503).json({ error: e.message });
    }
    valor = Math.round((montoBs / tasaUsada) * 100) / 100;
  }

  if (!(valor > 0)) {
    return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
  }
  if (!METODOS.includes(metodoFinal)) {
    return res.status(400).json({ error: 'El método de pago no es válido' });
  }
  if (metodoFinal === 'pago_movil' && !/^\d{4}$/.test(ref)) {
    return res.status(400).json({ error: 'Ingresa los últimos 4 dígitos de la referencia' });
  }

  let imagen = null;
  if (req.file) {
    if (!METODOS_CON_CAPTURA.includes(metodoFinal)) {
      return res.status(400).json({ error: 'Este método de pago no admite captura' });
    }
    imagen = detectarImagen(req.file.buffer);
    if (!imagen) {
      return res.status(400).json({ error: 'El comprobante debe ser una imagen PNG, JPG o WebP' });
    }
  }

  const client = await pool.connect();
  let nombreArchivo = null;
  try {
    await client.query('BEGIN');

    const pedido = await client.query('SELECT * FROM pedidos WHERE id = $1 FOR UPDATE', [pedidoId]);
    if (pedido.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    if (pedido.rows[0].estado === 'cancelado') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No se pueden registrar pagos de un pedido cancelado' });
    }

    const pagadoAnterior = await client.query(
      'SELECT COALESCE(SUM(monto), 0) AS pagado FROM pagos WHERE pedido_id = $1',
      [pedidoId]
    );
    const saldo = Number(pedido.rows[0].total) - Number(pagadoAnterior.rows[0].pagado);

    // Al pagar en Bs el redondeo puede dejar 1-2 centavos de más sobre el saldo exacto
    if (pagaEnBs && valor > saldo + 0.0001 && valor - saldo <= 0.02) {
      valor = Math.round(saldo * 100) / 100;
    }

    if (valor > saldo + 0.0001) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `El monto supera el saldo pendiente ($${saldo.toFixed(2)})`,
      });
    }

    // En "comprobante" queda solo un nombre (el frontend lo usa para saber que hay captura);
    // los bytes van en comprobante_data.
    if (imagen) nombreArchivo = `comprobante-${Date.now()}.${imagen.ext}`;

    const pago = await client.query(
      `INSERT INTO pagos (pedido_id, monto, metodo, referencia, comprobante, monto_bs, tasa, tasa_tipo, ref_verificada,
                          comprobante_data, comprobante_tipo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, pedido_id, monto, metodo, referencia, comprobante, monto_bs, tasa, tasa_tipo, ref_verificada, creado_en`,
      [
        pedidoId,
        Math.round(valor * 100) / 100,
        metodoFinal,
        ref || null,
        nombreArchivo,
        montoBs,
        tasaUsada,
        tipoTasa,
        nombreArchivo ? verificada : null,
        imagen ? req.file.buffer : null,
        imagen ? TIPOS_MIME[imagen.ext] : null,
      ]
    );

    await client.query('COMMIT');
    res.status(201).json({ mensaje: 'Pago registrado con éxito', pago: pago.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(error.message);
    res.status(500).json({ error: 'Error al registrar el pago' });
  } finally {
    client.release();
  }
});

// Eliminar un pago (por ejemplo, si se registró por error) y su captura
router.delete('/:id', async (req, res) => {
  try {
    const eliminado = await pool.query('DELETE FROM pagos WHERE id = $1 RETURNING id', [req.params.id]);
    if (eliminado.rows.length === 0) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }
    res.json({ mensaje: 'Pago eliminado con éxito' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Error al eliminar el pago' });
  }
});

module.exports = router;
// Servicio de tasas de cambio (dólar BCV, euro BCV y USDT).
// Fuente: la misma API que usa la página alcambio.app (GraphQL en api.alcambio.app).
//   - Dólar y euro BCV: operación getCountryConversions
//   - USDT: operación getBinanceP2PAverages (promedio de compra y venta de Binance P2P)
// Requiere Node 18+ (usa fetch nativo).
//
// - Consulta cada TASAS_INTERVALO_MIN minutos (por defecto 5).
// - Guarda la última tasa buena en la tabla "tasas".
// - Si la fuente falla, se queda con la última tasa guardada y avisa del problema.
const pool = require('../config/db');

const API_URL = process.env.ALCAMBIO_API_URL || 'https://api.alcambio.app/graphql';
const PAIS = process.env.ALCAMBIO_PAIS || 'VE';
const INTERVALO_MS = Math.max(1, Number(process.env.TASAS_INTERVALO_MIN) || 5) * 60 * 1000;
// Pasado este tiempo sin confirmar una tasa, se considera desactualizada y no se usa para cobrar
const MAX_EDAD_MS = (Number(process.env.TASAS_MAX_EDAD_MIN) || 240) * 60 * 1000;
const FALLOS_PARA_ALERTA = 3;
const TIMEOUT_MS = 15000;
const SALTO_MAXIMO = 0.5; // un cambio de más de 50% de una vez se considera un dato dañado

const TIPOS = ['usd_bcv', 'eur_bcv', 'usdt'];

const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;
const OFFSET_CARACAS_MS = -4 * HORA_MS; // Venezuela: UTC-4, sin cambio de horario

const QUERY_BCV = `query getCountryConversions($countryCode: String!, $dateSearch: DateSearchInput) {
  getCountryConversions(payload: {countryCode: $countryCode}, dateSearch: $dateSearch) {
    _id
    baseCurrency { code }
    conversionRates {
      baseValue
      official
      principal
      rateCurrency { code }
      rateValue
      type
      usesRateValue
    }
    dateBcvFees
    dateBcv
    createdAt
  }
}`;

const QUERY_USDT = `query getBinanceP2PAverages {
  getBinanceP2PAverages {
    sellAverage
    buyAverage
    asset
    effectiveFrom
    updatedAt
  }
}`;

const estado = { fallosSeguidos: 0, ultimoError: null, ultimoIntento: null, ultimoExito: null };
let enCurso = null;
let temporizador = null;

// Medianoche de hoy en Caracas, en milisegundos (así lo pide la página)
const inicioDelDia = () => Math.floor((Date.now() + OFFSET_CARACAS_MS) / DIA_MS) * DIA_MS - OFFSET_CARACAS_MS;

// Una consulta GraphQL a api.alcambio.app. Devuelve "data" o lanza un error con el motivo.
const pedirGraphql = async (operationName, query, variables) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ operationName, query, variables }),
      signal: ctrl.signal,
    });
    const texto = await r.text();
    if (!r.ok) throw new Error(`api.alcambio.app respondió HTTP ${r.status}: ${texto.slice(0, 200)}`);
    let json;
    try {
      json = JSON.parse(texto);
    } catch {
      throw new Error(`api.alcambio.app no devolvió JSON: ${texto.slice(0, 120)}`);
    }
    if (json.errors && json.errors.length) {
      throw new Error(`api.alcambio.app: ${json.errors.map((e) => e.message).join('; ').slice(0, 300)}`);
    }
    return json.data || null;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('api.alcambio.app tardó demasiado en responder');
    throw e;
  } finally {
    clearTimeout(t);
  }
};

/* ---------- Dólar y euro BCV ---------- */
const pedirConversiones = async (startDate, endDate) => {
  const data = await pedirGraphql('getCountryConversions', QUERY_BCV, {
    countryCode: PAIS,
    dateSearch: { startDate, endDate, filterByField: 'dateBcvFees' },
  });
  return (data && data.getCountryConversions) || null;
};

const tieneTasas = (d) => !!(d && Array.isArray(d.conversionRates) && d.conversionRates.length);

// Primero se pide igual que la página (el día de hoy). Si no hay datos, se amplía el rango.
const obtenerConversiones = async () => {
  const hoy = inicioDelDia();
  let datos = await pedirConversiones(hoy, hoy + 8 * HORA_MS);
  if (!tieneTasas(datos)) datos = await pedirConversiones(hoy - 7 * DIA_MS, hoy + 2 * DIA_MS);
  if (!tieneTasas(datos)) throw new Error('api.alcambio.app no devolvió tasas del BCV');
  return datos;
};

// Convierte la respuesta en las tasas BCV que usa el sistema
const extraerTasas = (datos) => {
  const avisos = [];
  const lista = datos.conversionRates
    .filter((r) => !r.usesRateValue)
    .map((r) => ({
      codigo: r.rateCurrency && r.rateCurrency.code,
      oficial: !!r.official,
      valor: Number(r.baseValue),
    }))
    .filter((r) => Number.isFinite(r.valor) && r.valor > 0);

  const usd = lista.find((r) => r.oficial && r.codigo === 'USD');
  const eur = lista.find((r) => r.oficial && r.codigo === 'EUR');
  const fecha = datos.dateBcv ? new Date(Number(datos.dateBcv)).toISOString().slice(0, 10) : null;

  const tasas = [];
  if (usd) tasas.push({ clave: 'usd_bcv', valor: usd.valor, fuente: 'Al Cambio (BCV)', fecha });
  else avisos.push('La respuesta no trae el dólar BCV');
  if (eur) tasas.push({ clave: 'eur_bcv', valor: eur.valor, fuente: 'Al Cambio (BCV)', fecha });
  else avisos.push('La respuesta no trae el euro BCV');
  return { tasas, avisos };
};

/* ---------- USDT (Binance P2P) ---------- */
const obtenerUsdt = async () => {
  const data = await pedirGraphql('getBinanceP2PAverages', QUERY_USDT, {});
  return (data && data.getBinanceP2PAverages) || null;
};

// Igual que la página: el USDT es el promedio entre el precio de compra y el de venta
const extraerUsdt = (p2p, usdBcv) => {
  if (!p2p) throw new Error('USDT: la fuente no devolvió el promedio de Binance P2P');
  const venta = Number(p2p.sellAverage);
  const compra = Number(p2p.buyAverage);
  if (!(venta > 0) || !(compra > 0)) throw new Error('USDT: la fuente devolvió promedios no válidos');
  const valor = Math.round(((venta + compra) / 2) * 100) / 100;
  if (Math.abs(compra - venta) / valor > 0.1) {
    throw new Error(`USDT: compra (${compra}) y venta (${venta}) muy distintas, no se guardó`);
  }
  if (usdBcv && (valor < usdBcv * 0.5 || valor > usdBcv * 2)) {
    // Un USDT muy lejos del dólar oficial es un dato dañado de la fuente: no se guarda
    throw new Error(`USDT con valor dudoso (${valor} frente a BCV ${usdBcv}), no se guardó`);
  }
  const fecha = p2p.effectiveFrom
    ? new Date(Number(p2p.effectiveFrom) + OFFSET_CARACAS_MS).toISOString().slice(0, 10)
    : null;
  return { clave: 'usdt', valor, fuente: 'Al Cambio (Binance P2P)', fecha };
};

/* ---------- Guardado ---------- */
const ultimoValor = async (clave) => {
  const r = await pool.query('SELECT valor FROM tasas WHERE clave = $1', [clave]);
  return Number(r.rows[0] && r.rows[0].valor) || null;
};

const guardar = async (clave, precio, fuente, fechaFuente) => {
  const anterior = await ultimoValor(clave);
  if (anterior > 0 && Math.abs(precio / anterior - 1) > SALTO_MAXIMO) {
    throw new Error(`${clave}: cambio sospechoso (${anterior} → ${precio}), no se guardó`);
  }
  await pool.query(
    `INSERT INTO tasas (clave, valor, fuente, fecha_fuente, actualizado_en)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (clave) DO UPDATE
       SET valor = EXCLUDED.valor, fuente = EXCLUDED.fuente,
           fecha_fuente = EXCLUDED.fecha_fuente, actualizado_en = NOW()`,
    [clave, precio, fuente, fechaFuente ? String(fechaFuente).slice(0, 80) : null]
  );
};

const ejecutarActualizacion = async () => {
  estado.ultimoIntento = new Date();
  const avisos = [];
  const porGuardar = [];
  let guardadas = 0;

  // Las dos consultas son independientes: si una falla, la otra se guarda igual
  const [bcv, p2p] = await Promise.allSettled([obtenerConversiones(), obtenerUsdt()]);

  let usdBcv = null;
  if (bcv.status === 'fulfilled') {
    const { tasas, avisos: extra } = extraerTasas(bcv.value);
    avisos.push(...extra);
    porGuardar.push(...tasas);
    const u = tasas.find((t) => t.clave === 'usd_bcv');
    usdBcv = u ? u.valor : null;
  } else {
    avisos.push(bcv.reason.message);
  }

  if (p2p.status === 'fulfilled') {
    try {
      if (!usdBcv) usdBcv = await ultimoValor('usd_bcv');
      porGuardar.push(extraerUsdt(p2p.value, usdBcv));
    } catch (e) {
      avisos.push(e.message);
    }
  } else {
    avisos.push(`USDT: ${p2p.reason.message}`);
  }

  for (const t of porGuardar) {
    try {
      await guardar(t.clave, t.valor, t.fuente, t.fecha);
      guardadas++;
    } catch (e) {
      avisos.push(e.message);
    }
  }

  if (guardadas > 0) {
    if (estado.fallosSeguidos >= FALLOS_PARA_ALERTA) console.log('[tasas] La fuente volvió a responder');
    estado.fallosSeguidos = 0;
    estado.ultimoExito = new Date();
    estado.ultimoError = avisos.length ? avisos.join(' | ') : null;
    if (avisos.length) console.warn('[tasas] Parcial:', estado.ultimoError);
  } else {
    estado.fallosSeguidos += 1;
    estado.ultimoError = avisos.join(' | ') || 'Sin datos';
    console.error(`[tasas] Fallo ${estado.fallosSeguidos}: ${estado.ultimoError}`);
    if (estado.fallosSeguidos === FALLOS_PARA_ALERTA) {
      console.error('[tasas] ALERTA: las tasas no se están actualizando. Se usa la última tasa guardada.');
    }
  }
  return estado;
};

// Nunca lanza error: si ya hay una consulta en curso, reutiliza esa
const actualizar = () => {
  if (!enCurso) {
    enCurso = ejecutarActualizacion()
      .catch((e) => {
        estado.fallosSeguidos += 1;
        estado.ultimoError = e.message;
        console.error('[tasas] Error inesperado:', e.message);
      })
      .finally(() => {
        enCurso = null;
      });
  }
  return enCurso;
};

const leerTasas = async () => {
  const r = await pool.query('SELECT clave, valor, fuente, fecha_fuente, actualizado_en FROM tasas');
  const ahora = Date.now();
  const tasas = {};
  for (const f of r.rows) {
    tasas[f.clave] = {
      valor: Number(f.valor),
      fuente: f.fuente,
      fecha_fuente: f.fecha_fuente,
      actualizado_en: f.actualizado_en,
      desactualizada: ahora - new Date(f.actualizado_en).getTime() > MAX_EDAD_MS,
    };
  }
  return tasas;
};

const estadoPublico = (tasas) => ({
  caida: estado.fallosSeguidos >= FALLOS_PARA_ALERTA,
  desactualizada: TIPOS.some((t) => !tasas[t] || tasas[t].desactualizada),
  ultimo_error: estado.ultimoError,
  ultimo_exito: estado.ultimoExito,
  ultimo_intento: estado.ultimoIntento,
});

// Tasa que se usa para cobrar: siempre del servidor, nunca la que mande el navegador
const obtenerTasa = async (clave) => {
  const r = await pool.query('SELECT valor, actualizado_en FROM tasas WHERE clave = $1', [clave]);
  if (r.rows.length === 0) {
    const e = new Error('Todavía no hay una tasa disponible para este tipo. Usa otra o registra el pago en $.');
    e.status = 503;
    throw e;
  }
  const edad = Date.now() - new Date(r.rows[0].actualizado_en).getTime();
  if (edad > MAX_EDAD_MS) {
    const e = new Error('La tasa está desactualizada porque la fuente no responde. Registra el pago en $ o intenta más tarde.');
    e.status = 503;
    throw e;
  }
  return { valor: Number(r.rows[0].valor) };
};

const iniciar = () => {
  if (temporizador) return;
  actualizar();
  temporizador = setInterval(actualizar, INTERVALO_MS);
  if (temporizador.unref) temporizador.unref();
};

module.exports = { TIPOS, iniciar, actualizar, leerTasas, estadoPublico, obtenerTasa };
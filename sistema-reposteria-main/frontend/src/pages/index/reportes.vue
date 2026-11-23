<template>
  <q-page class="ui-page">
    <div class="ui-wrap">
      <!-- Encabezado -->
      <header class="ui-head ui-rise">
        <div>
          <p class="ui-eyebrow">Análisis</p>
          <h1 class="ui-title">Reportes</h1>
          <p class="ui-sub">Ventas, ganancias y productos más vendidos del período que elijas.</p>
        </div>
        <button type="button" class="ui-ghost" :disabled="!datos" @click="exportarCsv">
          <q-icon name="download" size="18px" /> Exportar CSV
        </button>
      </header>

      <!-- Período -->
      <section class="ui-tools ui-rise" style="--d: 60ms">
        <div class="ui-seg" role="group" aria-label="Período">
          <button
            v-for="p in presets"
            :key="p.value"
            type="button"
            class="ui-pill"
            :class="{ on: preset === p.value }"
            @click="elegirPreset(p.value)"
          >
            {{ p.label }}
          </button>
        </div>
        <transition name="rp-fade">
          <div v-if="preset === 'custom'" class="rp-dates">
            <label>
              <span>Desde</span>
              <input v-model="desde" type="date" :max="hasta" class="rp-date" @change="cargar" />
            </label>
            <label>
              <span>Hasta</span>
              <input v-model="hasta" type="date" :min="desde" :max="hoy" class="rp-date" @change="cargar" />
            </label>
          </div>
        </transition>
        <span class="rp-range">{{ rangoTexto }}</span>
      </section>

      <!-- Resumen -->
      <section class="ui-stats ui-rise" style="--d: 110ms" aria-label="Resumen">
        <div class="ui-stat">
          <span class="ui-stat-ico ui-t-accent"><q-icon name="point_of_sale" size="22px" /></span>
          <div class="ui-stat-body">
            <span class="ui-stat-k">Ventas</span>
            <span class="ui-stat-v">{{ moneda(shown.ventas) }}</span>
            <span class="ui-stat-h">sin contar pedidos cancelados</span>
          </div>
        </div>
        <div class="ui-stat">
          <span class="ui-stat-ico ui-t-good"><q-icon name="trending_up" size="22px" /></span>
          <div class="ui-stat-body">
            <span class="ui-stat-k">Ganancia</span>
            <span class="ui-stat-v">{{ moneda(shown.ganancia) }}</span>
            <span class="ui-stat-h">margen {{ (datos?.resumen.margen ?? 0).toFixed(1) }}%</span>
          </div>
        </div>
        <div class="ui-stat">
          <span class="ui-stat-ico ui-t-amber"><q-icon name="receipt_long" size="22px" /></span>
          <div class="ui-stat-body">
            <span class="ui-stat-k">Pedidos</span>
            <span class="ui-stat-v">{{ Math.round(shown.pedidos) }}</span>
            <span class="ui-stat-h">ticket promedio {{ moneda(datos?.resumen.ticket ?? 0) }}</span>
          </div>
        </div>
        <div class="ui-stat" :class="{ alert: (datos?.resumen.por_cobrar ?? 0) > 0 }">
          <span class="ui-stat-ico" :class="(datos?.resumen.por_cobrar ?? 0) > 0 ? 'ui-t-warn' : 'ui-t-good'">
            <q-icon name="account_balance_wallet" size="22px" />
          </span>
          <div class="ui-stat-body">
            <span class="ui-stat-k">Por cobrar</span>
            <span class="ui-stat-v">{{ moneda(shown.por_cobrar) }}</span>
            <span class="ui-stat-h">cobrado en el período: {{ moneda(datos?.resumen.cobrado ?? 0) }}</span>
          </div>
        </div>
      </section>

      <div v-if="loading && !datos" class="ui-skel"></div>
      <div v-else-if="errorMsg" class="ui-empty">
        <div class="ui-empty-ico"><q-icon name="cloud_off" size="40px" /></div>
        <h2>No se pudo cargar el reporte</h2>
        <p>{{ errorMsg }}</p>
        <button type="button" class="ui-cta" @click="cargar"><span>Reintentar</span></button>
      </div>

      <template v-else-if="datos">
        <!-- Evolución -->
        <section class="rp-card ui-rise" style="--d: 150ms" :class="{ busy: loading }">
          <div class="rp-card-head">
            <div>
              <h2>Ventas y ganancia</h2>
              <p>{{ agrupacionTexto }}</p>
            </div>
            <div class="ui-seg" role="group" aria-label="Serie a mostrar">
              <button
                v-for="s in series"
                :key="s.value"
                type="button"
                class="ui-pill"
                :class="{ on: serie === s.value }"
                @click="serie = s.value"
              >
                {{ s.label }}
              </button>
            </div>
          </div>

          <div ref="chartRef" class="rp-chart" :style="{ height: alto + 'px' }">
            <svg
              v-if="ancho > 0"
              :width="ancho"
              :height="alto"
              role="img"
              :aria-label="`Gráfico de ${agrupacionTexto.toLowerCase()}. Total vendido ${moneda(datos.resumen.ventas)}.`"
              @pointermove="alMover"
              @pointerdown="alMover"
              @pointerleave="hover = null"
            >
              <defs>
                <linearGradient id="rpAreaV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#c26a1c" stop-opacity="0.34" />
                  <stop offset="100%" stop-color="#c26a1c" stop-opacity="0.02" />
                </linearGradient>
                <linearGradient id="rpAreaG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#2a8453" stop-opacity="0.26" />
                  <stop offset="100%" stop-color="#2a8453" stop-opacity="0.02" />
                </linearGradient>
              </defs>

              <g class="rp-grid-lines">
                <g v-for="t in ticksY" :key="t.v">
                  <line :x1="padL" :x2="ancho - padR" :y1="t.y" :y2="t.y" />
                  <text :x="padL - 8" :y="t.y + 4" text-anchor="end">{{ corto(t.v) }}</text>
                </g>
              </g>
              <g class="rp-x-labels">
                <text v-for="l in ticksX" :key="l.i" :x="l.x" :y="alto - 8" text-anchor="middle">{{ l.txt }}</text>
              </g>

              <g class="rp-series">
                <path v-if="verVentas" :d="areaV" fill="url(#rpAreaV)" class="rp-area" />
                <path v-if="verGanancia && !verVentas" :d="areaG" fill="url(#rpAreaG)" class="rp-area" />
                <path v-if="verVentas" :d="lineaV" class="rp-line v" />
                <path v-if="verGanancia" :d="lineaG" class="rp-line g" />
              </g>

              <g v-if="hover !== null" class="rp-hover">
                <line :x1="xDe(hover)" :x2="xDe(hover)" :y1="padT" :y2="alto - padB" />
                <circle v-if="verVentas" :cx="xDe(hover)" :cy="yDe(puntoHover.ventas)" r="5" class="v" />
                <circle v-if="verGanancia" :cx="xDe(hover)" :cy="yDe(puntoHover.ganancia)" r="5" class="g" />
              </g>
            </svg>

            <div v-if="hover !== null" class="rp-tip" :class="{ izq: xDe(hover) > ancho * 0.6 }" :style="{ left: xDe(hover) + 'px' }">
              <b>{{ fechaLarga(puntoHover.fecha) }}</b>
              <span v-if="verVentas"><i class="v"></i>Ventas <em>{{ moneda(puntoHover.ventas) }}</em></span>
              <span v-if="verGanancia"><i class="g"></i>Ganancia <em>{{ moneda(puntoHover.ganancia) }}</em></span>
              <small>{{ puntoHover.pedidos }} {{ puntoHover.pedidos === 1 ? 'pedido' : 'pedidos' }}</small>
            </div>

            <div v-if="sinVentas" class="rp-chart-empty">
              <q-icon name="bar_chart" size="30px" />
              <span>No hay ventas en este período</span>
            </div>
          </div>
        </section>

        <div class="rp-cols">
          <!-- Más vendidos -->
          <section class="rp-card ui-rise" style="--d: 200ms">
            <div class="rp-card-head">
              <div>
                <h2>Más vendidos</h2>
                <p>Productos del período</p>
              </div>
              <div class="ui-seg" role="group" aria-label="Ordenar por">
                <button
                  v-for="m in metricas"
                  :key="m.value"
                  type="button"
                  class="ui-pill"
                  :class="{ on: metrica === m.value }"
                  @click="metrica = m.value"
                >
                  {{ m.label }}
                </button>
              </div>
            </div>

            <transition-group v-if="ranking.length" name="rp-rank" tag="ol" class="rp-rank">
              <li v-for="(t, i) in ranking" :key="t.id">
                <span class="rp-pos" :class="'p' + (i + 1)">{{ i + 1 }}</span>
                <div class="rp-rank-body">
                  <div class="rp-rank-top">
                    <b>{{ t.nombre }}</b>
                    <span>{{ valorMetrica(t) }}</span>
                  </div>
                  <span class="rp-bar"><i :style="{ width: pctMetrica(t) + '%' }"></i></span>
                  <small>{{ cant(t.unidades) }} uds · {{ moneda(t.ingresos) }} · ganancia {{ moneda(t.ganancia) }}</small>
                </div>
              </li>
            </transition-group>
            <p v-else class="rp-vacio">Aún no hay productos vendidos en este período.</p>
          </section>

          <div class="rp-side">
            <!-- Métodos de pago -->
            <section class="rp-card ui-rise" style="--d: 240ms">
              <div class="rp-card-head">
                <div>
                  <h2>Cobros por método</h2>
                  <p>Pagos recibidos en el período</p>
                </div>
              </div>
              <div v-if="totalMetodos > 0" class="rp-donut-wrap">
                <div class="rp-donut" :style="{ background: donut }" role="img" :aria-label="`Total cobrado ${moneda(totalMetodos)}`">
                  <div>
                    <span>Total</span>
                    <b>{{ moneda(totalMetodos) }}</b>
                  </div>
                </div>
                <ul class="rp-legend">
                  <li v-for="m in metodosFmt" :key="m.metodo">
                    <i :style="{ background: m.color }"></i>
                    <span>{{ m.label }}</span>
                    <b>{{ moneda(m.total) }}</b>
                    <small>{{ m.pct.toFixed(0) }}%</small>
                  </li>
                </ul>
              </div>
              <p v-else class="rp-vacio">No hay pagos registrados en este período.</p>
            </section>

            <!-- Estados -->
            <section class="rp-card ui-rise" style="--d: 280ms">
              <div class="rp-card-head">
                <div>
                  <h2>Pedidos por estado</h2>
                  <p>{{ totalEstados }} en total, incluye cancelados</p>
                </div>
              </div>
              <template v-if="totalEstados > 0">
                <div class="rp-stack" role="img" :aria-label="`${totalEstados} pedidos por estado`">
                  <i
                    v-for="e in estadosFmt"
                    :key="e.estado"
                    :style="{ width: (e.cantidad / totalEstados) * 100 + '%', background: `hsl(${e.hue} 60% 46%)` }"
                    :title="`${e.label}: ${e.cantidad}`"
                  ></i>
                </div>
                <ul class="rp-chips">
                  <li v-for="e in estadosFmt" :key="e.estado">
                    <span class="ui-chip sm" :style="{ '--h': String(e.hue) }">{{ e.label }} · {{ e.cantidad }}</span>
                  </li>
                </ul>
              </template>
              <p v-else class="rp-vacio">No hay pedidos en este período.</p>
            </section>
          </div>
        </div>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '../../boot/axios';
import type { AxiosError } from 'axios';
import '../../css/ui.css';

interface PuntoSerie {
  fecha: string;
  ventas: number;
  ganancia: number;
  pedidos: number;
}
interface Top {
  id: number;
  nombre: string;
  unidades: number;
  ingresos: number;
  ganancia: number;
}
interface Reporte {
  desde: string;
  hasta: string;
  agrupar: 'day' | 'week' | 'month';
  resumen: {
    pedidos: number;
    ventas: number;
    costo: number;
    ganancia: number;
    margen: number;
    ticket: number;
    cobrado: number;
    por_cobrar: number;
  };
  serie: PuntoSerie[];
  top: Top[];
  metodos: { metodo: string; cantidad: number; total: number }[];
  estados: { estado: string; cantidad: number }[];
}

const $q = useQuasar();
const reducido = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Fechas ---------- */
const iso = (d: Date): string => {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};
const aFecha = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};
const hoy = iso(new Date());
const restar = (dias: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return iso(d);
};

const presets = [
  { value: '7', label: '7 días' },
  { value: '30', label: '30 días' },
  { value: 'mes', label: 'Este mes' },
  { value: 'anio', label: 'Este año' },
  { value: 'custom', label: 'Personalizado' },
];
const preset = ref('30');
const desde = ref(restar(29));
const hasta = ref(hoy);

const elegirPreset = (v: string): void => {
  preset.value = v;
  if (v === 'custom') return;
  const h = new Date();
  hasta.value = iso(h);
  if (v === '7') desde.value = restar(6);
  else if (v === '30') desde.value = restar(29);
  else if (v === 'mes') desde.value = iso(new Date(h.getFullYear(), h.getMonth(), 1));
  else desde.value = iso(new Date(h.getFullYear(), 0, 1));
  void cargar();
};

const fmtCorta = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });
const fmtLarga = new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fmtMes = new Intl.DateTimeFormat('es', { month: 'short', year: '2-digit' });
const rangoTexto = computed(() => {
  if (!desde.value || !hasta.value) return '';
  const a = aFecha(desde.value);
  const b = aFecha(hasta.value);
  return `${fmtCorta.format(a)} – ${fmtCorta.format(b)} ${b.getFullYear()}`;
});

/* ---------- Datos ---------- */
const datos = ref<Reporte | null>(null);
const loading = ref(false);
const errorMsg = ref('');
let peticion = 0;

const cargar = async (): Promise<void> => {
  if (!desde.value || !hasta.value || desde.value > hasta.value) return;
  const mia = ++peticion;
  loading.value = true;
  errorMsg.value = '';
  try {
    const { data } = await api.get<Reporte>('/reportes', { params: { desde: desde.value, hasta: hasta.value } });
    if (mia !== peticion) return; // llegó una respuesta más nueva
    datos.value = data;
    hover.value = null;
    animar();
  } catch (error) {
    if (mia !== peticion) return;
    const err = error as AxiosError<{ error?: string; mensaje?: string }>;
    const st = err.response?.status;
    console.error('[reportes]', err.response ?? err);
    errorMsg.value =
      err.response?.data?.error ??
      err.response?.data?.mensaje ??
      (st === 404
        ? 'El servidor no tiene la ruta GET /reportes. ¿Falta crearla o reiniciar el backend?'
        : st === 401 || st === 403
          ? 'Sesión vencida o sin permiso: vuelve a iniciar sesión.'
          : st
            ? `El servidor respondió con el error ${st}.`
            : 'No hay conexión con el servidor.');
    if (datos.value) $q.notify({ type: 'negative', message: errorMsg.value });
  } finally {
    if (mia === peticion) loading.value = false;
  }
};

/* ---------- Formato ---------- */
const nf = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneda = (n: number): string => `${n < 0 ? '-' : ''}$${nf.format(Math.abs(n))}`;
const cant = (n: number): string => String(Math.round(n * 100) / 100);
const corto = (n: number): string => {
  if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `$${Math.round(n)}`;
};
const fechaLarga = (f: string): string => {
  const d = aFecha(f);
  const base = fmtLarga.format(d);
  const a = datos.value?.agrupar;
  if (a === 'week') return `Semana del ${fmtCorta.format(d)}`;
  if (a === 'month') return fmtMes.format(d);
  return base;
};
const agrupacionTexto = computed(() => {
  const a = datos.value?.agrupar;
  return a === 'month' ? 'Total por mes' : a === 'week' ? 'Total por semana' : 'Total por día';
});

/* ---------- Tarjetas de resumen con conteo animado ---------- */
const shown = reactive({ ventas: 0, ganancia: 0, pedidos: 0, por_cobrar: 0 });
let raf = 0;
const animar = (): void => {
  const r = datos.value?.resumen;
  if (!r) return;
  const meta = { ventas: r.ventas, ganancia: r.ganancia, pedidos: r.pedidos, por_cobrar: r.por_cobrar };
  cancelAnimationFrame(raf);
  if (reducido) {
    Object.assign(shown, meta);
    return;
  }
  const ini = { ...shown };
  const t0 = performance.now();
  const paso = (t: number): void => {
    const k = Math.min(1, (t - t0) / 700);
    const e = 1 - Math.pow(1 - k, 3);
    shown.ventas = ini.ventas + (meta.ventas - ini.ventas) * e;
    shown.ganancia = ini.ganancia + (meta.ganancia - ini.ganancia) * e;
    shown.pedidos = ini.pedidos + (meta.pedidos - ini.pedidos) * e;
    shown.por_cobrar = ini.por_cobrar + (meta.por_cobrar - ini.por_cobrar) * e;
    if (k < 1) raf = requestAnimationFrame(paso);
  };
  raf = requestAnimationFrame(paso);
};

/* ---------- Gráfico ---------- */
const series = [
  { value: 'ambos', label: 'Ambos' },
  { value: 'ventas', label: 'Ventas' },
  { value: 'ganancia', label: 'Ganancia' },
];
const serie = ref('ambos');
const verVentas = computed(() => serie.value !== 'ganancia');
const verGanancia = computed(() => serie.value !== 'ventas');

const chartRef = ref<HTMLElement | null>(null);
const ancho = ref(0);
const alto = computed(() => (ancho.value < 520 ? 230 : 300));
const padL = 46;
const padR = 14;
const padT = 14;
const padB = 30;
let ro: ResizeObserver | null = null;

const puntos = computed<PuntoSerie[]>(() => datos.value?.serie ?? []);
const sinVentas = computed(() => puntos.value.every((p) => p.ventas === 0));

const maxY = computed(() => {
  let m = 0;
  for (const p of puntos.value) {
    if (verVentas.value) m = Math.max(m, p.ventas);
    if (verGanancia.value) m = Math.max(m, p.ganancia);
  }
  if (m <= 0) return 10;
  const pot = Math.pow(10, Math.floor(Math.log10(m)));
  const f = m / pot;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * pot;
});
const minY = computed(() => {
  let m = 0;
  for (const p of puntos.value) if (verGanancia.value) m = Math.min(m, p.ganancia);
  return m < 0 ? -Math.ceil(Math.abs(m) / (maxY.value / 4)) * (maxY.value / 4) : 0;
});

const xDe = (i: number): number => {
  const n = puntos.value.length;
  const w = ancho.value - padL - padR;
  return n <= 1 ? padL + w / 2 : padL + (i / (n - 1)) * w;
};
const yDe = (v: number): number => {
  const h = alto.value - padT - padB;
  const rango = maxY.value - minY.value || 1;
  return padT + (1 - (v - minY.value) / rango) * h;
};

// Curva suave (Catmull-Rom → Bézier) sin pasarse por debajo de la base
const curva = (vals: number[]): string => {
  const pts = vals.map((v, i) => [xDe(i), yDe(v)] as const);
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0]![0]},${pts[0]![1]}`;
  let d = `M${pts[0]![0].toFixed(1)},${pts[0]![1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const t = 0.18;
    const c1x = p1[0] + (p2[0] - p0[0]) * t;
    const c1y = p1[1] + (p2[1] - p0[1]) * t;
    const c2x = p2[0] - (p3[0] - p1[0]) * t;
    const c2y = p2[1] - (p3[1] - p1[1]) * t;
    const base = yDe(0);
    const lim = (y: number): number => Math.min(y, Math.max(base, Math.max(p1[1], p2[1])));
    d += ` C${c1x.toFixed(1)},${lim(c1y).toFixed(1)} ${c2x.toFixed(1)},${lim(c2y).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
};
const lineaV = computed(() => curva(puntos.value.map((p) => p.ventas)));
const lineaG = computed(() => curva(puntos.value.map((p) => p.ganancia)));
const cierre = (d: string): string => {
  const n = puntos.value.length;
  if (!d || n < 2) return '';
  return `${d} L${xDe(n - 1).toFixed(1)},${yDe(0).toFixed(1)} L${xDe(0).toFixed(1)},${yDe(0).toFixed(1)} Z`;
};
const areaV = computed(() => cierre(lineaV.value));
const areaG = computed(() => cierre(lineaG.value));

const ticksY = computed(() => {
  const out: { v: number; y: number }[] = [];
  const paso = (maxY.value - minY.value) / 4;
  for (let i = 0; i <= 4; i++) {
    const v = minY.value + paso * i;
    out.push({ v, y: yDe(v) });
  }
  return out;
});
const etiquetaX = (f: string): string => {
  const d = aFecha(f);
  return datos.value?.agrupar === 'month' ? fmtMes.format(d) : fmtCorta.format(d);
};
const ticksX = computed(() => {
  const n = puntos.value.length;
  if (n === 0) return [];
  const deseadas = ancho.value < 520 ? 4 : 7;
  const cada = Math.max(1, Math.ceil(n / deseadas));
  const out: { i: number; x: number; txt: string }[] = [];
  for (let i = 0; i < n; i += cada) out.push({ i, x: xDe(i), txt: etiquetaX(puntos.value[i]!.fecha) });
  return out;
});

const hover = ref<number | null>(null);
const puntoHover = computed<PuntoSerie>(
  () => puntos.value[hover.value ?? 0] ?? { fecha: hasta.value, ventas: 0, ganancia: 0, pedidos: 0 },
);
const alMover = (e: PointerEvent): void => {
  const n = puntos.value.length;
  if (n === 0) return;
  const svg = e.currentTarget as SVGElement;
  const x = e.clientX - svg.getBoundingClientRect().left;
  const w = ancho.value - padL - padR;
  const idx = n <= 1 ? 0 : Math.round(((x - padL) / w) * (n - 1));
  hover.value = Math.min(n - 1, Math.max(0, idx));
};

/* ---------- Más vendidos ---------- */
type Metrica = 'unidades' | 'ingresos' | 'ganancia';
const metricas: { value: Metrica; label: string }[] = [
  { value: 'unidades', label: 'Unidades' },
  { value: 'ingresos', label: 'Ingresos' },
  { value: 'ganancia', label: 'Ganancia' },
];
const metrica = ref<Metrica>('unidades');
const ranking = computed<Top[]>(() =>
  [...(datos.value?.top ?? [])].sort((a, b) => b[metrica.value] - a[metrica.value]).slice(0, 8),
);
const maxMetrica = computed(() => Math.max(1, ...ranking.value.map((t) => t[metrica.value])));
const pctMetrica = (t: Top): number => Math.max(3, (Math.max(0, t[metrica.value]) / maxMetrica.value) * 100);
const valorMetrica = (t: Top): string =>
  metrica.value === 'unidades' ? `${cant(t.unidades)} uds` : moneda(t[metrica.value]);

/* ---------- Métodos de pago ---------- */
const METODOS: Record<string, { label: string; color: string }> = {
  efectivo: { label: 'Efectivo', color: '#2a8453' },
  transferencia: { label: 'Transferencia', color: '#c26a1c' },
  pago_movil: { label: 'Pago móvil', color: '#6b3a1c' },
};
const totalMetodos = computed(() => (datos.value?.metodos ?? []).reduce((a, m) => a + m.total, 0));
const metodosFmt = computed(() =>
  (datos.value?.metodos ?? []).map((m) => ({
    ...m,
    label: METODOS[m.metodo]?.label ?? m.metodo,
    color: METODOS[m.metodo]?.color ?? '#999',
    pct: totalMetodos.value > 0 ? (m.total / totalMetodos.value) * 100 : 0,
  })),
);
const donut = computed(() => {
  let acc = 0;
  const partes = metodosFmt.value.map((m) => {
    const a = acc;
    acc += m.pct;
    return `${m.color} ${a}% ${acc}%`;
  });
  return `conic-gradient(${partes.join(', ')})`;
});

/* ---------- Estados ---------- */
const ESTADOS: Record<string, { label: string; hue: number; orden: number }> = {
  pendiente: { label: 'Pendiente', hue: 42, orden: 0 },
  en_proceso: { label: 'En proceso', hue: 270, orden: 1 },
  listo: { label: 'Listo', hue: 335, orden: 2 },
  entregado: { label: 'Entregado', hue: 145, orden: 3 },
  cancelado: { label: 'Cancelado', hue: 5, orden: 4 },
};
const totalEstados = computed(() => (datos.value?.estados ?? []).reduce((a, e) => a + e.cantidad, 0));
const estadosFmt = computed(() =>
  [...(datos.value?.estados ?? [])]
    .map((e) => ({
      ...e,
      label: ESTADOS[e.estado]?.label ?? e.estado,
      hue: ESTADOS[e.estado]?.hue ?? 30,
      orden: ESTADOS[e.estado]?.orden ?? 9,
    }))
    .sort((a, b) => a.orden - b.orden),
);

/* ---------- Exportar a CSV (se abre en Excel) ---------- */
const exportarCsv = (): void => {
  const d = datos.value;
  if (!d) return;
  const celda = (v: string | number): string => `"${String(v).replace(/"/g, '""')}"`;
  const filas: (string | number)[][] = [
    ['Reporte', `${d.desde} a ${d.hasta}`],
    ['Ventas', d.resumen.ventas],
    ['Costo', d.resumen.costo],
    ['Ganancia', d.resumen.ganancia],
    ['Margen %', d.resumen.margen],
    ['Pedidos', d.resumen.pedidos],
    ['Por cobrar', d.resumen.por_cobrar],
    [],
    [d.agrupar === 'month' ? 'Mes' : d.agrupar === 'week' ? 'Semana' : 'Día', 'Ventas', 'Ganancia', 'Pedidos'],
    ...d.serie.map((s) => [s.fecha, s.ventas, s.ganancia, s.pedidos]),
    [],
    ['Producto', 'Unidades', 'Ingresos', 'Ganancia'],
    ...d.top.map((t) => [t.nombre, t.unidades, t.ingresos, t.ganancia]),
  ];
  const csv = '﻿' + filas.map((f) => f.map(celda).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte_${d.desde}_${d.hasta}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

watch([desde, hasta], () => {
  if (preset.value === 'custom' && desde.value && hasta.value && desde.value > hasta.value) {
    $q.notify({ type: 'warning', message: 'La fecha inicial no puede ser mayor que la final' });
  }
});

onMounted(() => {
  void cargar();
  if (typeof ResizeObserver === 'undefined') return;
  ro = new ResizeObserver((entradas) => {
    ancho.value = Math.floor(entradas[0]?.contentRect.width ?? 0);
  });
  // El gráfico aparece cuando llegan los datos: se engancha al montarse
  watch(chartRef, (el) => {
    if (el && ro) {
      ro.disconnect();
      ro.observe(el);
      ancho.value = Math.floor(el.getBoundingClientRect().width);
    }
  });
});
onBeforeUnmount(() => {
  ro?.disconnect();
  cancelAnimationFrame(raf);
});
</script>

<style>
.rp-dates {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.rp-dates label {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 46px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mute);
}
.rp-date {
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink);
  font: 500 14px 'IBM Plex Sans', sans-serif;
}
.rp-range {
  align-self: center;
  margin-left: auto;
  font-size: 13px;
  color: var(--mute);
}
.rp-fade-enter-active,
.rp-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.rp-fade-enter-from,
.rp-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.rp-card {
  margin-bottom: 18px;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--panel);
  box-shadow: 0 10px 26px rgba(92, 48, 14, 0.09);
  transition: opacity 0.2s;
}
.rp-card.busy {
  opacity: 0.6;
}
.rp-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.rp-card-head h2 {
  margin: 0;
  font-size: 18px;
  letter-spacing: -0.01em;
  color: var(--choco);
}
.rp-card-head p {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--mute);
}
.rp-vacio {
  margin: 8px 0;
  padding: 22px 0;
  text-align: center;
  color: var(--mute);
}

/* Gráfico */
.rp-chart {
  position: relative;
  width: 100%;
  touch-action: pan-y;
}
.rp-chart svg {
  display: block;
  overflow: visible;
}
.rp-grid-lines line {
  stroke: rgba(120, 70, 30, 0.15);
  stroke-dasharray: 3 4;
}
.rp-grid-lines text,
.rp-x-labels text {
  fill: rgba(59, 33, 18, 0.6);
  font: 11px 'IBM Plex Sans', sans-serif;
}
.rp-line {
  fill: none;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.rp-line.v {
  stroke: #c26a1c;
}
.rp-line.g {
  stroke: #2a8453;
}
.rp-area,
.rp-line {
  animation: rpIn 0.7s var(--ease) both;
}
@keyframes rpIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.rp-hover line {
  stroke: rgba(59, 33, 18, 0.35);
  stroke-dasharray: 4 4;
}
.rp-hover circle {
  stroke: #fff;
  stroke-width: 2.5;
}
.rp-hover circle.v {
  fill: #c26a1c;
}
.rp-hover circle.g {
  fill: #2a8453;
}
.rp-tip {
  position: absolute;
  top: 6px;
  z-index: 2;
  display: grid;
  gap: 3px;
  min-width: 160px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fffaf1;
  box-shadow: 0 12px 28px rgba(40, 20, 8, 0.25);
  transform: translateX(12px);
  pointer-events: none;
  font-size: 13px;
}
.rp-tip.izq {
  transform: translateX(calc(-100% - 12px));
}
.rp-tip b {
  font-size: 12.5px;
  text-transform: capitalize;
}
.rp-tip span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.rp-tip em {
  margin-left: auto;
  font-style: normal;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.rp-tip i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
.rp-tip i.v {
  background: #c26a1c;
}
.rp-tip i.g {
  background: #2a8453;
}
.rp-tip small {
  color: var(--mute);
}
.rp-chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--mute);
  pointer-events: none;
}

/* Disposición */
.rp-cols {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}
.rp-cols .rp-card {
  margin-bottom: 0;
}
.rp-side {
  display: grid;
  gap: 18px;
}

/* Ranking */
.rp-rank {
  position: relative;
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.rp-rank li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.rp-pos {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: rgba(194, 106, 28, 0.12);
  color: var(--accent-ink);
  font-weight: 700;
  font-size: 14px;
}
.rp-pos.p1 {
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #fff;
}
.rp-rank-body {
  flex: 1;
  min-width: 0;
}
.rp-rank-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.rp-rank-top b {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rp-rank-top span {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.rp-bar {
  display: block;
  height: 8px;
  border-radius: 999px;
  background: rgba(59, 33, 18, 0.1);
  overflow: hidden;
}
.rp-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
  transition: width 0.6s var(--ease);
}
.rp-rank small {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  color: var(--mute);
}
.rp-rank-move,
.rp-rank-enter-active,
.rp-rank-leave-active {
  transition: transform 0.45s var(--ease), opacity 0.3s;
}
.rp-rank-enter-from,
.rp-rank-leave-to {
  opacity: 0;
}
.rp-rank-leave-active {
  position: absolute;
}

/* Dona */
.rp-donut-wrap {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}
.rp-donut {
  display: grid;
  place-items: center;
  flex: none;
  width: 148px;
  height: 148px;
  border-radius: 50%;
}
.rp-donut > div {
  display: grid;
  place-items: center;
  align-content: center;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #fffdf9;
  text-align: center;
}
.rp-donut span {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mute);
}
.rp-donut b {
  font-size: 17px;
  font-variant-numeric: tabular-nums;
}
.rp-legend {
  flex: 1;
  min-width: 170px;
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.rp-legend li {
  display: grid;
  grid-template-columns: 12px 1fr auto 38px;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.rp-legend i {
  width: 12px;
  height: 12px;
  border-radius: 4px;
}
.rp-legend b {
  font-variant-numeric: tabular-nums;
}
.rp-legend small {
  text-align: right;
  color: var(--mute);
}

/* Estados */
.rp-stack {
  display: flex;
  height: 14px;
  margin-bottom: 12px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(59, 33, 18, 0.1);
}
.rp-stack i {
  display: block;
  height: 100%;
  transition: width 0.6s var(--ease);
}
.rp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (max-width: 1023px) {
  .rp-cols {
    grid-template-columns: minmax(0, 1fr);
  }
  .rp-cols .rp-card {
    margin-bottom: 0;
  }
}
@media (max-width: 599px) {
  .rp-card {
    padding: 16px 14px;
    border-radius: 18px;
  }
  .rp-range {
    margin-left: 0;
    width: 100%;
  }
  .rp-dates label {
    flex: 1;
  }
  .rp-card-head .ui-seg {
    width: 100%;
  }
  .rp-card-head .ui-pill {
    flex: 1;
    justify-content: center;
  }
  .rp-donut {
    margin: 0 auto;
  }
}
</style>
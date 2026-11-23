<template>
  <q-page class="ui-page">
    <div class="ui-wrap">
      <!-- Encabezado -->
      <header class="ui-head ui-rise">
        <div>
          <p class="ui-eyebrow">Cobros</p>
          <h1 class="ui-title">Pagos</h1>
          <p class="ui-sub">Registra abonos y controla el saldo pendiente de cada pedido.</p>
        </div>
        <button
          type="button"
          class="ui-cta"
          :aria-disabled="pedidosPorCobrar.length === 0"
          @click="abrirNuevoPago"
        >
          <q-icon name="add" size="20px" />
          <span>Registrar pago</span>
          <q-tooltip v-if="pedidosPorCobrar.length === 0">No hay pedidos con saldo pendiente</q-tooltip>
        </button>
      </header>

      <!-- Tasas del día (se actualizan solas) -->
      <TasasBar
        :tasas="tasas"
        :estado="estadoTasas"
        :problema="tasasConProblema"
        :sin-conexion="tasasSinConexion"
        :cargando="tasasCargando"
        @actualizar="actualizarTasas"
      />

      <!-- Resumen -->
      <section class="ui-stats ui-rise" style="--d: 80ms" aria-label="Resumen">
        <div class="ui-stat">
          <span class="ui-stat-ico ui-t-good"><q-icon name="payments" size="22px" /></span>
          <div class="ui-stat-body">
            <span class="ui-stat-k">Total recaudado</span>
            <span class="ui-stat-v">{{ moneda(shown.recaudado) }}</span>
            <span class="ui-stat-h">en pagos registrados</span>
          </div>
        </div>
        <div class="ui-stat">
          <span class="ui-stat-ico ui-t-accent"><q-icon name="today" size="22px" /></span>
          <div class="ui-stat-body">
            <span class="ui-stat-k">Cobrado hoy</span>
            <span class="ui-stat-v">{{ moneda(shown.hoy) }}</span>
            <span class="ui-stat-h">{{ stats.hoy > 0 ? 'ingresos del día' : 'sin cobros hoy' }}</span>
          </div>
        </div>
        <div class="ui-stat">
          <span class="ui-stat-ico ui-t-pink"><q-icon name="receipt_long" size="22px" /></span>
          <div class="ui-stat-body">
            <span class="ui-stat-k">Pagos</span>
            <span class="ui-stat-v">{{ Math.round(shown.cantidad) }}</span>
            <span class="ui-stat-h">registrados</span>
          </div>
        </div>
        <div class="ui-stat" :class="{ alert: stats.cobrar > 0 }">
          <span class="ui-stat-ico" :class="stats.cobrar > 0 ? 'ui-t-warn' : 'ui-t-good'">
            <q-icon name="account_balance_wallet" size="22px" />
          </span>
          <div class="ui-stat-body">
            <span class="ui-stat-k">Saldo por cobrar</span>
            <span class="ui-stat-v">{{ moneda(shown.cobrar) }}</span>
            <span class="ui-stat-h">{{ stats.cobrar > 0 ? 'pendiente de clientes' : 'todo al día' }}</span>
          </div>
        </div>
      </section>

      <div class="pg-cols">
        <!-- Cuentas por cobrar -->
        <section class="ui-card ui-rise" style="--d: 140ms">
          <div class="ui-card-h">
            <h3>Cuentas por cobrar</h3>
            <span class="ui-count">{{ pedidosPorCobrar.length }}</span>
          </div>

          <div v-if="pedidosPorCobrar.length === 0" class="pg-clear">
            <div class="ui-empty-ico good"><q-icon name="task_alt" size="36px" /></div>
            <p>No hay saldos pendientes. ¡Todo está al día!</p>
          </div>

          <ul v-else class="pg-recv-list">
            <li v-for="p in pedidosPorCobrar" :key="p.id" class="pg-recv">
              <div class="pg-recv-top">
                <div class="pg-recv-who">
                  <b>{{ p.cliente }}</b>
                  <span class="ui-chip sm neutral">#{{ p.id }}</span>
                </div>
                <span class="pg-recv-saldo">{{ moneda(p.saldo) }}</span>
              </div>
              <span class="ui-meter"><i :style="{ width: pctPedido(p) + '%' }"></i></span>
              <div class="pg-recv-bot">
                <small class="ui-mute">Pagado {{ moneda(p.pagado) }} de {{ moneda(p.total) }}</small>
                <button type="button" class="ui-ghost sm" @click="abrirPago(p)">
                  <q-icon name="add" size="16px" /> Abonar
                </button>
              </div>
            </li>
          </ul>
        </section>

        <!-- Historial -->
        <section class="pg-hist ui-rise" style="--d: 180ms">
          <div class="ui-tools">
            <label class="ui-search">
              <q-icon name="search" size="20px" />
              <input
                ref="searchRef"
                v-model="busqueda"
                type="search"
                placeholder="Buscar cliente, #pedido o referencia…  ( / )"
                autocomplete="off"
                spellcheck="false"
              />
            </label>
            <div class="ui-seg" role="group" aria-label="Filtrar por método">
              <button
                type="button"
                class="ui-pill"
                :class="{ on: filtroMetodo === '' }"
                @click="filtroMetodo = ''"
              >
                Todos<b>{{ pagos.length }}</b>
              </button>
              <button
                v-for="m in metodos"
                :key="m.value"
                type="button"
                class="ui-pill hue"
                :class="{ on: filtroMetodo === m.value }"
                :style="chipStyle(m.hue)"
                @click="filtroMetodo = filtroMetodo === m.value ? '' : m.value"
              >
                {{ m.label }}<b>{{ conteoMetodo(m.value) }}</b>
              </button>
            </div>
          </div>

          <q-table
            v-model:pagination="pagination"
            class="ui-table"
            dark
            flat
            :rows="pagosFiltrados"
            :columns="columns"
            row-key="id"
            :loading="loading"
            :rows-per-page-options="[10, 20, 50, 100]"
            rows-per-page-label="Filas por página"
            :pagination-label="etiquetaPag"
          >
            <template #body="props">
              <q-tr
                :props="props"
                class="ui-tr"
                :class="{ flash: props.row.id === resaltado }"
                :style="{ '--i': Math.min(props.pageIndex, 12) }"
              >
                <q-td key="creado_en" :props="props">
                  <span class="ui-name">{{ fechaDia(props.row.creado_en) }}</span>
                  <span class="ui-sm">{{ hora(props.row.creado_en) }}</span>
                </q-td>

                <q-td key="pedido" :props="props">
                  <span class="ui-name">{{ props.row.cliente }}</span>
                  <span class="ui-sm">Pedido #{{ props.row.pedido_id }} · Total {{ moneda(props.row.total) }}</span>
                </q-td>

                <q-td key="monto" :props="props" class="ui-num ui-strong pg-monto">
                  {{ moneda(props.row.monto) }}
                  <span v-if="props.row.monto_bs" class="ui-sm pg-bs">
                    {{ bs(props.row.monto_bs) }} · tasa {{ tasaTexto(props.row.tasa) }}
                  </span>
                </q-td>

                <q-td key="metodo" :props="props">
                  <span
                    class="ui-chip sm"
                    :class="{ neutral: metodoInfo(props.row.metodo).hue === null }"
                    :style="chipStyle(metodoInfo(props.row.metodo).hue)"
                  >
                    <q-icon :name="metodoInfo(props.row.metodo).icon" size="14px" />
                    {{ metodoInfo(props.row.metodo).label }}
                  </span>
                  <span v-if="props.row.referencia" class="ui-sm pg-ref">
                    Ref. {{ refVisible(props.row) }}
                  </span>
                  <span v-if="faltaCaptura(props.row)" class="pg-nocap">
                    <q-icon name="photo_camera" size="12px" /> Sin captura
                    <q-tooltip>Este pago no tiene comprobante adjunto</q-tooltip>
                  </span>
                </q-td>

                <q-td key="actions" :props="props">
                  <div class="ui-acts">
                    <button
                      v-if="props.row.comprobante"
                      type="button"
                      class="ui-ico"
                      aria-label="Ver comprobante"
                      @click="verComprobante(props.row)"
                    >
                      <q-icon name="image" size="18px" />
                      <q-tooltip>Ver comprobante</q-tooltip>
                    </button>
                    <button
                      type="button"
                      class="ui-ico danger"
                      aria-label="Eliminar pago"
                      @click="confirmDelete(props.row)"
                    >
                      <q-icon name="delete" size="18px" />
                      <q-tooltip>Eliminar pago</q-tooltip>
                    </button>
                  </div>
                </q-td>
              </q-tr>
            </template>

            <template #no-data>
              <div class="ui-nodata">
                <q-icon :name="pagos.length === 0 ? 'receipt_long' : 'search_off'" size="34px" />
                <span>
                  {{ pagos.length === 0 ? 'Todavía no hay pagos registrados' : 'Nada coincide con tu búsqueda' }}
                </span>
                <button v-if="pagos.length > 0" type="button" class="ui-ghost" @click="limpiarFiltros">
                  Quitar filtros
                </button>
              </div>
            </template>
          </q-table>
        </section>
      </div>
    </div>

    <!-- Registrar pago -->
    <q-dialog
      v-model="showForm"
      persistent
      :maximized="$q.screen.lt.sm"
      transition-show="jump-up"
      transition-hide="jump-down"
      @hide="quitarArchivo"
    >
      <q-card dark class="ui-dialog">
        <div class="ui-dh">
          <div>
            <p class="ui-eyebrow">Cobro</p>
            <h2>Registrar pago</h2>
          </div>
          <button type="button" class="ui-ico" aria-label="Cerrar" @click="showForm = false">
            <q-icon name="close" size="20px" />
          </button>
        </div>

        <q-form class="ui-form" @submit.prevent="guardar">
          <div class="ui-db">
            <q-select
              v-model="form.pedido_id"
              dark
              dense
              outlined
              options-dense
              emit-value
              map-options
              color="orange-4"
              label="Pedido"
              class="ui-field"
              behavior="menu"
              popup-content-class="ui-menu"
              option-value="id"
              option-label="etiqueta"
              :options="opcionesPedidos"
              :disable="form.pedidoFijo"
              :rules="[(val: number | null) => !!val || 'Selecciona un pedido']"
            />

            <!-- Estado del pedido en vivo -->
            <div v-if="pedidoSeleccionado" class="ui-live" :class="saldoDespues <= 0.001 ? 'hi' : 'mid'">
              <div class="ui-live-grid">
                <div>
                  <span>Total</span>
                  <b>{{ moneda(pedidoSeleccionado.total) }}</b>
                </div>
                <div>
                  <span>Pagado</span>
                  <b>{{ moneda(pedidoSeleccionado.pagado) }}</b>
                </div>
                <div>
                  <span>Este pago</span>
                  <b class="accent">{{ moneda(montoNum) }}</b>
                </div>
                <div>
                  <span>Quedaría</span>
                  <b class="tone">{{ moneda(saldoDespues) }}</b>
                </div>
              </div>
              <div class="pg-bar">
                <i class="a" :style="{ width: pctPagado + '%' }"></i>
                <i class="b" :style="{ width: pctAhora + '%' }"></i>
              </div>
              <p v-if="saldoDespues <= 0.001 && montoNum > 0" class="pg-done">
                <q-icon name="check_circle" size="16px" /> Con este pago el pedido queda pagado
              </p>
            </div>

            <p class="ui-label">Método de pago</p>
            <div class="pg-metodos" role="radiogroup" aria-label="Método de pago">
              <button
                v-for="m in metodos"
                :key="m.value"
                type="button"
                role="radio"
                class="pg-metodo"
                :class="{ on: form.metodo === m.value }"
                :aria-checked="form.metodo === m.value"
                :style="chipStyle(m.hue)"
                @click="elegirMetodo(m.value)"
              >
                <q-icon :name="m.icon" size="22px" />
                <span>{{ m.label }}</span>
              </button>
            </div>

            <!-- ¿En qué moneda paga el cliente? La deuda siempre queda en $ -->
            <p class="ui-label">Moneda del pago</p>
            <div class="pg-moneda" role="radiogroup" aria-label="Moneda del pago">
              <button
                type="button"
                role="radio"
                class="ui-pill"
                :class="{ on: !pagaEnBs }"
                :aria-checked="!pagaEnBs"
                @click="elegirMoneda('usd')"
              >
                Dólares ($)
              </button>
              <button
                type="button"
                role="radio"
                class="ui-pill"
                :class="{ on: pagaEnBs }"
                :aria-checked="pagaEnBs"
                @click="elegirMoneda('bs')"
              >
                Bolívares (Bs)
              </button>
            </div>

            <q-input
              v-if="!pagaEnBs"
              v-model.number="form.monto"
              dark
              dense
              outlined
              color="orange-4"
              type="number"
              min="0.01"
              step="any"
              prefix="$"
              label="Monto"
              class="ui-field"
              :rules="[
                (val: number) => val > 0 || 'Debe ser mayor a 0',
                (val: number) =>
                  !pedidoSeleccionado || val <= pedidoSeleccionado.saldo + 0.001 || 'No puede superar el saldo',
              ]"
            />

            <template v-else>
              <p class="ui-label">Tasa del pago</p>
              <div class="pg-rates" role="radiogroup" aria-label="Tasa a usar">
                <button
                  v-for="t in TASAS_PAGO"
                  :key="t.value"
                  type="button"
                  role="radio"
                  class="pg-rate"
                  :class="{ on: form.tasa_tipo === t.value }"
                  :aria-checked="form.tasa_tipo === t.value"
                  :disabled="!tasaDe(t.value)"
                  @click="elegirTasa(t.value)"
                >
                  <span class="pg-rate-name">{{ t.label }}</span>
                  <span class="pg-rate-val">{{ tasaDe(t.value) ? bs(tasaDe(t.value)) : 'sin tasa' }}</span>
                  <span v-if="pedidoSeleccionado && tasaDe(t.value)" class="pg-rate-saldo">
                    Saldo {{ moneda(pedidoSeleccionado.saldo) }} = {{ bs(pedidoSeleccionado.saldo * tasaDe(t.value)) }}
                  </span>
                  <span v-if="montoBsNum > 0 && tasaDe(t.value)" class="pg-rate-eq">{{ equivalente(t.value) }}</span>
                </button>
              </div>
              <p class="pg-hint">
                La deuda siempre se descuenta en $ (bolívares ÷ tasa elegida). Elige la tasa con la que se acordó el cobro.
              </p>
              <q-input
                v-model.number="form.monto_bs"
                dark
                dense
                outlined
                color="orange-4"
                type="number"
                min="0.01"
                step="any"
                prefix="Bs"
                label="Monto pagado en bolívares"
                class="ui-field"
                @update:model-value="onBsInput"
                :rules="[
                  () => tasaActual > 0 || 'No hay tasa disponible para calcular',
                  (val: number) => val > 0 || 'Debe ser mayor a 0',
                  () =>
                    !pedidoSeleccionado ||
                    montoNum <= pedidoSeleccionado.saldo + 0.02 ||
                    'Supera el saldo pendiente',
                ]"
              />
              <div v-if="tasaActual > 0" class="pg-result" :class="{ empty: montoBsNum <= 0 }">
                <span class="pg-result-k">Se registrará como</span>
                <b class="pg-result-v">{{ moneda(montoNum) }}</b>
                <small>
                  {{ bs(montoBsNum) }} a {{ bs(tasaActual) }} por $. El servidor lo recalcula con su tasa al guardar.
                </small>
              </div>
            </template>
            <div v-if="pedidoSeleccionado" class="ui-quick">
              <span>Monto rápido</span>
              <button
                type="button"
                class="pg-chip"
                :class="{ on: Math.abs(montoNum - pedidoSeleccionado.saldo) < 0.005 }"
                @click="fijarMonto(1)"
              >
                Saldo completo
              </button>
              <button
                type="button"
                class="pg-chip"
                :class="{ on: Math.abs(montoNum - pedidoSeleccionado.saldo / 2) < 0.005 }"
                @click="fijarMonto(0.5)"
              >
                50% del saldo
              </button>
            </div>

            <!-- Referencia: solo en transferencia y pago móvil -->
            <template v-if="usaReferencia">
            <q-input
              v-model="form.referencia"
              dark
              dense
              outlined
              color="orange-4"
              class="ui-field"
              :label="esPagoMovil ? 'Últimos 4 dígitos de la referencia' : 'Referencia (opcional)'"
              :inputmode="esPagoMovil ? 'numeric' : 'text'"
              :rules="reglasReferencia"
              @update:model-value="onReferencia"
            >
              <template v-if="esPagoMovil" #prepend>
                <span class="pg-mask">····</span>
              </template>
            </q-input>
            <p v-if="esPagoMovil" class="pg-hint">
              Escribe solo los últimos 4 números. Si pegas la referencia completa, se toman los últimos 4.
            </p>
            </template>

            <p v-if="duplicado" class="ui-warn">
              <q-icon name="warning_amber" size="18px" />
              <span>
                Ya existe un pago móvil con esta referencia y este monto (pedido #{{ duplicado.pedido_id }},
                {{ duplicado.cliente }}). Verifica que no sea el mismo comprobante.
              </span>
            </p>

            <!-- Captura del pago -->
            <template v-if="metodoActual.comprobante">
              <p class="ui-label">Captura del pago</p>
              <div
                class="pg-drop"
                :class="{ over: arrastrando, has: !!archivo }"
                @dragover.prevent="arrastrando = true"
                @dragleave.prevent="arrastrando = false"
                @drop.prevent="soltar"
              >
                <input
                  ref="fileRef"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  @change="elegir"
                />
                <template v-if="!archivo">
                  <q-icon name="upload_file" size="30px" />
                  <b>Adjunta el comprobante</b>
                  <span>
                    Arrastra la imagen, pégala con Ctrl+V o
                    <button type="button" class="pg-link" @click="fileRef?.click()">búscala en tu equipo</button>
                  </span>
                  <small>PNG, JPG o WebP · máx. 5 MB</small>
                </template>
                <div v-else class="pg-prev">
                  <img v-if="previaUrl" :src="previaUrl" alt="Vista previa del comprobante" />
                  <div class="pg-prev-info">
                    <b>{{ archivo.name }}</b>
                    <span>{{ formatoTam(archivo.size) }} · lista para guardar</span>
                  </div>
                  <button type="button" class="ui-ico danger" aria-label="Quitar captura" @click="quitarArchivo">
                    <q-icon name="close" size="18px" />
                  </button>
                </div>
              </div>
            </template>
          </div>

          <div class="ui-df">
            <button type="button" class="ui-ghost" @click="showForm = false">Cancelar</button>
            <button type="submit" class="ui-cta" :disabled="submitting">
              <q-spinner v-if="submitting" size="18px" color="dark" />
              <span>{{ submitting ? 'Guardando…' : 'Guardar pago' }}</span>
            </button>
          </div>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Ver comprobante -->
    <q-dialog
      v-model="showVista"
      :maximized="$q.screen.lt.sm"
      transition-show="jump-up"
      transition-hide="jump-down"
      @hide="liberarVista"
    >
      <q-card dark class="ui-dialog wide">
        <div class="ui-dh">
          <div>
            <p class="ui-eyebrow">Comprobante</p>
            <h2 v-if="vistaPago">{{ moneda(vistaPago.monto) }} · {{ vistaPago.cliente }}</h2>
          </div>
          <button type="button" class="ui-ico" aria-label="Cerrar" @click="showVista = false">
            <q-icon name="close" size="20px" />
          </button>
        </div>
        <div class="pg-vista">
          <img v-if="vistaUrl" :src="vistaUrl" alt="Captura del pago" />
        </div>
        <div v-if="vistaPago" class="ui-df between">
          <span class="ui-mute">
            Pedido #{{ vistaPago.pedido_id }} · {{ metodoInfo(vistaPago.metodo).label }}
            <template v-if="vistaPago.referencia"> · Ref. {{ refVisible(vistaPago) }}</template>
          </span>
          <a
            v-if="vistaUrl"
            class="ui-ghost"
            :href="vistaUrl"
            :download="`comprobante-pago-${vistaPago.id}.${vistaExt}`"
          >
            <q-icon name="download" size="18px" /> Descargar
          </a>
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useQuasar, type QTableColumn } from 'quasar';
import { api } from '../../boot/axios';
import type { AxiosError } from 'axios';
import '../../css/ui.css';
import TasasBar from '../../components/TasasBar.vue';
import { useTasas, type TasaClave } from '../../composables/useTasas';

interface Pedido {
  id: number;
  cliente: string;
  total: number;
  pagado: number;
  saldo: number;
  estado: string;
  estado_pago: string;
}

interface Pago {
  id: number;
  pedido_id: number;
  cliente: string;
  monto: number;
  metodo: string;
  referencia: string | null;
  total: number;
  estado: string;
  creado_en: string;
  // El servidor lo devuelve con valor cuando el pago tiene captura adjunta
  comprobante?: string | null;
  // Solo si se pagó en bolívares: cuánto y a qué tasa
  monto_bs?: number | null;
  tasa?: number | null;
  tasa_tipo?: string | null;
}

interface Metodo {
  value: string;
  label: string;
  icon: string;
  hue: number | null;
  comprobante: boolean; // admite captura del pago
}

const METODOS: Metodo[] = [
  { value: 'efectivo', label: 'Efectivo', icon: 'payments', hue: 145, comprobante: false },
  { value: 'tarjeta', label: 'Tarjeta', icon: 'credit_card', hue: 275, comprobante: false },
  { value: 'transferencia', label: 'Transferencia', icon: 'account_balance', hue: 38, comprobante: true },
  { value: 'pago_movil', label: 'Pago móvil', icon: 'smartphone', hue: 335, comprobante: true },
  { value: 'otro', label: 'Otro', icon: 'receipt', hue: null, comprobante: false },
];

// Solo se aceptan estos formatos (se excluye SVG a propósito) y hasta 5 MB
const COMPROBANTE_TIPOS = ['image/png', 'image/jpeg', 'image/webp'];
const COMPROBANTE_MAX = 5 * 1024 * 1024;
// Solo estos métodos piden referencia (efectivo, tarjeta y otro no la necesitan)
const METODOS_CON_REF = ['transferencia', 'pago_movil'];

const $q = useQuasar();

/* ---------- Tasas de cambio (vienen del servidor, que las toma de Al Cambio) ---------- */
const TASAS_PAGO: { value: TasaClave; label: string }[] = [
  { value: 'usd_bcv', label: 'Dólar BCV' },
  { value: 'eur_bcv', label: 'Euro BCV' },
  { value: 'usdt', label: 'USDT' },
];
const {
  tasas,
  estado: estadoTasas,
  cargando: tasasCargando,
  sinConexion: tasasSinConexion,
  hayProblema: tasasConProblema,
  tasaDe,
  actualizarAhora: actualizarTasas,
} = useTasas();

const bs = (valor: number): string =>
  `Bs ${(Number.isFinite(Number(valor)) ? Number(valor) : 0).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const tasaTexto = (valor: number | null | undefined): string =>
  (Number(valor) || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const loading = ref(false);
const submitting = ref(false);
const showForm = ref(false);
const pagos = ref<Pago[]>([]);
const pedidos = ref<Pedido[]>([]);
const metodos = METODOS;

/* ---------- Búsqueda, filtro y paginación ---------- */
const busqueda = ref('');
const filtroMetodo = ref('');
const searchRef = ref<HTMLInputElement | null>(null);
// Por defecto lo más reciente primero
const pagination = ref<{ sortBy: string | null; descending: boolean; page: number; rowsPerPage: number }>({
  sortBy: 'creado_en',
  descending: true,
  page: 1,
  rowsPerPage: 10,
});

const columns: QTableColumn[] = [
  { name: 'creado_en', label: 'Fecha', field: 'creado_en', align: 'left', sortable: true },
  { name: 'pedido', label: 'Pedido', field: (row: Pago) => row.cliente, align: 'left' },
  { name: 'monto', label: 'Monto', field: 'monto', align: 'right', sortable: true },
  { name: 'metodo', label: 'Método', field: 'metodo', align: 'left' },
  { name: 'actions', label: '', field: 'id', align: 'right' },
];

/* ---------- Formato y cálculos ---------- */
const moneda = (valor: number): string => `$${(Number.isFinite(Number(valor)) ? Number(valor) : 0).toFixed(2)}`;
const fechaLocalISO = (fecha: Date): string => {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const fechaDia = (valor: string): string => new Date(valor).toLocaleDateString('es-CO', { dateStyle: 'short' });
const hora = (valor: string): string => new Date(valor).toLocaleTimeString('es-CO', { timeStyle: 'short' });

const metodoInfo = (valor: string): Metodo =>
  metodos.find((m) => m.value === valor) ?? { value: valor, label: valor, icon: 'receipt', hue: null, comprobante: false };

const chipStyle = (hue: number | null): Record<string, string> => (hue === null ? {} : { '--h': String(hue) });

// Los pagos móviles muestran solo los últimos 4 dígitos
const refVisible = (p: Pago): string => (p.metodo === 'pago_movil' ? `····${p.referencia ?? ''}` : (p.referencia ?? ''));
const faltaCaptura = (p: Pago): boolean => metodoInfo(p.metodo).comprobante && !p.comprobante;

const pctPedido = (p: Pedido): number => (p.total > 0 ? Math.min(100, Math.max(0, (p.pagado / p.total) * 100)) : 0);

const pedidosPorCobrar = computed(() =>
  pedidos.value.filter((p) => p.estado !== 'cancelado' && Number(p.saldo) > 0.001),
);

const opcionesPedidos = computed(() =>
  pedidosPorCobrar.value.map((p) => ({
    id: p.id,
    etiqueta: `#${p.id} · ${p.cliente} · saldo ${moneda(p.saldo)}`,
  })),
);

const pedidoSeleccionado = computed(() => pedidos.value.find((p) => p.id === form.pedido_id) ?? null);

const conteoMetodo = (valor: string): number => pagos.value.filter((p) => p.metodo === valor).length;

const pagosFiltrados = computed<Pago[]>(() => {
  const q = busqueda.value.trim().toLowerCase().replace(/^#/, '');
  return pagos.value.filter((p) => {
    if (filtroMetodo.value && p.metodo !== filtroMetodo.value) return false;
    if (!q) return true;
    return (
      p.cliente.toLowerCase().includes(q) ||
      String(p.pedido_id) === q ||
      (p.referencia ?? '').toLowerCase().includes(q)
    );
  });
});

const etiquetaPag = (first: number, last: number, total: number): string => `${first}–${last} de ${total}`;

const limpiarFiltros = (): void => {
  busqueda.value = '';
  filtroMetodo.value = '';
};
watch([busqueda, filtroMetodo], () => {
  pagination.value = { ...pagination.value, page: 1 };
});

/* ---------- Resumen con conteo animado ---------- */
const stats = computed(() => {
  const vigentes = pagos.value.filter((p) => p.estado !== 'cancelado');
  const hoyISO = fechaLocalISO(new Date());
  return {
    recaudado: vigentes.reduce((acc, p) => acc + Number(p.monto), 0),
    hoy: vigentes
      .filter((p) => fechaLocalISO(new Date(p.creado_en)) === hoyISO)
      .reduce((acc, p) => acc + Number(p.monto), 0),
    cantidad: pagos.value.length,
    cobrar: pedidosPorCobrar.value.reduce((acc, p) => acc + Number(p.saldo), 0),
  };
});

const shown = reactive({ recaudado: 0, hoy: 0, cantidad: 0, cobrar: 0 });
const claves = ['recaudado', 'hoy', 'cantidad', 'cobrar'] as const;
let raf = 0;
const animarStats = (to: Record<(typeof claves)[number], number>): void => {
  cancelAnimationFrame(raf);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    Object.assign(shown, to);
    return;
  }
  const from = { ...shown };
  const t0 = performance.now();
  const step = (t: number): void => {
    const k = Math.min(1, (t - t0) / 700);
    const e = 1 - Math.pow(1 - k, 3);
    for (const c of claves) shown[c] = from[c] + (to[c] - from[c]) * e;
    if (k < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
};
watch(stats, (s) => animarStats({ ...s }));

/* ---------- Formulario ---------- */
const formVacio = () => ({
  pedido_id: null as number | null,
  pedidoFijo: false,
  monto: 0 as number | string,
  moneda: 'usd' as 'usd' | 'bs',
  monto_bs: 0 as number | string,
  tasa_tipo: 'usd_bcv' as TasaClave,
  metodo: 'efectivo',
  referencia: '',
});
const form = reactive(formVacio());

const metodoActual = computed(() => metodoInfo(form.metodo));
const esPagoMovil = computed(() => form.metodo === 'pago_movil');
const usaReferencia = computed(() => METODOS_CON_REF.includes(form.metodo));
const pagaEnBs = computed(() => form.moneda === 'bs');
const tasaActual = computed(() => tasaDe(form.tasa_tipo));
const montoBsNum = computed(() => Number(form.monto_bs) || 0);
// "Equivale a $0.60" para cada tasa, según los Bs escritos (vacío si aún no hay monto)
const equivalente = (clave: TasaClave): string => {
  const t = tasaDe(clave);
  if (!(t > 0) || !(montoBsNum.value > 0)) return '';
  return `Equivale a $${(Math.round((montoBsNum.value / t) * 100) / 100).toFixed(2)}`;
};

// Si el monto en Bs lo llenó el sistema (no lo escribió una persona), al cambiar de tasa se recalcula
// para que la deuda en $ sea la misma; si lo escribió una persona, se respeta tal cual.
const bsManual = ref(false);
const onBsInput = (): void => {
  bsManual.value = true;
};
const elegirTasa = (clave: TasaClave): void => {
  const dolares = montoNum.value;
  form.tasa_tipo = clave;
  if (!bsManual.value && dolares > 0) form.monto_bs = Math.round(dolares * tasaDe(clave) * 100) / 100;
};
// Monto en $ que queda registrado: directo, o los Bs entre la tasa
const montoNum = computed(() => {
  if (pagaEnBs.value) {
    const t = tasaActual.value;
    return t > 0 ? Math.round(((Number(form.monto_bs) || 0) / t) * 100) / 100 : 0;
  }
  return Number(form.monto) || 0;
});

const elegirMoneda = (m: 'usd' | 'bs'): void => {
  form.moneda = m;
  bsManual.value = false;
  if (m === 'bs') form.monto_bs = Math.round(montoNum.value * tasaActual.value * 100) / 100 || 0;
  else form.monto = montoNum.value || 0;
};

// Barra del pedido: lo ya pagado + lo que aporta este pago
const pctPagado = computed(() => (pedidoSeleccionado.value ? pctPedido(pedidoSeleccionado.value) : 0));
const pctAhora = computed(() => {
  const p = pedidoSeleccionado.value;
  if (!p || p.total <= 0) return 0;
  return Math.max(0, Math.min(100 - pctPagado.value, (montoNum.value / p.total) * 100));
});
const saldoDespues = computed(() =>
  pedidoSeleccionado.value ? Math.max(Number(pedidoSeleccionado.value.saldo) - montoNum.value, 0) : 0,
);

const reglasReferencia = computed(() =>
  esPagoMovil.value
    ? [(val: string) => /^\d{4}$/.test(val ?? '') || 'Ingresa los últimos 4 dígitos']
    : [],
);

// En pago móvil el campo solo guarda los últimos 4 dígitos
const onReferencia = (val: string | number | null): void => {
  if (esPagoMovil.value) form.referencia = String(val ?? '').replace(/\D/g, '').slice(-4);
};

const fijarMonto = (fraccion: number): void => {
  if (!pedidoSeleccionado.value) return;
  const dolares = Math.round(Number(pedidoSeleccionado.value.saldo) * fraccion * 100) / 100;
  if (pagaEnBs.value) {
    form.monto_bs = Math.round(dolares * tasaActual.value * 100) / 100;
    bsManual.value = false;
  } else form.monto = dolares;
};

// Aviso si ya hay un pago móvil igual (misma referencia y monto): evita registrar dos veces la misma captura
const duplicado = computed(() => {
  if (!esPagoMovil.value || !/^\d{4}$/.test(form.referencia)) return null;
  return (
    pagos.value.find(
      (p) =>
        p.metodo === 'pago_movil' &&
        p.referencia === form.referencia &&
        Math.abs(p.monto - montoNum.value) < 0.005,
    ) ?? null
  );
});

/* ---------- Captura del pago ---------- */
const archivo = ref<File | null>(null);
const previaUrl = ref<string | null>(null);
const arrastrando = ref(false);
const fileRef = ref<HTMLInputElement | null>(null);

const formatoTam = (bytes: number): string =>
  bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const liberarPrevia = (): void => {
  if (previaUrl.value) URL.revokeObjectURL(previaUrl.value);
  previaUrl.value = null;
};
const quitarArchivo = (): void => {
  liberarPrevia();
  archivo.value = null;
  arrastrando.value = false;
};
const aceptarArchivo = (f: File): void => {
  if (!COMPROBANTE_TIPOS.includes(f.type)) {
    $q.notify({ type: 'warning', message: 'Sube una imagen PNG, JPG o WebP' });
    return;
  }
  if (f.size > COMPROBANTE_MAX) {
    $q.notify({ type: 'warning', message: 'La imagen supera los 5 MB' });
    return;
  }
  liberarPrevia();
  archivo.value = f;
  previaUrl.value = URL.createObjectURL(f);
};
const elegir = (e: Event): void => {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  if (f) aceptarArchivo(f);
  input.value = '';
};
const soltar = (e: DragEvent): void => {
  arrastrando.value = false;
  const f = e.dataTransfer?.files?.[0];
  if (f) aceptarArchivo(f);
};
// Pegar una captura con Ctrl+V mientras el formulario está abierto
const pegar = (e: ClipboardEvent): void => {
  if (!showForm.value || !metodoActual.value.comprobante) return;
  const f = e.clipboardData?.files?.[0];
  if (f && f.type.startsWith('image/')) {
    e.preventDefault();
    aceptarArchivo(f);
  }
};

const elegirMetodo = (valor: string): void => {
  form.metodo = valor;
  if (valor === 'pago_movil') form.referencia = form.referencia.replace(/\D/g, '').slice(-4);
  if (!METODOS_CON_REF.includes(valor)) form.referencia = '';
  if (!metodoInfo(valor).comprobante) quitarArchivo();
};

/* ---------- Ver comprobante ---------- */
const showVista = ref(false);
const vistaUrl = ref<string | null>(null);
const vistaPago = ref<Pago | null>(null);
const vistaExt = ref('png');
const liberarVista = (): void => {
  if (vistaUrl.value) URL.revokeObjectURL(vistaUrl.value);
  vistaUrl.value = null;
};

const notifyError = (error: unknown, fallback: string): void => {
  const err = error as AxiosError<{ mensaje?: string; error?: string }>;
  $q.notify({
    type: 'negative',
    message: err.response?.data?.error || err.response?.data?.mensaje || fallback,
  });
};

// La imagen se pide con el token (no es una URL pública) y se muestra desde memoria
const verComprobante = async (p: Pago): Promise<void> => {
  try {
    const { data } = await api.get<Blob>(`/pagos/${p.id}/comprobante`, { responseType: 'blob' });
    liberarVista();
    vistaUrl.value = URL.createObjectURL(data);
    vistaExt.value = (data.type.split('/')[1] ?? 'png').replace('jpeg', 'jpg');
    vistaPago.value = p;
    showVista.value = true;
  } catch (error) {
    notifyError(error, 'No se pudo abrir el comprobante');
  }
};

/* ---------- API ---------- */
const cargarPagos = async (): Promise<void> => {
  loading.value = true;
  try {
    const { data } = await api.get<Pago[]>('/pagos');
    pagos.value = data.map((p) => ({
      ...p,
      monto: Number(p.monto),
      total: Number(p.total),
    }));
  } catch (error) {
    notifyError(error, 'Error al cargar los pagos.');
  } finally {
    loading.value = false;
  }
};

const cargarPedidos = async (): Promise<void> => {
  try {
    const { data } = await api.get<Pedido[]>('/pedidos');
    pedidos.value = data.map((p) => ({
      ...p,
      total: Number(p.total),
      pagado: Number(p.pagado),
      saldo: Number(p.saldo),
    }));
  } catch (error) {
    notifyError(error, 'Error al cargar los pedidos.');
  }
};

const abrirPago = (pedido?: Pedido): void => {
  Object.assign(form, formVacio());
  bsManual.value = false;
  quitarArchivo();
  if (pedido) {
    form.pedido_id = pedido.id;
    form.pedidoFijo = true;
    form.monto = Number(pedido.saldo);
  }
  showForm.value = true;
};

const abrirNuevoPago = (): void => {
  if (pedidosPorCobrar.value.length === 0) return;
  abrirPago();
};

watch(
  () => form.pedido_id,
  () => {
    if (!form.pedidoFijo && pedidoSeleccionado.value) {
      fijarMonto(1);
    }
  },
);

/* Resalta el pago recién guardado, que aparece arriba por el orden por fecha */
const resaltado = ref<number | null>(null);
let temporizador = 0;
const resaltar = async (id: number): Promise<void> => {
  limpiarFiltros();
  await nextTick();
  pagination.value = { ...pagination.value, sortBy: 'creado_en', descending: true, page: 1 };
  resaltado.value = id;
  window.clearTimeout(temporizador);
  temporizador = window.setTimeout(() => {
    resaltado.value = null;
  }, 2600);
};

const guardar = async (): Promise<void> => {
  const referencia = usaReferencia.value ? form.referencia.trim() : '';
  if (esPagoMovil.value && !/^\d{4}$/.test(referencia)) {
    $q.notify({ type: 'warning', message: 'Ingresa los últimos 4 dígitos de la referencia' });
    return;
  }

  if (pagaEnBs.value && !(tasaActual.value > 0)) {
    $q.notify({ type: 'warning', message: 'No hay tasa disponible. Registra el pago en $ o intenta más tarde.' });
    return;
  }

  submitting.value = true;
  const idsPrevios = new Set(pagos.value.map((p) => p.id));
  try {
    // En Bs solo se manda lo que pagó el cliente: los $ y la tasa los calcula el servidor
    const montos: Record<string, string | number> = pagaEnBs.value
      ? { monto_bs: Number(form.monto_bs), tasa_tipo: form.tasa_tipo }
      : { monto: Number(form.monto) };

    if (archivo.value && metodoActual.value.comprobante) {
      // Con captura se envía como formulario con archivo
      const datos = new FormData();
      datos.append('pedido_id', String(form.pedido_id));
      for (const [k, v] of Object.entries(montos)) datos.append(k, String(v));
      datos.append('metodo', form.metodo);
      if (referencia) datos.append('referencia', referencia);
      datos.append('comprobante', archivo.value);
      await api.post('/pagos', datos, { headers: { 'Content-Type': 'multipart/form-data' } });
    } else {
      await api.post('/pagos', {
        pedido_id: form.pedido_id,
        ...montos,
        metodo: form.metodo,
        referencia: referencia || null,
      });
    }
    $q.notify({ type: 'positive', message: 'Pago registrado exitosamente' });
    showForm.value = false;
    await Promise.all([cargarPagos(), cargarPedidos()]);
    const nuevo = pagos.value.find((p) => !idsPrevios.has(p.id));
    if (nuevo) await resaltar(nuevo.id);
  } catch (error) {
    notifyError(error, 'No se pudo registrar el pago');
  } finally {
    submitting.value = false;
  }
};

const confirmDelete = (pago: Pago): void => {
  $q.dialog({
    title: 'Eliminar pago',
    message: `¿Seguro que deseas eliminar el pago de ${moneda(pago.monto)} del pedido #${pago.pedido_id}?`,
    dark: true,
    cancel: { label: 'Cancelar', flat: true, color: 'grey-4' },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true },
    persistent: true,
  }).onOk(() => {
    void eliminar(pago.id);
  });
};

const eliminar = async (id: number): Promise<void> => {
  try {
    await api.delete(`/pagos/${id}`);
    $q.notify({ type: 'positive', message: 'Pago eliminado' });
    await Promise.all([cargarPagos(), cargarPedidos()]);
  } catch (error) {
    notifyError(error, 'No se pudo eliminar el pago');
  }
};

/* Atajo: "/" enfoca el buscador */
const atajo = (e: KeyboardEvent): void => {
  const t = e.target as HTMLElement | null;
  const escribiendo = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  if (e.key === '/' && !escribiendo && !showForm.value && !showVista.value) {
    e.preventDefault();
    searchRef.value?.focus();
  }
};

onMounted(() => {
  window.addEventListener('keydown', atajo);
  window.addEventListener('paste', pegar);
  void cargarPagos();
  void cargarPedidos();
});

onUnmounted(() => {
  window.removeEventListener('keydown', atajo);
  window.removeEventListener('paste', pegar);
  cancelAnimationFrame(raf);
  window.clearTimeout(temporizador);
  liberarPrevia();
  liberarVista();
});
</script>

<style>
/* ---------- Específico de Pagos ---------- */
.pg-cols {
  display: grid;
  grid-template-columns: minmax(300px, 5fr) 7fr;
  gap: 18px;
  align-items: start;
}
.pg-hist {
  min-width: 0;
}
.pg-monto {
  color: var(--hi);
}
.pg-ref {
  font-variant-numeric: tabular-nums;
}
.pg-bs {
  display: block;
  font-weight: 500;
  color: var(--mute);
  font-variant-numeric: tabular-nums;
}
.pg-moneda,
.pg-tasa-tipo {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.pg-tasa-tipo .ui-pill:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Tasas al pagar en Bs: cada una muestra cuánto equivale el monto escrito */
.pg-rates {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}
.pg-rate {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  color: var(--ink);
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}
.pg-rate:hover:not(:disabled):not(.ref) {
  background: var(--panel-2);
}
.pg-rate.on {
  border-color: hsl(30 85% 52% / 0.85);
  background: hsl(30 80% 60% / 0.2);
}
.pg-rate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pg-rate.ref {
  cursor: default;
  border-style: dashed;
}
.pg-rate-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
}
.pg-rate-name small {
  font-weight: 400;
  color: var(--mute);
}
.pg-rate-val {
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}
.pg-rate-saldo {
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}
.pg-rate-eq {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}

/* Resultado destacado: cuánto se registra en $ */
.pg-result {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  margin: 2px 0 12px;
  padding: 12px 14px;
  border: 1px solid hsl(145 45% 38% / 0.5);
  border-radius: 12px;
  background: hsl(145 50% 50% / 0.14);
  color: var(--ink);
}
.pg-result.empty {
  opacity: 0.7;
}
.pg-result-k {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}
.pg-result-v {
  font-size: 26px;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}
.pg-result small {
  flex-basis: 100%;
  font-size: 12px;
  color: var(--mute);
}

/* Botones de monto rápido */
.pg-chip {
  padding: 5px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--panel);
  color: var(--ink);
  font: 600 12px/1.2 'IBM Plex Sans', sans-serif;
  cursor: pointer;
}
.pg-chip:hover {
  background: var(--panel-2);
}
.pg-chip.on {
  border-color: hsl(30 85% 52% / 0.85);
  background: hsl(30 80% 60% / 0.2);
}
.pg-nocap {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(242, 194, 122, 0.12);
  color: var(--mid);
  font-size: 11px;
  font-weight: 600;
}

/* Cuentas por cobrar */
.pg-clear {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 20px;
  text-align: center;
  color: var(--mute);
}
.pg-clear p {
  margin: 0;
  max-width: 260px;
}
.pg-recv-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.pg-recv {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  --tone: var(--mid);
  transition: background 0.2s ease;
}
.pg-recv:last-child {
  border-bottom: 0;
}
.pg-recv:hover {
  background: rgba(255, 176, 103, 0.06);
}
.pg-recv-top,
.pg-recv-bot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.pg-recv-who {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.pg-recv-who b {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
}
.pg-recv-saldo {
  color: var(--neg);
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* Barra del pedido en el diálogo: pagado + este pago */
.pg-bar {
  display: flex;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
}
.pg-bar i {
  display: block;
  height: 100%;
  transition: width 0.4s cubic-bezier(0.2, 0.9, 0.2, 1);
}
.pg-bar .a {
  background: var(--hi);
}
.pg-bar .b {
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
}
.pg-done {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--hi);
}

/* Método de pago */
.pg-metodos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}
.pg-metodo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  color: var(--mute);
  cursor: pointer;
  font: 500 13px/1.1 'IBM Plex Sans', sans-serif;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}
.pg-metodo:hover {
  color: var(--ink);
  background: var(--panel-2);
  transform: translateY(-1px);
}
.pg-metodo.on {
  color: var(--ink);
  border-color: hsl(var(--h, 30) 85% 72% / 0.65);
  background: hsl(var(--h, 30) 70% 60% / 0.16);
}
.pg-metodo.on .q-icon {
  color: hsl(var(--h, 30) 85% 76%);
}
.pg-metodo:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Referencia */
.pg-mask {
  color: var(--mute);
  letter-spacing: 0.1em;
}
.pg-hint {
  margin: -2px 0 6px;
  font-size: 12px;
  color: var(--mute);
}

/* Zona para soltar la captura */
.pg-drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 18px 14px;
  text-align: center;
  border: 1.5px dashed rgba(255, 255, 255, 0.22);
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.18);
  color: var(--mute);
  font-size: 13px;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
}
.pg-drop b {
  color: var(--ink);
  font-size: 14px;
}
.pg-drop small {
  font-size: 12px;
  opacity: 0.8;
}
.pg-drop.over {
  border-color: var(--accent);
  background: rgba(255, 176, 103, 0.1);
  color: var(--ink);
}
.pg-drop.has {
  align-items: stretch;
  padding: 10px 12px;
  text-align: left;
  border-style: solid;
  border-color: rgba(127, 214, 160, 0.45);
}
.pg-link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  cursor: pointer;
  font: inherit;
  text-decoration: underline;
}
.pg-prev {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.pg-prev img {
  flex: none;
  width: 64px;
  height: 64px;
  object-fit: cover;
  border: 1px solid var(--line);
  border-radius: 10px;
}
.pg-prev-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pg-prev-info b {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink);
}

/* Vista del comprobante */
.pg-vista {
  display: grid;
  place-items: center;
  max-height: 68vh;
  margin: 8px 24px 4px;
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.3);
}
.pg-vista img {
  display: block;
  max-width: 100%;
  max-height: 66vh;
  object-fit: contain;
}

@media (max-width: 1100px) {
  .pg-cols {
    grid-template-columns: 1fr;
  }
}
@media (prefers-reduced-motion: reduce) {
  .pg-bar i,
  .pg-metodo {
    transition: none;
  }
}
</style>
<template>
  <q-page class="ui-page">
    <div class="ui-wrap">
      <!-- Encabezado -->
      <header class="ui-head ui-rise">
        <div>
          <p class="ui-eyebrow">Ventas</p>
          <h1 class="ui-title">Pedidos</h1>
          <p class="ui-sub">
            Clientes, entregas y estados. Al crear un pedido se descuentan los ingredientes del inventario.
          </p>
        </div>
        <button type="button" class="ui-cta" @click="abrirNuevo">
          <q-icon name="add" size="20px" />
          <span>Nuevo pedido</span>
        </button>
      </header>

      <!-- Resumen -->
      <section class="ui-stats ui-rise" style="--d: 80ms" aria-label="Resumen">
        <div class="ui-stat">
          <span class="ui-stat-ico ui-t-accent"><q-icon name="shopping_bag" size="22px" /></span>
          <div class="ui-stat-body">
            <span class="ui-stat-k">Pedidos</span>
            <span class="ui-stat-v">{{ Math.round(shown.total) }}</span>
            <span class="ui-stat-h">registrados</span>
          </div>
        </div>
        <div class="ui-stat">
          <span class="ui-stat-ico ui-t-amber"><q-icon name="pending_actions" size="22px" /></span>
          <div class="ui-stat-body">
            <span class="ui-stat-k">En curso</span>
            <span class="ui-stat-v">{{ Math.round(shown.curso) }}</span>
            <span class="ui-stat-h">pendientes, en proceso o listos</span>
          </div>
        </div>
        <div class="ui-stat">
          <span class="ui-stat-ico ui-t-pink"><q-icon name="event_available" size="22px" /></span>
          <div class="ui-stat-body">
            <span class="ui-stat-k">Entregas hoy</span>
            <span class="ui-stat-v">{{ Math.round(shown.hoy) }}</span>
            <span class="ui-stat-h">{{ stats.hoy > 0 ? 'para entregar hoy' : 'nada para hoy' }}</span>
          </div>
        </div>
        <div class="ui-stat" :class="{ alert: stats.cobrar > 0 }">
          <span class="ui-stat-ico" :class="stats.cobrar > 0 ? 'ui-t-warn' : 'ui-t-good'">
            <q-icon name="account_balance_wallet" size="22px" />
          </span>
          <div class="ui-stat-body">
            <span class="ui-stat-k">Por cobrar</span>
            <span class="ui-stat-v">{{ moneda(shown.cobrar) }}</span>
            <span class="ui-stat-h">{{ stats.cobrar > 0 ? 'saldo pendiente' : 'todo cobrado' }}</span>
          </div>
        </div>
      </section>

      <!-- Herramientas -->
      <section class="ui-tools ui-rise" style="--d: 140ms">
        <label class="ui-search">
          <q-icon name="search" size="20px" />
          <input
            ref="searchRef"
            v-model="busqueda"
            type="search"
            placeholder="Buscar cliente, teléfono, producto o #…  ( / )"
            autocomplete="off"
            spellcheck="false"
          />
        </label>

        <div class="ui-seg" role="group" aria-label="Filtrar por estado">
          <button
            type="button"
            class="ui-pill"
            :class="{ on: filtroEstado === '' }"
            @click="filtroEstado = ''"
          >
            Todos<b>{{ pedidos.length }}</b>
          </button>
          <button
            v-for="e in estados"
            :key="e.value"
            type="button"
            class="ui-pill hue"
            :class="{ on: filtroEstado === e.value }"
            :style="chipStyle(e.hue)"
            @click="filtroEstado = filtroEstado === e.value ? '' : e.value"
          >
            {{ e.label }}<b>{{ conteoEstado(e.value) }}</b>
          </button>
        </div>
      </section>

      <!-- Cargando -->
      <div v-if="loading && pedidos.length === 0" class="ui-skel"></div>

      <!-- Sin pedidos -->
      <div v-else-if="!loading && pedidos.length === 0" class="ui-empty ui-rise">
        <div class="ui-empty-ico"><q-icon name="shopping_bag" size="40px" /></div>
        <h2>Aún no tienes pedidos</h2>
        <p>Registra el primero con el cliente, la fecha de entrega y los productos que pidió.</p>
        <button type="button" class="ui-cta" @click="abrirNuevo">
          <q-icon name="add" size="20px" />
          <span>Crear pedido</span>
        </button>
      </div>

      <!-- Tabla -->
      <q-table
        v-else
        v-model:pagination="pagination"
        class="ui-table ui-rise"
        style="--d: 180ms"
        dark
        flat
        :rows="pedidosFiltrados"
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
            <q-td key="id" :props="props" class="ui-mute ui-num">#{{ props.row.id }}</q-td>

            <q-td key="cliente" :props="props">
              <span class="ui-name">{{ props.row.cliente }}</span>
              <span v-if="props.row.telefono" class="ui-sm">{{ props.row.telefono }}</span>
            </q-td>

            <q-td key="fecha_entrega" :props="props">
              <div v-if="props.row.fecha_entrega" class="pd-due" :class="entrega(props.row).tono">
                <b>{{ entrega(props.row).texto }}</b>
                <small v-if="entrega(props.row).sub">{{ entrega(props.row).sub }}</small>
              </div>
              <span v-else class="ui-mute">—</span>
            </q-td>

            <q-td key="items" :props="props">
              <div class="pd-items">
                <span v-for="it in props.row.items.slice(0, 2)" :key="it.id">
                  {{ cant(it.cantidad) }}× {{ it.nombre }}
                </span>
                <span v-if="props.row.items.length > 2" class="ui-mute">
                  +{{ props.row.items.length - 2 }} más
                  <q-tooltip>
                    <div v-for="it in props.row.items" :key="it.id">{{ cant(it.cantidad) }}× {{ it.nombre }}</div>
                  </q-tooltip>
                </span>
              </div>
            </q-td>

            <q-td key="total" :props="props" class="ui-num ui-strong">{{ moneda(props.row.total) }}</q-td>

            <q-td key="estado_pago" :props="props">
              <div class="pd-pago" :class="props.row.estado_pago">
                <span
                  class="ui-chip sm"
                  :class="{ neutral: pagoInfo(props.row.estado_pago).hue === null }"
                  :style="chipStyle(pagoInfo(props.row.estado_pago).hue)"
                >
                  {{ pagoInfo(props.row.estado_pago).label }}
                </span>
                <span class="ui-meter"><i :style="{ width: pctPago(props.row) + '%' }"></i></span>
                <small class="ui-mute">Saldo: {{ moneda(props.row.saldo) }}</small>
              </div>
            </q-td>

            <q-td key="estado" :props="props">
              <button
                type="button"
                class="ui-chip"
                :class="{ neutral: estadoInfo(props.row.estado).hue === null }"
                :style="chipStyle(estadoInfo(props.row.estado).hue)"
                aria-label="Cambiar estado"
              >
                <q-icon :name="estadoInfo(props.row.estado).icon" size="15px" />
                {{ estadoInfo(props.row.estado).label }}
                <q-icon name="expand_more" size="16px" />
                <q-menu class="ui-menu" anchor="bottom left" self="top left" :offset="[0, 6]">
                  <q-list style="min-width: 200px">
                    <q-item-label header>Cambiar estado</q-item-label>
                    <q-item
                      v-for="e in estados"
                      :key="e.value"
                      v-close-popup
                      clickable
                      :disable="props.row.estado === e.value"
                      @click="cambiarEstado(props.row, e.value)"
                    >
                      <q-item-section avatar>
                        <q-icon :name="e.icon" :style="{ color: `hsl(${e.hue ?? 30} 85% 72%)` }" />
                      </q-item-section>
                      <q-item-section>{{ e.label }}</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </button>
            </q-td>

            <q-td key="creado_en" :props="props" class="ui-mute">{{ fechaHora(props.row.creado_en) }}</q-td>

            <q-td key="actions" :props="props">
              <div class="ui-acts">
                <button type="button" class="ui-ico" aria-label="Editar pedido" @click="abrirEditar(props.row)">
                  <q-icon name="edit" size="18px" />
                  <q-tooltip>Editar pedido</q-tooltip>
                </button>
                <button
                  type="button"
                  class="ui-ico danger"
                  :class="{ locked: props.row.pagado > 0 }"
                  aria-label="Eliminar pedido"
                  @click="intentarEliminar(props.row)"
                >
                  <q-icon name="delete" size="18px" />
                  <q-tooltip>
                    {{
                      props.row.pagado > 0 ? 'Tiene pagos registrados: elimínalos primero' : 'Eliminar pedido'
                    }}
                  </q-tooltip>
                </button>
              </div>
            </q-td>
          </q-tr>
        </template>

        <template #no-data>
          <div class="ui-nodata">
            <q-icon name="search_off" size="34px" />
            <span>Nada coincide con tu búsqueda</span>
            <button type="button" class="ui-ghost" @click="limpiarFiltros">Quitar filtros</button>
          </div>
        </template>
      </q-table>
    </div>

    <!-- Crear / editar -->
    <q-dialog
      v-model="showForm"
      persistent
      :maximized="$q.screen.lt.sm"
      transition-show="jump-up"
      transition-hide="jump-down"
    >
      <q-card dark class="ui-dialog wide">
        <div class="ui-dh">
          <div>
            <p class="ui-eyebrow">{{ form.id ? 'Editar' : 'Nuevo' }}</p>
            <h2>{{ form.id ? `Editar pedido #${form.id}` : 'Nuevo pedido' }}</h2>
          </div>
          <button type="button" class="ui-ico" aria-label="Cerrar" @click="showForm = false">
            <q-icon name="close" size="20px" />
          </button>
        </div>

        <q-form class="ui-form" @submit.prevent="guardar">
          <div class="ui-db">
            <div class="ui-two">
              <q-input
                v-model="form.cliente"
                dark
                dense
                outlined
                color="orange-4"
                label="Cliente"
                class="ui-field"
                :rules="[(val: string) => !!val?.trim() || 'El cliente es requerido']"
              />
              <q-input
                v-model="form.telefono"
                dark
                dense
                outlined
                color="orange-4"
                label="Teléfono (opcional)"
                class="ui-field"
              />
            </div>

            <q-input
              v-model="form.fecha_entrega"
              dark
              dense
              outlined
              stack-label
              color="orange-4"
              type="date"
              label="Fecha de entrega"
              class="ui-field"
            />
            <div class="ui-quick">
              <span>Entrega</span>
              <button
                v-for="a in atajosFecha"
                :key="a.label"
                type="button"
                class="ui-pill sm"
                :class="{ on: form.fecha_entrega === fechaEnDias(a.dias) }"
                @click="form.fecha_entrega = fechaEnDias(a.dias)"
              >
                {{ a.label }}
              </button>
            </div>

            <p class="ui-label">Estado</p>
            <div class="ui-states" role="radiogroup" aria-label="Estado del pedido">
              <button
                v-for="e in estados"
                :key="e.value"
                type="button"
                role="radio"
                class="ui-pill sm hue"
                :class="{ on: form.estado === e.value }"
                :aria-checked="form.estado === e.value"
                :style="chipStyle(e.hue)"
                @click="form.estado = e.value"
              >
                <q-icon :name="e.icon" size="16px" /> {{ e.label }}
              </button>
            </div>

            <q-input
              v-model="form.notas"
              dark
              dense
              outlined
              autogrow
              color="orange-4"
              label="Notas (opcional)"
              class="ui-field"
            />

            <div class="ui-sec-head">
              <h3>Productos</h3>
              <button type="button" class="ui-ghost" @click="agregarItem">
                <q-icon name="add" size="18px" /> Agregar
              </button>
            </div>

            <p v-if="recetas.length === 0" class="ui-warn">
              No hay recetas registradas. Crea una receta antes de tomar pedidos.
            </p>

            <transition-group name="pd-row" tag="div" class="pd-rows">
              <div v-for="(item, idx) in form.items" :key="item.uid" class="pd-row">
                <q-select
                  v-model="item.receta_id"
                  dark
                  dense
                  outlined
                  use-input
                  hide-selected
                  fill-input
                  input-debounce="0"
                  color="orange-4"
                  class="ui-field"
                  label="Producto"
                  option-value="id"
                  option-label="nombre"
                  emit-value
                  map-options
                  behavior="menu"
                  popup-content-class="ui-menu"
                  :options="opcionesPara(idx)"
                  :rules="[(val: number | null) => !!val || 'Elige un producto']"
                  @filter="filtrar"
                  @update:model-value="alElegir(idx)"
                >
                  <template #option="{ itemProps, opt }">
                    <q-item v-bind="itemProps">
                      <q-item-section>
                        <q-item-label>{{ opt.nombre }}</q-item-label>
                        <q-item-label caption>Precio: {{ moneda(opt.precio_venta) }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                  <template #no-option>
                    <q-item>
                      <q-item-section class="text-grey-5">Sin resultados</q-item-section>
                    </q-item>
                  </template>
                </q-select>

                <q-field
                  :model-value="item.cantidad"
                  dark
                  dense
                  outlined
                  stack-label
                  color="orange-4"
                  label="Cantidad"
                  class="ui-field pd-qty"
                  :rules="[(val: number) => Number(val) > 0 || (topeFila(idx) === 0 ? 'Sin stock' : 'Mínimo 1')]"
                >
                  <template #prepend>
                    <button
                      type="button"
                      class="pd-step"
                      aria-label="Menos"
                      tabindex="-1"
                      :disabled="item.cantidad <= 1"
                      @click="paso(idx, -1)"
                    >
                      −
                    </button>
                  </template>
                  <template #control>
                    <input
                      class="q-field__native pd-qty-in"
                      inputmode="numeric"
                      maxlength="4"
                      autocomplete="off"
                      :value="item.cantidad > 0 ? item.cantidad : ''"
                      @input="(e: Event) => alEscribir(idx, e)"
                      @blur="alSalir(idx)"
                      @keydown.up.prevent="paso(idx, 1)"
                      @keydown.down.prevent="paso(idx, -1)"
                    />
                  </template>
                  <template #append>
                    <button
                      type="button"
                      class="pd-step"
                      aria-label="Más"
                      tabindex="-1"
                      :disabled="item.cantidad >= topeFila(idx)"
                      @click="paso(idx, 1)"
                    >
                      +
                    </button>
                  </template>
                </q-field>

                <span class="pd-line">{{ moneda(subtotalItem(item)) }}</span>

                <button
                  type="button"
                  class="ui-ico danger"
                  aria-label="Quitar producto"
                  :disabled="form.items.length === 1"
                  @click="quitarItem(idx)"
                >
                  <q-icon name="close" size="18px" />
                </button>

                <p v-if="pista(idx)" class="pd-hint" :class="pista(idx)?.tono">{{ pista(idx)?.txt }}</p>
              </div>
            </transition-group>

            <!-- Totales en vivo -->
            <div class="ui-live" :class="saldoForm > 0.001 ? 'mid' : 'hi'">
              <div class="ui-live-grid">
                <div>
                  <span>Total del pedido</span>
                  <b>{{ moneda(totalForm) }}</b>
                </div>
                <div>
                  <span>Unidades</span>
                  <b>{{ cant(unidadesForm) }}</b>
                </div>
                <div v-if="form.id">
                  <span>Pagado</span>
                  <b>{{ moneda(form.pagado) }}</b>
                </div>
                <div>
                  <span>Saldo</span>
                  <b class="tone">{{ moneda(saldoForm) }}</b>
                </div>
              </div>
              <span v-if="form.id" class="ui-meter">
                <i :style="{ width: pctForm + '%' }"></i>
              </span>
            </div>
          </div>

          <div class="ui-df">
            <button type="button" class="ui-ghost" @click="showForm = false">Cancelar</button>
            <button type="submit" class="ui-cta" :disabled="submitting">
              <q-spinner v-if="submitting" size="18px" color="dark" />
              <span>{{ submitting ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Crear pedido' }}</span>
            </button>
          </div>
        </q-form>
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

interface EstadoInfo {
  value: string;
  label: string;
  hue: number | null;
  icon: string;
}

interface IngredienteReceta {
  inventario_id: number;
  nombre_producto: string;
  cantidad: number;
}

interface Receta {
  id: number;
  nombre: string;
  precio_venta: number;
  ingredientes: IngredienteReceta[];
}

interface RecetaRaw extends Omit<Receta, 'precio_venta' | 'ingredientes'> {
  precio_venta: string | number;
  ingredientes?: { inventario_id: number; nombre_producto: string; cantidad: string | number }[];
}

interface InsumoStock {
  id: number;
  stock: string | number;
}

interface ItemPedido {
  id: number;
  receta_id: number;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
}

interface Pedido {
  id: number;
  cliente: string;
  telefono: string | null;
  fecha_entrega: string | null;
  estado: string;
  notas: string | null;
  total: number;
  pagado: number;
  saldo: number;
  estado_pago: string;
  creado_en: string;
  items: ItemPedido[];
}

interface FilaItem {
  uid: number;
  receta_id: number | null;
  cantidad: number;
}

// Cada estado tiene su matiz (HSL) para chips y filtros
const ESTADOS: EstadoInfo[] = [
  { value: 'pendiente', label: 'Pendiente', hue: 42, icon: 'schedule' },
  { value: 'en_proceso', label: 'En proceso', hue: 270, icon: 'kitchen' },
  { value: 'listo', label: 'Listo', hue: 335, icon: 'check_circle' },
  { value: 'entregado', label: 'Entregado', hue: 145, icon: 'local_shipping' },
  { value: 'cancelado', label: 'Cancelado', hue: 5, icon: 'cancel' },
];
const ACTIVOS = ['pendiente', 'en_proceso', 'listo'];

const ESTADOS_PAGO: Record<string, { label: string; hue: number | null }> = {
  pagado: { label: 'Pagado', hue: 145 },
  parcial: { label: 'Abono', hue: 42 },
  pendiente: { label: 'Sin pago', hue: null },
};

const $q = useQuasar();
const loading = ref(false);
const submitting = ref(false);
const showForm = ref(false);
const pedidos = ref<Pedido[]>([]);
const recetas = ref<Receta[]>([]);
const estados = ESTADOS;

/* Stock actual de cada insumo (para limitar las cantidades del pedido) */
const stock = ref<Record<number, number>>({});
const inventarioListo = ref(false);
const TOPE = 9999;

/* ---------- Búsqueda, filtro y paginación ---------- */
const busqueda = ref('');
const filtroEstado = ref('');
const searchRef = ref<HTMLInputElement | null>(null);
// Por defecto lo más reciente primero
const pagination = ref<{ sortBy: string | null; descending: boolean; page: number; rowsPerPage: number }>({
  sortBy: 'id',
  descending: true,
  page: 1,
  rowsPerPage: 10,
});

const fechaLocalISO = (fecha: Date): string => {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const fechaEnDias = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return fechaLocalISO(d);
};
const atajosFecha = [
  { label: 'Hoy', dias: 0 },
  { label: 'Mañana', dias: 1 },
  { label: 'En 3 días', dias: 3 },
  { label: 'En 1 semana', dias: 7 },
];

const formVacio = () => ({
  id: null as number | null,
  cliente: '',
  telefono: '',
  fecha_entrega: fechaLocalISO(new Date()),
  estado: 'pendiente',
  notas: '',
  pagado: 0,
  estadoOriginal: '',
  original: [] as { receta_id: number; cantidad: number }[],
  items: [] as FilaItem[],
});
let uidSeq = 0;
const nuevaFila = (receta_id: number | null = null, cantidad = 1): FilaItem => ({
  uid: ++uidSeq,
  receta_id,
  cantidad,
});
const form = reactive(formVacio());
form.items = [nuevaFila()];

const columns: QTableColumn[] = [
  { name: 'id', label: '#', field: 'id', align: 'left', sortable: true },
  { name: 'cliente', label: 'Cliente', field: 'cliente', align: 'left', sortable: true },
  { name: 'fecha_entrega', label: 'Entrega', field: 'fecha_entrega', align: 'left', sortable: true },
  { name: 'items', label: 'Productos', field: (row: Pedido) => row.items.length, align: 'left' },
  { name: 'total', label: 'Total', field: 'total', align: 'right', sortable: true },
  { name: 'estado_pago', label: 'Pago', field: 'estado_pago', align: 'left', sortable: true },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'left', sortable: true },
  { name: 'creado_en', label: 'Creado', field: 'creado_en', align: 'left', sortable: true },
  { name: 'actions', label: '', field: 'id', align: 'right' },
];

/* ---------- Formato y cálculos ---------- */
const moneda = (valor: number): string => `$${(Number.isFinite(Number(valor)) ? Number(valor) : 0).toFixed(2)}`;
const cant = (n: number): string => String(Math.round(Number(n) * 1000) / 1000);

const fechaBonita = (iso: string): string => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

const fechaHora = (valor: string): string =>
  new Date(valor).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });

const estadoInfo = (valor: string): EstadoInfo =>
  estados.find((e) => e.value === valor) ?? { value: valor, label: valor, hue: null, icon: 'help_outline' };

const pagoInfo = (valor: string): { label: string; hue: number | null } =>
  ESTADOS_PAGO[valor] ?? { label: valor, hue: null };

const chipStyle = (hue: number | null): Record<string, string> => (hue === null ? {} : { '--h': String(hue) });

const pctPago = (p: Pedido): number => (p.total > 0 ? Math.min(100, Math.max(0, (p.pagado / p.total) * 100)) : 0);

const diasHasta = (iso: string): number => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  const objetivo = new Date(Number(y), Number(m) - 1, Number(d));
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((objetivo.getTime() - hoy.getTime()) / 86400000);
};

// Texto de entrega con urgencia (solo para pedidos aún en curso)
const entrega = (p: Pedido): { texto: string; sub: string | null; tono: string } => {
  if (!p.fecha_entrega) return { texto: '—', sub: null, tono: '' };
  const fecha = fechaBonita(p.fecha_entrega);
  if (!ACTIVOS.includes(p.estado)) return { texto: fecha, sub: null, tono: 'off' };
  const d = diasHasta(p.fecha_entrega);
  if (d < 0) return { texto: 'Vencido', sub: `${fecha} · hace ${-d} d`, tono: 'tarde' };
  if (d === 0) return { texto: 'Hoy', sub: fecha, tono: 'hoy' };
  if (d === 1) return { texto: 'Mañana', sub: fecha, tono: 'pronto' };
  return { texto: fecha, sub: `en ${d} días`, tono: '' };
};

const conteoEstado = (valor: string): number => pedidos.value.filter((p) => p.estado === valor).length;

const pedidosFiltrados = computed<Pedido[]>(() => {
  const q = busqueda.value.trim().toLowerCase().replace(/^#/, '');
  return pedidos.value.filter((p) => {
    if (filtroEstado.value && p.estado !== filtroEstado.value) return false;
    if (!q) return true;
    return (
      p.cliente.toLowerCase().includes(q) ||
      (p.telefono ?? '').toLowerCase().includes(q) ||
      String(p.id) === q ||
      p.items.some((i) => i.nombre.toLowerCase().includes(q))
    );
  });
});

const etiquetaPag = (first: number, last: number, total: number): string => `${first}–${last} de ${total}`;

const limpiarFiltros = (): void => {
  busqueda.value = '';
  filtroEstado.value = '';
};
watch([busqueda, filtroEstado], () => {
  pagination.value = { ...pagination.value, page: 1 };
});

/* ---------- Resumen con conteo animado ---------- */
const stats = computed(() => {
  const hoy = fechaLocalISO(new Date());
  const activos = pedidos.value.filter((p) => ACTIVOS.includes(p.estado));
  const cobrar = pedidos.value
    .filter((p) => p.estado !== 'cancelado')
    .reduce((acc, p) => acc + Math.max(Number(p.saldo), 0), 0);
  return {
    total: pedidos.value.length,
    curso: activos.length,
    hoy: activos.filter((p) => p.fecha_entrega?.slice(0, 10) === hoy).length,
    cobrar,
  };
});

const shown = reactive({ total: 0, curso: 0, hoy: 0, cobrar: 0 });
const claves = ['total', 'curso', 'hoy', 'cobrar'] as const;
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
const recetaDe = (id: number | null): Receta | undefined => recetas.value.find((r) => r.id === id);

const subtotalItem = (item: FilaItem): number => {
  if (item.receta_id === null) return 0;
  return (recetaDe(item.receta_id)?.precio_venta ?? 0) * (Number(item.cantidad) || 0);
};

const totalForm = computed(() => form.items.reduce((acc, item) => acc + subtotalItem(item), 0));
const unidadesForm = computed(() => form.items.reduce((acc, i) => acc + (Number(i.cantidad) || 0), 0));
const saldoForm = computed(() => Math.max(totalForm.value - (form.id ? form.pagado : 0), 0));
const pctForm = computed(() =>
  totalForm.value > 0 ? Math.min(100, (form.pagado / totalForm.value) * 100) : 0,
);

/* Selector de productos con búsqueda; no deja repetir recetas */
const filtroTxt = ref('');
const filtrar = (val: string, update: (cb: () => void) => void): void => {
  update(() => {
    filtroTxt.value = val.trim().toLowerCase();
  });
};
const opcionesPara = (idx: number): Receta[] => {
  const usadas = new Set(
    form.items
      .filter((_, i) => i !== idx)
      .map((f) => f.receta_id)
      .filter((v): v is number => v !== null),
  );
  return recetas.value.filter(
    (r) => !usadas.has(r.id) && (!filtroTxt.value || r.nombre.toLowerCase().includes(filtroTxt.value)),
  );
};

/* ---------- Cantidades limitadas por el inventario ---------- */
const consumoPorInsumo = (filas: FilaItem[]): Map<number, number> => {
  const m = new Map<number, number>();
  for (const f of filas) {
    const r = recetaDe(f.receta_id);
    if (!r) continue;
    for (const ing of r.ingredientes) {
      m.set(ing.inventario_id, (m.get(ing.inventario_id) ?? 0) + ing.cantidad * (Number(f.cantidad) || 0));
    }
  }
  return m;
};

// Al editar, lo que este pedido ya descontó vuelve a estar disponible para él
const devuelto = computed(() => {
  const m = new Map<number, number>();
  if (!form.id || form.estadoOriginal === 'cancelado') return m;
  for (const o of form.original) {
    const r = recetaDe(o.receta_id);
    if (!r) continue;
    for (const ing of r.ingredientes) {
      m.set(ing.inventario_id, (m.get(ing.inventario_id) ?? 0) + ing.cantidad * o.cantidad);
    }
  }
  return m;
});

// Cuántas unidades de ese producto alcanzan con el stock restante, y qué insumo es el que limita
const capacidad = (idx: number): { max: number | null; limita: string } => {
  const receta = recetaDe(form.items[idx]?.receta_id ?? null);
  if (!receta || !inventarioListo.value || receta.ingredientes.length === 0) return { max: null, limita: '' };
  const otros = consumoPorInsumo(form.items.filter((_, i) => i !== idx));
  let max = Infinity;
  let limita = '';
  for (const ing of receta.ingredientes) {
    if (ing.cantidad <= 0) continue;
    const disponible =
      (stock.value[ing.inventario_id] ?? 0) + (devuelto.value.get(ing.inventario_id) ?? 0) - (otros.get(ing.inventario_id) ?? 0);
    const n = Math.floor(Math.max(disponible, 0) / ing.cantidad + 1e-9);
    if (n < max) {
      max = n;
      limita = ing.nombre_producto;
    }
  }
  return { max: Number.isFinite(max) ? max : null, limita };
};

const topeFila = (idx: number): number => {
  const c = capacidad(idx).max;
  return c === null ? TOPE : Math.min(c, TOPE);
};

const soloEntero = (v: string | number | null): number => {
  const n = parseInt(String(v ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};

const setCantidad = (idx: number, v: string | number | null): void => {
  const item = form.items[idx];
  if (!item) return;
  item.cantidad = Math.min(soloEntero(v), topeFila(idx));
  // Si esta fila gasta más insumos, las demás pueden quedar con menos disponible
  form.items.forEach((otro, j) => {
    if (j !== idx) otro.cantidad = Math.min(Number(otro.cantidad) || 0, topeFila(j));
  });
};

// Escribe solo dígitos y recorta al tope; el cuadro siempre muestra el valor real
const alEscribir = (idx: number, e: Event): void => {
  const el = e.target as HTMLInputElement;
  setCantidad(idx, el.value);
  const item = form.items[idx];
  el.value = item && item.cantidad > 0 ? String(item.cantidad) : '';
};

const paso = (idx: number, delta: number): void => {
  const item = form.items[idx];
  if (!item) return;
  setCantidad(idx, Math.max(1, (Number(item.cantidad) || 0) + delta));
};

const alSalir = (idx: number): void => {
  const item = form.items[idx];
  if (item && item.cantidad < 1 && topeFila(idx) >= 1) item.cantidad = 1;
};

const alElegir = async (idx: number): Promise<void> => {
  await nextTick();
  const item = form.items[idx];
  if (item && item.cantidad < 1) item.cantidad = 1;
  form.items.forEach((_, j) => setCantidad(j, form.items[j]?.cantidad ?? 0));
};

const pista = (idx: number): { txt: string; tono: string } | null => {
  const item = form.items[idx];
  const { max, limita } = capacidad(idx);
  if (!item || max === null) return null;
  if (max === 0) return { txt: `Sin stock suficiente: falta ${limita}`, tono: 'bad' };
  if (item.cantidad >= max) return { txt: `Máximo disponible: ${max} (limita ${limita})`, tono: 'warn' };
  return { txt: `Se pueden preparar hasta ${max} · limita ${limita}`, tono: '' };
};

const notifyError = (error: unknown, fallback: string): void => {
  const err = error as AxiosError<{ mensaje?: string; error?: string; faltantes?: { nombre_producto: string }[] }>;
  const base = err.response?.data?.error || err.response?.data?.mensaje || fallback;
  const faltan = err.response?.data?.faltantes?.map((f) => f.nombre_producto).join(', ');
  $q.notify({
    type: 'negative',
    message: faltan && !base.includes(faltan) ? `${base}: ${faltan}` : base,
    ...(err.response ? {} : { caption: 'No se pudo conectar con el servidor' }),
  });
};

/* ---------- API ---------- */
const cargarPedidos = async (): Promise<void> => {
  loading.value = true;
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
  } finally {
    loading.value = false;
  }
};

const cargarRecetas = async (): Promise<void> => {
  try {
    const { data } = await api.get<RecetaRaw[]>('/recetas');
    recetas.value = data.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      precio_venta: Number(r.precio_venta),
      ingredientes: (r.ingredientes ?? []).map((i) => ({
        inventario_id: i.inventario_id,
        nombre_producto: i.nombre_producto,
        cantidad: Number(i.cantidad),
      })),
    }));
  } catch (error) {
    notifyError(error, 'Error al cargar las recetas.');
  }
};

const cargarStock = async (): Promise<void> => {
  try {
    const { data } = await api.get<InsumoStock[]>('/inventario');
    stock.value = Object.fromEntries(data.map((i) => [i.id, Number(i.stock)]));
    inventarioListo.value = true;
  } catch {
    // Sin inventario no se puede calcular el tope: el servidor sigue validando
    inventarioListo.value = false;
  }
};

const abrirNuevo = (): void => {
  Object.assign(form, formVacio());
  form.items = [nuevaFila()];
  showForm.value = true;
  void cargarStock(); // stock al día cada vez que se abre el formulario
};

const abrirEditar = (pedido: Pedido): void => {
  Object.assign(form, {
    id: pedido.id,
    cliente: pedido.cliente,
    telefono: pedido.telefono ?? '',
    fecha_entrega: pedido.fecha_entrega?.slice(0, 10) ?? '',
    estado: pedido.estado,
    notas: pedido.notas ?? '',
    pagado: Number(pedido.pagado),
    estadoOriginal: pedido.estado,
    original: pedido.items.map((i) => ({ receta_id: i.receta_id, cantidad: Number(i.cantidad) })),
    items: pedido.items.map((i) => nuevaFila(i.receta_id, Number(i.cantidad))),
  });
  showForm.value = true;
  void cargarStock();
};

const agregarItem = (): void => {
  form.items.push(nuevaFila());
};

const quitarItem = (idx: number): void => {
  form.items.splice(idx, 1);
};

/* Resalta la fila guardada un momento y la deja a la vista */
const resaltado = ref<number | null>(null);
let temporizador = 0;
const resaltar = async (id: number): Promise<void> => {
  resaltado.value = id;
  window.clearTimeout(temporizador);
  temporizador = window.setTimeout(() => {
    resaltado.value = null;
  }, 2600);
  await nextTick();
  document.querySelector('.ui-tr.flash')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

/* Un pedido nuevo aparece arriba: se quitan filtros, se ordena por más reciente y se va a la primera página */
const irAlNuevo = async (id: number): Promise<void> => {
  limpiarFiltros();
  await nextTick();
  pagination.value = { ...pagination.value, sortBy: 'id', descending: true, page: 1 };
  await resaltar(id);
};

const guardar = async (): Promise<void> => {
  if (form.items.some((i) => !i.receta_id)) {
    $q.notify({ type: 'warning', message: 'Elige un producto en cada fila' });
    return;
  }
  const ids = form.items.map((i) => i.receta_id);
  if (new Set(ids).size !== ids.length) {
    $q.notify({ type: 'warning', message: 'Hay un producto repetido en el pedido' });
    return;
  }
  for (let idx = 0; idx < form.items.length; idx++) {
    const item = form.items[idx];
    if (!item) continue;
    const nombre = recetaDe(item.receta_id)?.nombre ?? 'el producto';
    const { max, limita } = capacidad(idx);
    if (!Number.isInteger(Number(item.cantidad)) || item.cantidad < 1) {
      $q.notify({
        type: 'warning',
        message: max === 0 ? `Sin stock suficiente para ${nombre}: falta ${limita}` : `Indica la cantidad de ${nombre}`,
      });
      return;
    }
    if (max !== null && item.cantidad > max) {
      $q.notify({ type: 'warning', message: `Solo alcanza para ${max} de ${nombre} (limita ${limita})` });
      return;
    }
  }

  submitting.value = true;
  const payload = {
    cliente: form.cliente.trim(),
    telefono: form.telefono || null,
    fecha_entrega: form.fecha_entrega || null,
    estado: form.estado,
    notas: form.notas || null,
    items: form.items.map((i) => ({ receta_id: i.receta_id, cantidad: Number(i.cantidad) })),
  };
  const idsPrevios = new Set(pedidos.value.map((p) => p.id));

  try {
    if (form.id) {
      await api.put(`/pedidos/${form.id}`, payload);
      $q.notify({ type: 'positive', message: 'Pedido actualizado' });
    } else {
      await api.post('/pedidos', payload);
      $q.notify({ type: 'positive', message: 'Pedido creado exitosamente' });
    }
    const editado = form.id;
    showForm.value = false;
    await cargarPedidos();
    if (editado) {
      await resaltar(editado);
    } else {
      const nuevo = pedidos.value.find((p) => !idsPrevios.has(p.id));
      if (nuevo) await irAlNuevo(nuevo.id);
    }
  } catch (error) {
    notifyError(error, 'No se pudo guardar el pedido');
  } finally {
    submitting.value = false;
  }
};

const cambiarEstado = async (pedido: Pedido, estado: string): Promise<void> => {
  try {
    await api.patch(`/pedidos/${pedido.id}/estado`, { estado });
    $q.notify({ type: 'positive', message: 'Estado actualizado' });
    await cargarPedidos();
    await resaltar(pedido.id);
  } catch (error) {
    notifyError(error, 'No se pudo cambiar el estado');
  }
};

const intentarEliminar = (pedido: Pedido): void => {
  if (pedido.pagado > 0) {
    $q.notify({ type: 'warning', message: 'Tiene pagos registrados: elimínalos primero' });
    return;
  }
  confirmDelete(pedido);
};

const confirmDelete = (pedido: Pedido): void => {
  $q.dialog({
    title: 'Eliminar pedido',
    message: `¿Seguro que deseas eliminar el pedido de "${pedido.cliente}"?`,
    dark: true,
    cancel: { label: 'Cancelar', flat: true, color: 'grey-4' },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true },
    persistent: true,
  }).onOk(() => {
    void eliminar(pedido.id);
  });
};

const eliminar = async (id: number): Promise<void> => {
  try {
    await api.delete(`/pedidos/${id}`);
    $q.notify({ type: 'positive', message: 'Pedido eliminado correctamente' });
    await cargarPedidos();
  } catch (error) {
    notifyError(error, 'No se pudo eliminar el pedido');
  }
};

/* Atajo: "/" enfoca el buscador */
const atajo = (e: KeyboardEvent): void => {
  const t = e.target as HTMLElement | null;
  const escribiendo = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  if (e.key === '/' && !escribiendo && !showForm.value) {
    e.preventDefault();
    searchRef.value?.focus();
  }
};

onMounted(() => {
  window.addEventListener('keydown', atajo);
  void cargarPedidos();
  void cargarRecetas();
  void cargarStock();
});

onUnmounted(() => {
  window.removeEventListener('keydown', atajo);
  cancelAnimationFrame(raf);
  window.clearTimeout(temporizador);
});
</script>

<style>
/* ---------- Específico de Pedidos ---------- */

/* Quasar reserva la clase "sm" para ocultar elementos según el ancho de pantalla
   (se ve solo entre 600 y 1023 px). Estos botones la usan como "tamaño pequeño",
   así que se fuerza a mostrarlos siempre. */
.ui-pill.sm,
.ui-chip.sm {
  display: inline-flex !important;
}
.pd-due {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pd-due b {
  font-weight: 650;
}
.pd-due small {
  font-size: 12px;
  color: var(--mute);
}
.pd-due.off b {
  font-weight: 400;
  color: var(--mute);
}
.pd-due.hoy b {
  color: var(--accent);
}
.pd-due.pronto b {
  color: var(--mid);
}
.pd-due.tarde b {
  color: var(--neg);
}

.pd-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13.5px;
}

.pd-pago {
  --tone: var(--mute);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-width: 110px;
}
.pd-pago.pagado {
  --tone: var(--hi);
}
.pd-pago.parcial {
  --tone: var(--mid);
}
.pd-pago small {
  font-size: 12px;
}

/* Filas de productos del formulario */
.pd-rows {
  position: relative;
}
.pd-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px 84px 34px;
  gap: 10px;
  align-items: flex-start;
}
.pd-line {
  margin-top: 8px;
  text-align: right;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  color: var(--accent);
}
.pd-row .ui-ico {
  margin-top: 3px;
}
.pd-row .ui-ico:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
/* Selector de cantidad con − y + */
.pd-qty .q-field__prepend,
.pd-qty .q-field__append {
  padding: 0;
}
.pd-qty-in {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.pd-step {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink, #f7efe6);
  font: 600 18px/1 'IBM Plex Sans', sans-serif;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}
.pd-step:hover:not(:disabled) {
  background: rgba(255, 176, 103, 0.18);
  color: var(--accent, #ffb067);
}
.pd-step:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Aviso de disponibilidad bajo cada producto */
.pd-hint {
  grid-column: 1 / -1;
  margin: -4px 0 10px;
  font-size: 12px;
  color: var(--mute, rgba(247, 239, 230, 0.62));
}
.pd-hint.warn {
  color: var(--mid, #f2c27a);
}
.pd-hint.bad {
  color: var(--lo, #f0a898);
}

.pd-row-enter-active,
.pd-row-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.pd-row-enter-from,
.pd-row-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
.pd-row-leave-active {
  display: none;
}

@media (max-width: 600px) {
  .pd-row {
    grid-template-columns: minmax(0, 1fr) 130px 34px;
  }
  .pd-line {
    display: none;
  }
}
</style>
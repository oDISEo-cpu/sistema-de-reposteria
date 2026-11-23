<template>
  <q-page class="iv-page">
    <div class="iv-wrap">
      <!-- Encabezado -->
      <header class="iv-head iv-rise">
        <div>
          <p class="iv-eyebrow">Insumos</p>
          <h1 class="iv-title">Inventario</h1>
          <p class="iv-sub">Control de insumos, stock y costos en un solo lugar.</p>
        </div>
        <div class="iv-head-acts">
          <button
            type="button"
            class="iv-buy"
            :class="{ alert: listaCompras.length > 0 }"
            :aria-disabled="listaCompras.length === 0"
            @click="abrirCompras"
          >
            <q-icon name="shopping_cart" size="20px" />
            <span>Lista de compras</span>
            <b>{{ listaCompras.length }}</b>
            <q-tooltip v-if="listaCompras.length === 0">
              Ningún producto está por debajo de su stock mínimo
            </q-tooltip>
          </button>
          <button type="button" class="iv-cta" @click="abrirNuevo">
            <q-icon name="add" size="20px" />
            <span>Nuevo producto</span>
          </button>
        </div>
      </header>

      <!-- Resumen -->
      <section class="iv-stats iv-rise" style="--d: 80ms" aria-label="Resumen">
        <div class="iv-stat">
          <span class="iv-stat-ico t-accent"><q-icon name="inventory_2" size="22px" /></span>
          <div class="iv-stat-body">
            <span class="iv-stat-k">Productos</span>
            <span class="iv-stat-v">{{ Math.round(shown.total) }}</span>
            <span class="iv-stat-h">registrados</span>
          </div>
        </div>
        <div class="iv-stat" :class="{ alert: stats.bajo > 0 }">
          <span class="iv-stat-ico" :class="stats.bajo > 0 ? 't-warn' : 't-good'">
            <q-icon :name="stats.bajo > 0 ? 'warning_amber' : 'check_circle'" size="22px" />
          </span>
          <div class="iv-stat-body">
            <span class="iv-stat-k">Por reponer</span>
            <span class="iv-stat-v">{{ Math.round(shown.bajo) }}</span>
            <span class="iv-stat-h">{{ stats.bajo > 0 ? 'en o bajo su mínimo' : 'todo en orden' }}</span>
          </div>
        </div>
        <div class="iv-stat">
          <span class="iv-stat-ico t-pink"><q-icon name="payments" size="22px" /></span>
          <div class="iv-stat-body">
            <span class="iv-stat-k">Valor del inventario</span>
            <span class="iv-stat-v">{{ money(shown.valor) }}</span>
            <span class="iv-stat-h">en existencias</span>
          </div>
        </div>
        <div class="iv-stat">
          <span class="iv-stat-ico t-amber"><q-icon name="request_quote" size="22px" /></span>
          <div class="iv-stat-body">
            <span class="iv-stat-k">Reponer costaría</span>
            <span class="iv-stat-v">{{ money(shown.compra) }}</span>
            <span class="iv-stat-h">estimado de la lista</span>
          </div>
        </div>
      </section>

      <!-- Herramientas -->
      <section class="iv-tools iv-rise" style="--d: 140ms">
        <label class="iv-search">
          <q-icon name="search" size="20px" />
          <input
            ref="searchRef"
            v-model="busqueda"
            type="search"
            placeholder="Buscar producto o categoría…  ( / )"
            autocomplete="off"
            spellcheck="false"
          />
        </label>

        <div class="iv-seg" role="group" aria-label="Filtrar por estado">
          <button
            v-for="e in estados"
            :key="e.id"
            type="button"
            class="iv-pill"
            :class="{ on: estado === e.id }"
            @click="estado = e.id"
          >
            {{ e.label }}<b>{{ conteoEstado(e.id) }}</b>
          </button>
        </div>
      </section>

      <!-- Categorías -->
      <section v-if="resumenCats.length > 1" class="iv-cats iv-rise" style="--d: 180ms" aria-label="Categorías">
        <button type="button" class="iv-cat" :class="{ on: catFiltro === '' }" @click="catFiltro = ''">
          Todas <b>{{ inventoryList.length }}</b>
        </button>
        <button
          v-for="c in resumenCats"
          :key="c.nombre"
          type="button"
          class="iv-cat"
          :class="{ on: catFiltro === c.nombre }"
          :style="tonoCat(c.nombre)"
          @click="catFiltro = catFiltro === c.nombre ? '' : c.nombre"
        >
          <i class="iv-dot" :class="{ neutral: esNeutra(c.nombre) }"></i>
          {{ c.nombre }} <b>{{ c.n }}</b>
        </button>
      </section>

      <!-- Cargando -->
      <div v-if="loading && inventoryList.length === 0" class="iv-skel"></div>

      <!-- Sin productos -->
      <div v-else-if="!loading && inventoryList.length === 0" class="iv-empty iv-rise">
        <div class="iv-empty-ico"><q-icon name="inventory_2" size="40px" /></div>
        <h2>Aún no tienes productos</h2>
        <p>Registra tus insumos con su stock y costo; las recetas los usan para calcular el margen.</p>
        <button type="button" class="iv-cta" @click="abrirNuevo">
          <q-icon name="add" size="20px" />
          <span>Registrar producto</span>
        </button>
      </div>

      <!-- Tabla -->
      <q-table
        v-else
        v-model:pagination="pagination"
        class="iv-table iv-rise"
        style="--d: 200ms"
        flat
        :rows="filas"
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
            class="iv-row"
            :class="[tono(props.row), { flash: props.row.id === resaltado }]"
            :style="{ '--i': Math.min(props.pageIndex, 12) }"
          >
            <q-td key="nombre_producto" :props="props">
              <span class="iv-name">{{ props.row.nombre_producto }}</span>
            </q-td>

            <q-td key="categoria" :props="props">
              <button
                type="button"
                class="iv-chip"
                :class="{ neutral: esNeutra(props.row.categoria) }"
                :style="tonoCat(props.row.categoria)"
                @click="catFiltro = props.row.categoria"
              >
                {{ props.row.categoria }}
                <q-tooltip>Ver solo esta categoría</q-tooltip>
              </button>
            </q-td>

            <q-td key="stock" :props="props">
              <div class="iv-stock">
                <div class="iv-stock-top">
                  <span class="iv-stock-n">
                    {{ cant(props.row.stock) }} <small>{{ props.row.unidad_medida }}</small>
                  </span>
                  <span v-if="esBajo(props.row)" class="iv-tag">Reponer</span>
                </div>
                <span class="iv-meter"><i :style="{ width: nivel(props.row) + '%' }"></i></span>
              </div>
            </q-td>

            <q-td key="stock_minimo" :props="props" class="iv-mute">
              {{ cant(props.row.stock_minimo) }} {{ props.row.unidad_medida }}
            </q-td>

            <q-td key="precio_unitario" :props="props" class="iv-num">
              {{ money(props.row.precio_unitario) }}
            </q-td>

            <q-td key="valor" :props="props" class="iv-num iv-strong">
              {{ money(props.row.stock * props.row.precio_unitario) }}
            </q-td>

            <q-td key="actions" :props="props">
              <div class="iv-acts">
                <button type="button" class="iv-ico" aria-label="Editar" @click="abrirEditar(props.row)">
                  <q-icon name="edit" size="18px" />
                  <q-tooltip>Editar / reponer</q-tooltip>
                </button>
                <button type="button" class="iv-ico danger" aria-label="Eliminar" @click="confirmDelete(props.row)">
                  <q-icon name="delete" size="18px" />
                  <q-tooltip>Eliminar</q-tooltip>
                </button>
              </div>
            </q-td>
          </q-tr>
        </template>

        <template #no-data>
          <div class="iv-nodata">
            <q-icon name="search_off" size="34px" />
            <span>Nada coincide con tu búsqueda</span>
            <button type="button" class="iv-ghost" @click="limpiarFiltros">Quitar filtros</button>
          </div>
        </template>
      </q-table>

      <!-- Recetas sugeridas según el inventario -->
      <section v-if="inventoryList.length > 0" class="iv-rec iv-rise" style="--d: 260ms" aria-label="Recetas sugeridas">
        <div class="iv-rec-head">
          <div>
            <p class="iv-eyebrow">Sugerencias</p>
            <h2 class="iv-rec-title">¿Qué puedo preparar hoy?</h2>
            <p class="iv-sub">{{ resumenRecetas }}</p>
          </div>
          <div class="iv-seg" role="group" aria-label="Filtrar recetas">
            <button
              v-for="f in filtrosRec"
              :key="f.id"
              type="button"
              class="iv-pill"
              :class="{ on: recFiltro === f.id }"
              @click="recFiltro = f.id"
            >
              {{ f.label }}<b>{{ f.n }}</b>
            </button>
          </div>
        </div>

        <p v-if="pista" class="iv-hint">
          <q-icon name="lightbulb" size="18px" />
          <span>{{ pista }}</span>
        </p>

        <div v-if="recetasVista.length" class="iv-rec-grid">
          <article
            v-for="(r, k) in recetasVista"
            :key="r.id"
            class="iv-rcard"
            :class="r.estado"
            :style="{ '--d': Math.min(k, 8) * 45 + 'ms' }"
          >
            <div class="iv-rcard-top">
              <span class="iv-remoji" aria-hidden="true">{{ r.emoji }}</span>
              <div class="iv-rcard-id">
                <h3>{{ r.nombre }}</h3>
                <span>{{ r.rinde }}</span>
              </div>
              <span class="iv-rbadge" :class="r.estado">{{ etiquetaEstado(r) }}</span>
            </div>

            <div v-if="r.estado === 'lista'" class="iv-rmetrics">
              <div>
                <span>Alcanza para</span>
                <b>
                  {{ r.tandas ?? '✓' }}
                  <small v-if="r.tandas !== null">{{ r.tandas === 1 ? 'tanda' : 'tandas' }}</small>
                </b>
              </div>
              <div>
                <span>Costo por tanda</span>
                <b>≈ {{ money(r.costo) }}</b>
              </div>
              <div>
                <span>Por porción</span>
                <b>≈ {{ money(r.costo / r.porciones) }}</b>
              </div>
            </div>
            <p v-else class="iv-rmiss">{{ textoFalta(r) }}</p>

            <ul class="iv-ings" aria-label="Ingredientes">
              <li v-for="g in r.ings" :key="g.clave" class="iv-ing" :class="[g.estado, { opt: g.opcional }]">
                <q-icon :name="iconoIng(g.estado)" size="14px" />
                {{ g.label }}
                <q-tooltip>{{ g.detalle }}</q-tooltip>
              </li>
            </ul>
          </article>
        </div>
        <p v-else class="iv-rnone">No hay recetas en esta categoría por ahora.</p>

        <div v-if="baseRec.length > LIMITE_REC" class="iv-rec-more">
          <button type="button" class="iv-ghost" @click="verTodas = !verTodas">
            <q-icon :name="verTodas ? 'expand_less' : 'expand_more'" size="18px" />
            {{ verTodas ? 'Ver menos' : `Ver las ${baseRec.length} recetas` }}
          </button>
        </div>

        <p class="iv-note">
          Recetas clásicas con cantidades orientativas. Se comparan con los nombres de tus insumos; sal, agua y otros
          ingredientes de despensa no se cuentan. El costo usa el costo unitario de tu inventario.
        </p>
      </section>
    </div>

    <!-- Crear / editar -->
    <q-dialog
      v-model="showForm"
      persistent
      :maximized="$q.screen.lt.sm"
      transition-show="jump-up"
      transition-hide="jump-down"
    >
      <q-card class="iv-dialog">
        <div class="iv-dh">
          <div>
            <p class="iv-eyebrow">{{ form.id ? 'Editar' : 'Nuevo' }}</p>
            <h2>{{ form.id ? 'Editar producto' : 'Nuevo producto' }}</h2>
          </div>
          <button type="button" class="iv-ico" aria-label="Cerrar" @click="showForm = false">
            <q-icon name="close" size="20px" />
          </button>
        </div>

        <q-form class="iv-form" @submit.prevent="guardar">
          <div class="iv-db">
            <q-input
              v-model="form.nombre_producto"
              dense
              outlined
              label="Nombre del producto"
              class="iv-field"
              :rules="[(val: string) => !!val?.trim() || 'El nombre es requerido']"
            />

            <div class="iv-two">
              <q-select
                v-model="form.categoria"
                dense
                outlined
                options-dense
                label="Categoría"
                class="iv-field"
                behavior="menu"
                popup-content-class="iv-menu"
                :options="categorias"
                :rules="[(val: string) => !!val || 'Requerida']"
              >
                <template #option="{ itemProps, opt }">
                  <q-item v-bind="itemProps">
                    <q-item-section avatar class="iv-opt-dot">
                      <i class="iv-dot" :class="{ neutral: esNeutra(opt) }" :style="tonoCat(opt)"></i>
                    </q-item-section>
                    <q-item-section>{{ opt }}</q-item-section>
                  </q-item>
                </template>
              </q-select>

              <q-select
                v-model="form.unidad_medida"
                dense
                outlined
                options-dense
                label="Unidad de medida"
                class="iv-field"
                behavior="menu"
                popup-content-class="iv-menu"
                :options="unidades"
                :rules="[(val: string) => !!val || 'Requerida']"
              />
            </div>

            <div class="iv-three">
              <q-input
                v-model.number="form.stock"
                dense
                outlined
                label="Stock actual"
                type="number"
                min="0"
                step="any"
                class="iv-field"
                :suffix="form.unidad_medida"
                :rules="[(val: number) => val >= 0 || 'No negativo']"
              />
              <q-input
                v-model.number="form.stock_minimo"
                dense
                outlined
                label="Stock mínimo"
                type="number"
                min="0"
                step="any"
                class="iv-field"
                :suffix="form.unidad_medida"
                :rules="[(val: number) => val >= 0 || 'No negativo']"
              />
              <q-input
                v-model.number="form.precio_unitario"
                dense
                outlined
                label="Costo unit. ($)"
                type="number"
                min="0"
                step="any"
                prefix="$"
                class="iv-field"
                :rules="[(val: number) => val >= 0 || 'No negativo']"
              />
            </div>

            <!-- Vista previa en vivo -->
            <div class="iv-live" :class="tonoDe(Number(form.stock) || 0, Number(form.stock_minimo) || 0)">
              <div class="iv-live-grid">
                <div>
                  <span>Valor en existencias</span>
                  <b>{{ money(valorForm) }}</b>
                </div>
                <div>
                  <span>Estado</span>
                  <b class="iv-live-estado">{{ estadoTexto }}</b>
                </div>
              </div>
              <span class="iv-meter">
                <i :style="{ width: nivelDe(Number(form.stock) || 0, Number(form.stock_minimo) || 0) + '%' }"></i>
              </span>
            </div>
          </div>

          <div class="iv-df">
            <button type="button" class="iv-ghost" @click="showForm = false">Cancelar</button>
            <button type="submit" class="iv-cta" :disabled="submitting">
              <q-spinner v-if="submitting" size="18px" color="white" />
              <span>{{ submitting ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Crear producto' }}</span>
            </button>
          </div>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Lista de compras -->
    <q-dialog
      v-model="showCompras"
      :maximized="$q.screen.lt.sm"
      transition-show="jump-up"
      transition-hide="jump-down"
    >
      <q-card class="iv-dialog wide">
        <div class="iv-dh">
          <div>
            <p class="iv-eyebrow">Reposición</p>
            <h2>Lista de compras</h2>
          </div>
          <button type="button" class="iv-ico" aria-label="Cerrar" @click="showCompras = false">
            <q-icon name="close" size="20px" />
          </button>
        </div>
        <p class="iv-dsub">Insumos que están en o por debajo de su stock mínimo.</p>

        <div class="iv-scroll">
          <table class="iv-ctab">
            <thead>
              <tr>
                <th>Producto</th>
                <th class="r">Stock</th>
                <th class="r">Mínimo</th>
                <th class="r">Faltante</th>
                <th class="r">Costo est.</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in listaCompras" :key="i.id">
                <td>{{ i.nombre_producto }}</td>
                <td class="r">{{ cant(i.stock) }} {{ i.unidad_medida }}</td>
                <td class="r">{{ cant(i.stock_minimo) }} {{ i.unidad_medida }}</td>
                <td class="r iv-falta">{{ cant(faltante(i)) }} {{ i.unidad_medida }}</td>
                <td class="r">{{ money(faltante(i) * i.precio_unitario) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="iv-df between">
          <div class="iv-total">
            <span>Total estimado</span>
            <b>{{ money(totalCompras) }}</b>
          </div>
          <div class="iv-df-btns">
            <button type="button" class="iv-ghost" @click="copiarLista">
              <q-icon name="content_copy" size="18px" /> Copiar lista
            </button>
            <button type="button" class="iv-cta" @click="showCompras = false">Listo</button>
          </div>
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar, copyToClipboard, type QTableColumn } from 'quasar';
import { api } from '../../boot/axios';
import type { AxiosError } from 'axios';

interface InventoryItem {
  id: number;
  nombre_producto: string;
  categoria: string;
  stock: number;
  unidad_medida: string;
  precio_unitario: number;
  stock_minimo: number;
}

// PostgreSQL devuelve los NUMERIC como texto, por eso se convierten
interface InventoryRaw {
  id: number;
  nombre_producto: string;
  categoria: string;
  stock: string | number;
  unidad_medida: string;
  precio_unitario: string | number;
  stock_minimo?: string | number | null;
}

type Estado = 'todos' | 'bajo' | 'ok';
type Tono = 'hi' | 'mid' | 'lo';

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const loading = ref(false);
const submitting = ref(false);
const inventoryList = ref<InventoryItem[]>([]);
const showForm = ref(false);
const showCompras = ref(false);

const categorias = [
  'Harinas',
  'Azúcares',
  'Lácteos y huevos',
  'Grasas',
  'Frutas',
  'Chocolates',
  'Leudantes y esencias',
  'Decoración',
  'Empaques',
  'Otros',
];
const unidades = ['kg', 'g', 'l', 'ml', 'unidad', 'paquete'];

// Productos creados con las categorías anteriores pasan a la nueva al editarlos
const migracion: Record<string, string> = { Lácteos: 'Lácteos y huevos', Huevos: 'Lácteos y huevos' };

// Cada categoría tiene su matiz (HSL) para los chips; "Otros" y las desconocidas quedan neutras
const matices: Record<string, number> = {
  Harinas: 38,
  Azúcares: 335,
  'Lácteos y huevos': 58,
  Lácteos: 58,
  Huevos: 58,
  Grasas: 16,
  Frutas: 140,
  Chocolates: 8,
  'Leudantes y esencias': 275,
  Decoración: 305,
  Empaques: 190,
};
const esNeutra = (c: string): boolean => !(c in matices);
const tonoCat = (c: string): Record<string, string> => (c in matices ? { '--h': String(matices[c]) } : {});

/* ---------- Búsqueda, filtros y paginación ---------- */
const busqueda = ref('');
const estado = ref<Estado>('todos');
const catFiltro = ref('');
const searchRef = ref<HTMLInputElement | null>(null);
const pagination = ref<{ sortBy: string | null; descending: boolean; page: number; rowsPerPage: number }>({
  sortBy: null,
  descending: false,
  page: 1,
  rowsPerPage: 10,
});

const estados: { id: Estado; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'bajo', label: 'Por reponer' },
  { id: 'ok', label: 'Al día' },
];

const formVacio = () => ({
  id: null as number | null,
  nombre_producto: '',
  categoria: '',
  unidad_medida: '',
  stock: 0 as number | string,
  stock_minimo: 0 as number | string,
  precio_unitario: 0 as number | string,
});
const form = reactive(formVacio());

const columns: QTableColumn[] = [
  { name: 'nombre_producto', label: 'Producto', align: 'left', field: 'nombre_producto', sortable: true },
  { name: 'categoria', label: 'Categoría', align: 'left', field: 'categoria', sortable: true },
  { name: 'stock', label: 'Stock', align: 'left', field: 'stock', sortable: true },
  { name: 'stock_minimo', label: 'Mínimo', align: 'left', field: 'stock_minimo', sortable: true },
  { name: 'precio_unitario', label: 'Costo unit.', align: 'right', field: 'precio_unitario', sortable: true },
  {
    name: 'valor',
    label: 'Valor total',
    align: 'right',
    field: (row: InventoryItem) => row.stock * row.precio_unitario,
    sortable: true,
  },
  { name: 'actions', label: '', align: 'right', field: 'id' },
];

/* ---------- Formato y cálculos ---------- */
const money = (n: number): string => `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
const cant = (n: number): string => String(Math.round(n * 1000) / 1000);

const esBajo = (i: InventoryItem): boolean => i.stock <= i.stock_minimo;
const faltante = (i: InventoryItem): number => Math.max(i.stock_minimo - i.stock, 0);

// Tono del stock: bajo el mínimo, cerca del mínimo o bien surtido
const tonoDe = (stock: number, min: number): Tono => (stock <= min ? 'lo' : stock <= min * 1.5 ? 'mid' : 'hi');
const tono = (i: InventoryItem): Tono => tonoDe(i.stock, i.stock_minimo);
// La barra se llena a la mitad cuando el stock iguala al mínimo
const nivelDe = (stock: number, min: number): number =>
  Math.max(4, Math.min(100, min > 0 ? (stock / (min * 2)) * 100 : stock > 0 ? 100 : 0));
const nivel = (i: InventoryItem): number => nivelDe(i.stock, i.stock_minimo);

const listaCompras = computed(() => inventoryList.value.filter(esBajo));
const totalCompras = computed(() =>
  listaCompras.value.reduce((acc, i) => acc + faltante(i) * i.precio_unitario, 0),
);

const filas = computed<InventoryItem[]>(() => {
  const q = busqueda.value.trim().toLowerCase();
  return inventoryList.value.filter((i) => {
    if (estado.value === 'bajo' && !esBajo(i)) return false;
    if (estado.value === 'ok' && esBajo(i)) return false;
    if (catFiltro.value && i.categoria !== catFiltro.value) return false;
    if (!q) return true;
    return i.nombre_producto.toLowerCase().includes(q) || i.categoria.toLowerCase().includes(q);
  });
});

const conteoEstado = (e: Estado): number =>
  e === 'todos'
    ? inventoryList.value.length
    : inventoryList.value.filter((i) => (e === 'bajo' ? esBajo(i) : !esBajo(i))).length;

const resumenCats = computed(() => {
  const conteo = new Map<string, number>();
  for (const i of inventoryList.value) conteo.set(i.categoria, (conteo.get(i.categoria) ?? 0) + 1);
  const orden = [...categorias, ...[...conteo.keys()].filter((c) => !categorias.includes(c))];
  return orden.filter((c) => conteo.has(c)).map((c) => ({ nombre: c, n: conteo.get(c) ?? 0 }));
});

const etiquetaPag = (first: number, last: number, total: number): string => `${first}–${last} de ${total}`;

const limpiarFiltros = (): void => {
  busqueda.value = '';
  estado.value = 'todos';
  catFiltro.value = '';
};
watch([busqueda, estado, catFiltro], () => {
  pagination.value = { ...pagination.value, page: 1 };
});

/* ---------- Resumen con conteo animado ---------- */
const stats = computed(() => ({
  total: inventoryList.value.length,
  bajo: listaCompras.value.length,
  valor: inventoryList.value.reduce((acc, i) => acc + i.stock * i.precio_unitario, 0),
  compra: totalCompras.value,
}));

const shown = reactive({ total: 0, bajo: 0, valor: 0, compra: 0 });
const claves = ['total', 'bajo', 'valor', 'compra'] as const;
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

/* ---------- Recetas sugeridas ---------- */
// Familia de medida: g = masa, ml = volumen, u = unidades
type Familia = 'g' | 'ml' | 'u';
type EstadoIng = 'ok' | 'poco' | 'falta';
type EstadoReceta = 'lista' | 'casi' | 'lejos';
type FiltroRec = 'todas' | 'listas' | 'casi';

interface Ingrediente {
  label: string;
  fam: Familia;
  patron: RegExp; // se prueba contra el nombre del insumo, sin tildes y en minúsculas
  excluir?: RegExp;
}
interface IngReceta {
  clave: string;
  cant: number; // en g, ml o unidades
  opcional?: boolean;
}
interface RecetaBase {
  id: string;
  nombre: string;
  emoji: string;
  rinde: string;
  porciones: number;
  ing: IngReceta[];
}
interface IngEval {
  clave: string;
  label: string;
  opcional: boolean;
  estado: EstadoIng;
  detalle: string;
}
interface RecetaEval extends Omit<RecetaBase, 'ing'> {
  ings: IngEval[];
  faltantes: IngEval[];
  estado: EstadoReceta;
  tandas: number | null;
  costo: number;
}

const INGREDIENTES: Record<string, Ingrediente> = {
  harina: { label: 'Harina', fam: 'g', patron: /\bharina/ },
  azucar: { label: 'Azúcar', fam: 'g', patron: /\bazucar/ },
  huevos: { label: 'Huevos', fam: 'u', patron: /\bhuevo/ },
  mantequilla: { label: 'Mantequilla', fam: 'g', patron: /\b(mantequilla|margarina)/ },
  leche: { label: 'Leche', fam: 'ml', patron: /\bleche\b/, excluir: /condensada|evaporada|en polvo/ },
  chocolate: { label: 'Chocolate', fam: 'g', patron: /\b(chocolate|cacao)/ },
  vainilla: { label: 'Vainilla', fam: 'ml', patron: /\bvainilla/ },
  polvo: { label: 'Polvo de hornear', fam: 'g', patron: /\b(polvo (de|para) hornear|royal|bicarbonato|leudante)/ },
  levadura: { label: 'Levadura', fam: 'g', patron: /\blevadura/ },
  crema: { label: 'Crema de leche', fam: 'ml', patron: /\b(crema de leche|crema para batir|nata)\b/ },
  limon: { label: 'Limón', fam: 'u', patron: /\blimon/ },
};

const CATALOGO: RecetaBase[] = [
  {
    id: 'bizcocho',
    nombre: 'Bizcocho de vainilla',
    emoji: '🍰',
    rinde: '1 molde · 10 porciones',
    porciones: 10,
    ing: [
      { clave: 'harina', cant: 250 },
      { clave: 'azucar', cant: 200 },
      { clave: 'mantequilla', cant: 120 },
      { clave: 'huevos', cant: 3 },
      { clave: 'leche', cant: 120 },
      { clave: 'vainilla', cant: 5 },
      { clave: 'polvo', cant: 8, opcional: true },
    ],
  },
  {
    id: 'brownies',
    nombre: 'Brownies',
    emoji: '🍫',
    rinde: '1 bandeja · 12 porciones',
    porciones: 12,
    ing: [
      { clave: 'chocolate', cant: 150 },
      { clave: 'mantequilla', cant: 120 },
      { clave: 'azucar', cant: 180 },
      { clave: 'huevos', cant: 3 },
      { clave: 'harina', cant: 90 },
    ],
  },
  {
    id: 'galletas-mantequilla',
    nombre: 'Galletas de mantequilla',
    emoji: '🍪',
    rinde: '24 galletas',
    porciones: 24,
    ing: [
      { clave: 'harina', cant: 250 },
      { clave: 'mantequilla', cant: 150 },
      { clave: 'azucar', cant: 100 },
      { clave: 'huevos', cant: 1 },
      { clave: 'vainilla', cant: 5 },
    ],
  },
  {
    id: 'galletas-chocolate',
    nombre: 'Galletas con chocolate',
    emoji: '🍪',
    rinde: '30 galletas',
    porciones: 30,
    ing: [
      { clave: 'harina', cant: 250 },
      { clave: 'mantequilla', cant: 170 },
      { clave: 'azucar', cant: 150 },
      { clave: 'huevos', cant: 1 },
      { clave: 'chocolate', cant: 150 },
      { clave: 'vainilla', cant: 5 },
    ],
  },
  {
    id: 'torta-chocolate',
    nombre: 'Torta de chocolate',
    emoji: '🎂',
    rinde: '1 molde · 12 porciones',
    porciones: 12,
    ing: [
      { clave: 'harina', cant: 220 },
      { clave: 'azucar', cant: 220 },
      { clave: 'chocolate', cant: 100 },
      { clave: 'mantequilla', cant: 120 },
      { clave: 'huevos', cant: 3 },
      { clave: 'leche', cant: 180 },
      { clave: 'polvo', cant: 8, opcional: true },
    ],
  },
  {
    id: 'cupcakes',
    nombre: 'Cupcakes de vainilla',
    emoji: '🧁',
    rinde: '12 cupcakes',
    porciones: 12,
    ing: [
      { clave: 'harina', cant: 200 },
      { clave: 'azucar', cant: 160 },
      { clave: 'mantequilla', cant: 100 },
      { clave: 'huevos', cant: 2 },
      { clave: 'leche', cant: 100 },
      { clave: 'vainilla', cant: 5 },
      { clave: 'polvo', cant: 6, opcional: true },
    ],
  },
  {
    id: 'flan',
    nombre: 'Flan de vainilla',
    emoji: '🍮',
    rinde: '1 molde · 8 porciones',
    porciones: 8,
    ing: [
      { clave: 'huevos', cant: 4 },
      { clave: 'leche', cant: 500 },
      { clave: 'azucar', cant: 150 },
      { clave: 'vainilla', cant: 5 },
    ],
  },
  {
    id: 'panqueques',
    nombre: 'Panqueques',
    emoji: '🥞',
    rinde: '8 panqueques',
    porciones: 8,
    ing: [
      { clave: 'harina', cant: 200 },
      { clave: 'leche', cant: 300 },
      { clave: 'huevos', cant: 2 },
      { clave: 'azucar', cant: 30 },
      { clave: 'mantequilla', cant: 30 },
    ],
  },
  {
    id: 'trufas',
    nombre: 'Trufas de chocolate',
    emoji: '🍬',
    rinde: '25 trufas',
    porciones: 25,
    ing: [
      { clave: 'chocolate', cant: 250 },
      { clave: 'crema', cant: 125 },
      { clave: 'mantequilla', cant: 30 },
    ],
  },
  {
    id: 'pan-dulce',
    nombre: 'Pan dulce',
    emoji: '🍞',
    rinde: '12 piezas',
    porciones: 12,
    ing: [
      { clave: 'harina', cant: 500 },
      { clave: 'azucar', cant: 80 },
      { clave: 'mantequilla', cant: 80 },
      { clave: 'huevos', cant: 2 },
      { clave: 'leche', cant: 250 },
      { clave: 'levadura', cant: 10 },
    ],
  },
  {
    id: 'tarta-limon',
    nombre: 'Tarta de limón',
    emoji: '🍋',
    rinde: '1 tarta · 8 porciones',
    porciones: 8,
    ing: [
      { clave: 'harina', cant: 200 },
      { clave: 'mantequilla', cant: 100 },
      { clave: 'azucar', cant: 150 },
      { clave: 'huevos', cant: 3 },
      { clave: 'limon', cant: 3 },
    ],
  },
];

const norm = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

// kg y l se pasan a g y ml; otras combinaciones (p. ej. "paquete") no se pueden comparar
const FACTOR: Record<string, number> = { kg: 1000, g: 1, l: 1000, ml: 1 };
const aBase = (n: number, unidad: string, fam: Familia): number | null => {
  const u = unidad.toLowerCase();
  if (fam === 'u') return u === 'unidad' ? n : null;
  const compatible = fam === 'g' ? u === 'kg' || u === 'g' : u === 'l' || u === 'ml';
  return compatible ? n * (FACTOR[u] ?? 1) : null;
};
const fmtBase = (n: number, fam: Familia): string => {
  if (fam === 'u') return `${cant(n)} u.`;
  if (n >= 1000) return `${cant(n / 1000)} ${fam === 'g' ? 'kg' : 'l'}`;
  return `${cant(n)} ${fam}`;
};

// Entre varios insumos que encajan (p. ej. dos harinas) se toma el de mayor existencia
const buscarInsumo = (def: Ingrediente): InventoryItem | undefined => {
  let mejor: InventoryItem | undefined;
  let mejorPeso = -1;
  for (const i of inventoryList.value) {
    const nombre = norm(i.nombre_producto);
    if (!def.patron.test(nombre)) continue;
    if (def.excluir?.test(nombre)) continue;
    const peso = aBase(i.stock, i.unidad_medida, def.fam) ?? i.stock;
    if (peso > mejorPeso) {
      mejor = i;
      mejorPeso = peso;
    }
  }
  return mejor;
};

const evaluar = (r: RecetaBase): RecetaEval => {
  let tandas = Infinity;
  let costo = 0;

  const ings: IngEval[] = r.ing.map((x) => {
    const def = INGREDIENTES[x.clave];
    const opcional = x.opcional === true;
    if (!def) return { clave: x.clave, label: x.clave, opcional, estado: 'falta', detalle: 'Ingrediente desconocido' };

    const necesita = fmtBase(x.cant, def.fam);
    const item = buscarInsumo(def);
    const res = (e: EstadoIng, detalle: string): IngEval => ({
      clave: x.clave,
      label: def.label,
      opcional,
      estado: e,
      detalle,
    });

    if (!item || item.stock <= 0) {
      return res('falta', `${opcional ? 'Opcional · ' : ''}No tienes · necesitas ${necesita}`);
    }

    const tienes = `${cant(item.stock)} ${item.unidad_medida}`;
    const enBase = aBase(item.stock, item.unidad_medida, def.fam);
    if (enBase === null) return res('ok', `Necesitas ${necesita} · tienes ${tienes}`);
    if (enBase < x.cant) return res('poco', `Necesitas ${necesita} · solo tienes ${tienes}`);

    if (!opcional) tandas = Math.min(tandas, Math.floor(enBase / x.cant));
    costo += x.cant * (item.precio_unitario / (FACTOR[item.unidad_medida.toLowerCase()] ?? 1));
    return res('ok', `Necesitas ${necesita} · tienes ${tienes}`);
  });

  const faltantes = ings.filter((g) => !g.opcional && g.estado !== 'ok');
  const est: EstadoReceta = faltantes.length === 0 ? 'lista' : faltantes.length === 1 ? 'casi' : 'lejos';
  return {
    id: r.id,
    nombre: r.nombre,
    emoji: r.emoji,
    rinde: r.rinde,
    porciones: r.porciones,
    ings,
    faltantes,
    estado: est,
    tandas: est === 'lista' && Number.isFinite(tandas) ? tandas : null,
    costo,
  };
};

const RANGO: Record<EstadoReceta, number> = { lista: 0, casi: 1, lejos: 2 };
const recetas = computed<RecetaEval[]>(() =>
  CATALOGO.map(evaluar).sort(
    (a, b) =>
      RANGO[a.estado] - RANGO[b.estado] ||
      (a.estado === 'lista' ? (b.tandas ?? 1) - (a.tandas ?? 1) : a.faltantes.length - b.faltantes.length) ||
      a.nombre.localeCompare(b.nombre, 'es'),
  ),
);

const LIMITE_REC = 6;
const recFiltro = ref<FiltroRec>('todas');
const verTodas = ref(false);
watch(recFiltro, () => {
  verTodas.value = false;
});

const nListas = computed(() => recetas.value.filter((r) => r.estado === 'lista').length);
const nCasi = computed(() => recetas.value.filter((r) => r.estado === 'casi').length);
const filtrosRec = computed<{ id: FiltroRec; label: string; n: number }[]>(() => [
  { id: 'todas', label: 'Todas', n: recetas.value.length },
  { id: 'listas', label: 'Puedo hacer', n: nListas.value },
  { id: 'casi', label: 'Casi', n: nCasi.value },
]);

const baseRec = computed(() =>
  recFiltro.value === 'todas'
    ? recetas.value
    : recetas.value.filter((r) => r.estado === (recFiltro.value === 'listas' ? 'lista' : 'casi')),
);
const recetasVista = computed(() => (verTodas.value ? baseRec.value : baseRec.value.slice(0, LIMITE_REC)));

const resumenRecetas = computed(() =>
  nListas.value > 0
    ? `Con tu inventario puedes preparar ${nListas.value} de ${recetas.value.length} recetas clásicas.`
    : 'Con tu inventario actual todavía no alcanza para una receta completa.',
);

// El ingrediente que, de conseguirlo, desbloquea más recetas
const pista = computed(() => {
  const cuenta = new Map<string, number>();
  for (const r of recetas.value) {
    if (r.estado !== 'casi') continue;
    for (const f of r.faltantes) cuenta.set(f.label, (cuenta.get(f.label) ?? 0) + 1);
  }
  let top: [string, number] | null = null;
  for (const e of cuenta) if (!top || e[1] > top[1]) top = e;
  if (!top) return '';
  const [nombre, n] = top;
  return `Si consigues ${nombre.toLowerCase()} podrías preparar ${n} ${n === 1 ? 'receta' : 'recetas'} más.`;
});

const etiquetaEstado = (r: RecetaEval): string =>
  r.estado === 'lista' ? 'Lista para hacer' : r.estado === 'casi' ? 'Casi lista' : `Faltan ${r.faltantes.length}`;

const unir = (xs: string[]): string =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`;
const textoFalta = (r: RecetaEval): string => {
  const partes = r.faltantes.map((f) =>
    f.estado === 'poco' ? `${f.label.toLowerCase()} (no alcanza)` : f.label.toLowerCase(),
  );
  return `Te ${r.faltantes.length > 1 ? 'faltan' : 'falta'}: ${unir(partes)}`;
};
const iconoIng = (e: EstadoIng): string => (e === 'ok' ? 'check' : e === 'poco' ? 'priority_high' : 'close');

/* ---------- Formulario ---------- */
const valorForm = computed(() => (Number(form.stock) || 0) * (Number(form.precio_unitario) || 0));
const estadoTexto = computed(() => {
  const t = tonoDe(Number(form.stock) || 0, Number(form.stock_minimo) || 0);
  return t === 'lo' ? 'Por reponer' : t === 'mid' ? 'Cerca del mínimo' : 'Bien surtido';
});

const notifyError = (error: unknown, fallback: string): void => {
  const err = error as AxiosError<{ mensaje?: string; error?: string }>;
  $q.notify({
    type: 'negative',
    message: err.response?.data?.error || err.response?.data?.mensaje || fallback,
  });
};

/* ---------- API ---------- */
// El token se agrega solo gracias al interceptor de boot/axios.ts
const fetchInventory = async (): Promise<void> => {
  loading.value = true;
  try {
    const { data } = await api.get<InventoryRaw[]>('/inventario');
    inventoryList.value = data.map((r) => ({
      ...r,
      stock: Number(r.stock),
      precio_unitario: Number(r.precio_unitario),
      stock_minimo: Number(r.stock_minimo ?? 0),
    }));
  } catch (error) {
    notifyError(error, 'Error al cargar el inventario.');
  } finally {
    loading.value = false;
  }
};

// Avisa al menú lateral para que actualice su panel de compras/salud
const avisarCambio = (): void => {
  window.dispatchEvent(new Event('inventario-actualizado'));
};

const abrirNuevo = (): void => {
  Object.assign(form, formVacio());
  showForm.value = true;
};

const abrirEditar = (item: InventoryItem): void => {
  Object.assign(form, { ...item, categoria: migracion[item.categoria] ?? item.categoria });
  showForm.value = true;
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
  document.querySelector('.iv-row.flash')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

/* Un producto nuevo se muestra aunque caiga en otra página: se quitan filtros y orden y se salta a su página */
const irAlNuevo = async (id: number): Promise<void> => {
  limpiarFiltros();
  await nextTick();
  const idx = inventoryList.value.findIndex((i) => i.id === id);
  if (idx < 0) return;
  const porPagina = pagination.value.rowsPerPage || inventoryList.value.length || 1;
  pagination.value = {
    ...pagination.value,
    sortBy: null,
    descending: false,
    page: Math.floor(idx / porPagina) + 1,
  };
  await resaltar(id);
};

const guardar = async (): Promise<void> => {
  submitting.value = true;
  const { id, ...resto } = form;
  const payload = {
    ...resto,
    nombre_producto: resto.nombre_producto.trim(),
    stock: Number(resto.stock) || 0,
    stock_minimo: Number(resto.stock_minimo) || 0,
    precio_unitario: Number(resto.precio_unitario) || 0,
  };
  const idsPrevios = new Set(inventoryList.value.map((i) => i.id));
  try {
    if (id) {
      await api.put(`/inventario/${id}`, payload);
      $q.notify({ type: 'positive', message: 'Producto actualizado' });
    } else {
      await api.post('/inventario', payload);
      $q.notify({ type: 'positive', message: 'Producto creado exitosamente' });
    }
    showForm.value = false;
    await fetchInventory();
    avisarCambio();
    if (id) {
      await resaltar(id);
    } else {
      const nuevo = inventoryList.value.find((i) => !idsPrevios.has(i.id));
      if (nuevo) await irAlNuevo(nuevo.id);
    }
  } catch (error) {
    notifyError(error, 'No se pudo guardar el producto');
  } finally {
    submitting.value = false;
  }
};

const confirmDelete = (item: InventoryItem): void => {
  $q.dialog({
    title: 'Eliminar producto',
    message: `¿Seguro que deseas eliminar "${item.nombre_producto}"?`,
    class: 'iv-confirm',
    cancel: { label: 'Cancelar', flat: true, color: 'brown-7' },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true },
    persistent: true,
  }).onOk(() => {
    void deleteItem(item.id);
  });
};

const deleteItem = async (id: number): Promise<void> => {
  try {
    await api.delete(`/inventario/${id}`);
    $q.notify({ type: 'positive', message: 'Producto eliminado correctamente' });
    await fetchInventory();
    avisarCambio();
  } catch (error) {
    notifyError(error, 'No se pudo eliminar el producto');
  }
};

/* ---------- Lista de compras ---------- */
const abrirCompras = (): void => {
  if (listaCompras.value.length === 0) return;
  showCompras.value = true;
};

// El menú lateral lleva aquí con ?compras=1 para abrir la lista completa
const pedirCompras = async (): Promise<void> => {
  if (route.query.compras === undefined) return;
  await router.replace({ path: route.path, query: {} });
  abrirCompras();
};
watch(
  () => route.query.compras,
  (v) => {
    if (v !== undefined && !loading.value) void pedirCompras();
  },
);

const copiarLista = async (): Promise<void> => {
  const lineas = listaCompras.value.map(
    (i) =>
      `• ${i.nombre_producto}: ${cant(faltante(i))} ${i.unidad_medida} (≈ ${money(faltante(i) * i.precio_unitario)})`,
  );
  const texto = `Lista de compras\n${lineas.join('\n')}\nTotal estimado: ${money(totalCompras.value)}`;
  try {
    await copyToClipboard(texto);
    $q.notify({ type: 'positive', message: 'Lista copiada' });
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo copiar la lista' });
  }
};

/* Atajo: "/" enfoca el buscador */
const atajo = (e: KeyboardEvent): void => {
  const t = e.target as HTMLElement | null;
  const escribiendo = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  if (e.key === '/' && !escribiendo && !showForm.value && !showCompras.value) {
    e.preventDefault();
    searchRef.value?.focus();
  }
};

onMounted(async () => {
  window.addEventListener('keydown', atajo);
  await fetchInventory();
  await pedirCompras();
});

onUnmounted(() => {
  window.removeEventListener('keydown', atajo);
  cancelAnimationFrame(raf);
  window.clearTimeout(temporizador);
});
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

/*
  Tema claro (caramelo), el mismo del layout y de Reportes.
  Las variables se definen aquí para la página, los diálogos y los menús, porque estos
  últimos viven fuera de la página (Quasar los monta en el <body>).
*/
.iv-page,
.iv-dialog,
.iv-menu,
.iv-confirm {
  --panel: #fffdf9;
  --panel-2: #fbefdc;
  --line: rgba(120, 70, 30, 0.18);
  --ink: #3b2112;
  --choco: #3b2112;
  --mute: rgba(59, 33, 18, 0.62);
  --accent: #c26a1c;
  --accent-2: #e19434;
  --accent-ink: #8a4b1f;
  --hi: #2a8453;
  --mid: #b9770e;
  --lo: #c0392b;
  --neg: #c0392b;
  --shadow: rgba(92, 48, 14, 0.12);
  --ease: cubic-bezier(0.2, 0.9, 0.2, 1);
  --q-primary: #c26a1c;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  color: var(--ink);
}

/* ---------- Página (el fondo con brillos lo pinta el layout) ---------- */
.iv-wrap {
  max-width: 1280px;
  margin: 0 auto;
  padding: 28px clamp(16px, 3vw, 40px) 80px;
}

.iv-rise {
  animation: ivRise 0.6s var(--ease) both;
  animation-delay: var(--d, 0ms);
}
@keyframes ivRise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.iv-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 22px;
}
.iv-head-acts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.iv-eyebrow {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent);
}
.iv-title {
  margin: 0;
  font-size: clamp(30px, 4vw, 42px);
  line-height: 1.05;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--choco);
}
.iv-sub {
  margin: 8px 0 0;
  color: var(--mute);
  font-size: 15px;
}

/* ---------- Botones ---------- */
.iv-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 46px;
  padding: 0 20px;
  border: 0;
  border-radius: 12px;
  cursor: pointer;
  font: 600 15px/1 'IBM Plex Sans', sans-serif;
  color: #fff;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  box-shadow: 0 10px 24px rgba(194, 106, 28, 0.3);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.iv-cta:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(194, 106, 28, 0.4);
}
.iv-cta:active:not(:disabled) {
  transform: translateY(0);
}
.iv-cta:disabled {
  opacity: 0.7;
  cursor: progress;
}

.iv-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
  color: var(--ink);
  cursor: pointer;
  font: 500 14px/1 'IBM Plex Sans', sans-serif;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}
.iv-ghost:hover {
  background: var(--panel-2);
  border-color: rgba(194, 106, 28, 0.5);
}

.iv-ico {
  position: relative;
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--mute);
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}
.iv-ico:hover:not(:disabled) {
  background: rgba(194, 106, 28, 0.12);
  color: var(--accent);
  transform: translateY(-1px);
}
.iv-ico.danger:hover:not(:disabled) {
  background: rgba(192, 57, 43, 0.12);
  color: var(--neg);
}

/* Lista de compras: legible siempre y con pulso cuando hay algo por reponer */
.iv-buy {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 46px;
  padding: 0 8px 0 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  color: var(--mute);
  cursor: pointer;
  font: 600 15px/1 'IBM Plex Sans', sans-serif;
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}
.iv-buy b {
  display: grid;
  place-items: center;
  min-width: 26px;
  height: 26px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(59, 33, 18, 0.1);
  font-size: 13px;
}
.iv-buy[aria-disabled='true'] {
  cursor: not-allowed;
}
.iv-buy.alert {
  color: var(--ink);
  border-color: rgba(192, 57, 43, 0.5);
  background: rgba(192, 57, 43, 0.07);
  animation: ivPulse 2.6s ease-out infinite;
}
.iv-buy.alert b {
  background: var(--neg);
  color: #fff;
}
.iv-buy.alert:hover {
  background: rgba(192, 57, 43, 0.13);
  transform: translateY(-2px);
}
@keyframes ivPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(192, 57, 43, 0.35);
  }
  70% {
    box-shadow: 0 0 0 12px rgba(192, 57, 43, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(192, 57, 43, 0);
  }
}

.iv-cta:focus-visible,
.iv-ghost:focus-visible,
.iv-ico:focus-visible,
.iv-buy:focus-visible,
.iv-pill:focus-visible,
.iv-cat:focus-visible,
.iv-chip:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ---------- Resumen ---------- */
.iv-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 18px;
}
.iv-stat {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  padding: 16px 18px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--panel);
  box-shadow: 0 10px 26px rgba(92, 48, 14, 0.09);
  transition:
    transform 0.25s ease,
    border-color 0.25s ease;
}
.iv-stat:hover {
  transform: translateY(-3px);
  border-color: rgba(194, 106, 28, 0.5);
}
.iv-stat.alert {
  border-color: rgba(192, 57, 43, 0.4);
}
.iv-stat-ico {
  flex: none;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 13px;
}
.t-accent {
  color: var(--accent);
  background: rgba(194, 106, 28, 0.13);
}
.t-pink {
  color: #b8435f;
  background: rgba(184, 67, 95, 0.12);
}
.t-amber {
  color: var(--mid);
  background: rgba(185, 119, 14, 0.14);
}
.t-good {
  color: var(--hi);
  background: rgba(42, 132, 83, 0.13);
}
.t-warn {
  color: var(--neg);
  background: rgba(192, 57, 43, 0.13);
}
.iv-stat-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.iv-stat-k {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mute);
}
.iv-stat-v {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  color: var(--choco);
}
.iv-stat-h {
  font-size: 12px;
  color: var(--mute);
}

/* ---------- Herramientas ---------- */
.iv-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}
.iv-search {
  flex: 1 1 280px;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  color: var(--mute);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.iv-search:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(194, 106, 28, 0.2);
}
.iv-search input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink);
  font: 400 15px/1 'IBM Plex Sans', sans-serif;
}
.iv-search input::placeholder {
  color: rgba(59, 33, 18, 0.42);
}

.iv-seg {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
}
.iv-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--mute);
  cursor: pointer;
  font: 500 13px/1 'IBM Plex Sans', sans-serif;
  white-space: nowrap;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}
.iv-pill b {
  font-weight: 600;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(59, 33, 18, 0.09);
}
.iv-pill:hover {
  color: var(--ink);
  background: var(--panel-2);
}
.iv-pill.on {
  color: #fff;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
}
.iv-pill.on b {
  background: rgba(255, 255, 255, 0.25);
}

/* ---------- Categorías ---------- */
.iv-cats {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
  padding-bottom: 4px;
  overflow-x: auto;
  scrollbar-width: thin;
}
.iv-cat {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--panel);
  color: var(--mute);
  cursor: pointer;
  font: 500 13px/1 'IBM Plex Sans', sans-serif;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}
.iv-cat b {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.8;
}
.iv-cat:hover {
  color: var(--ink);
  background: var(--panel-2);
}
.iv-cat.on {
  color: var(--ink);
  border-color: hsl(var(--h, 30) 65% 48% / 0.65);
  background: hsl(var(--h, 30) 80% 58% / 0.2);
}
.iv-dot {
  display: inline-block;
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: hsl(var(--h, 30) 70% 52%);
}
.iv-dot.neutral {
  background: rgba(59, 33, 18, 0.4);
}

/* ---------- Tabla ---------- */
.iv-table {
  background: var(--panel) !important;
  border: 1px solid var(--line);
  border-radius: 20px;
  overflow: hidden;
  color: var(--ink);
  box-shadow: 0 10px 26px rgba(92, 48, 14, 0.09);
}
.iv-table thead tr th {
  height: 46px;
  background: rgba(194, 106, 28, 0.07);
  border-bottom: 1px solid var(--line);
  color: var(--mute);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.iv-table thead th.sorted,
.iv-table thead th.sortable:hover {
  color: var(--ink);
}
.iv-table thead th .q-table__sort-icon {
  color: var(--accent);
}
.iv-table tbody td {
  height: 62px;
  padding: 8px 16px;
  border-bottom: 1px solid rgba(120, 70, 30, 0.1);
  font-size: 14px;
  color: var(--ink);
}
.iv-table tbody tr:last-child td {
  border-bottom: 0;
}
.iv-table .q-table__bottom {
  border-top: 1px solid var(--line);
  color: var(--mute);
}
.iv-table .q-table__bottom .q-field__native,
.iv-table .q-table__bottom .q-field__append {
  color: var(--ink);
}
.iv-table .q-linear-progress {
  color: var(--accent);
}

.iv-row {
  --tone: var(--hi);
  animation: ivRow 0.45s var(--ease) both;
  animation-delay: calc(var(--i, 0) * 40ms);
  transition: background 0.2s ease;
}
.iv-row.mid {
  --tone: var(--mid);
}
.iv-row.lo {
  --tone: var(--neg);
}
@keyframes ivRow {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.iv-table tbody tr.iv-row:hover {
  background: rgba(194, 106, 28, 0.07);
}
.iv-row.lo td:first-child {
  box-shadow: inset 3px 0 0 var(--neg);
}
.iv-row.flash td {
  animation: ivFlash 2.6s ease-out;
}
@keyframes ivFlash {
  0%,
  35% {
    background: rgba(225, 148, 52, 0.35);
  }
  100% {
    background: transparent;
  }
}

.iv-name {
  font-weight: 600;
  font-size: 15px;
}
.iv-mute {
  color: var(--mute);
}
.iv-num {
  font-variant-numeric: tabular-nums;
}
.iv-strong {
  font-weight: 650;
}

.iv-chip {
  --h: 30;
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border: 1px solid hsl(var(--h) 60% 50% / 0.4);
  border-radius: 999px;
  background: hsl(var(--h) 85% 62% / 0.2);
  color: hsl(var(--h) 65% 26%);
  cursor: pointer;
  font: 500 12.5px/1 'IBM Plex Sans', sans-serif;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}
.iv-chip:hover {
  background: hsl(var(--h) 85% 62% / 0.34);
  transform: translateY(-1px);
}
.iv-chip.neutral {
  border-color: var(--line);
  background: rgba(59, 33, 18, 0.06);
  color: var(--mute);
}
.iv-chip.neutral:hover {
  background: rgba(59, 33, 18, 0.11);
}

.iv-stock {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 130px;
}
.iv-stock-top {
  display: flex;
  align-items: center;
  gap: 8px;
}
.iv-stock-n {
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}
.iv-stock-n small {
  font-size: 12px;
  font-weight: 400;
  color: var(--mute);
}
.iv-row.lo .iv-stock-n {
  color: var(--neg);
}
.iv-tag {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(192, 57, 43, 0.13);
  color: var(--neg);
  font-size: 11px;
  font-weight: 600;
}

.iv-meter {
  display: block;
  width: 100%;
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(59, 33, 18, 0.1);
}
.iv-meter i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--tone, var(--hi));
  transform-origin: left;
  animation: ivFill 0.8s var(--ease) both;
  animation-delay: calc(var(--i, 0) * 40ms + 200ms);
  transition: width 0.6s var(--ease);
}
@keyframes ivFill {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

.iv-acts {
  display: inline-flex;
  gap: 2px;
  opacity: 0.65;
  transition: opacity 0.2s ease;
}
.iv-row:hover .iv-acts,
.iv-acts:focus-within {
  opacity: 1;
}

.iv-nodata {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 36px 16px;
  color: var(--mute);
}

/* ---------- Estados vacíos y carga ---------- */
.iv-skel {
  height: 380px;
  border-radius: 20px;
  border: 1px solid var(--line);
  background: linear-gradient(100deg, var(--panel) 30%, var(--panel-2) 50%, var(--panel) 70%);
  background-size: 200% 100%;
  animation: ivShimmer 1.4s linear infinite;
}
@keyframes ivShimmer {
  to {
    background-position: -200% 0;
  }
}
.iv-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 56px 20px;
  text-align: center;
  border: 1px dashed rgba(194, 106, 28, 0.4);
  border-radius: 20px;
  background: var(--panel);
}
.iv-empty h2 {
  margin: 6px 0 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--choco);
}
.iv-empty p {
  margin: 0 0 8px;
  max-width: 440px;
  color: var(--mute);
}
.iv-empty-ico {
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  border-radius: 50%;
  color: var(--accent);
  background: rgba(194, 106, 28, 0.12);
}

/* ---------- Recetas sugeridas ---------- */
.iv-rec {
  margin-top: 36px;
}
.iv-rec-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.iv-rec-title {
  margin: 0;
  font-size: clamp(22px, 3vw, 28px);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--choco);
}
.iv-hint {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 16px;
  padding: 11px 14px;
  border: 1px dashed rgba(194, 106, 28, 0.5);
  border-radius: 12px;
  background: rgba(225, 148, 52, 0.12);
  color: var(--accent-ink);
  font-size: 14px;
  font-weight: 500;
}
.iv-hint .q-icon {
  flex: none;
  color: var(--accent);
}
.iv-rec-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 14px;
}
.iv-rcard {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--panel);
  box-shadow: 0 10px 26px rgba(92, 48, 14, 0.09);
  animation: ivRise 0.5s var(--ease) both;
  animation-delay: var(--d, 0ms);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.iv-rcard:hover {
  border-color: rgba(194, 106, 28, 0.5);
  box-shadow: 0 14px 30px rgba(92, 48, 14, 0.14);
}
.iv-rcard.lista {
  border-color: rgba(42, 132, 83, 0.35);
}
.iv-rcard.lejos {
  background: rgba(255, 253, 249, 0.7);
}
.iv-rcard-top {
  display: flex;
  align-items: center;
  gap: 12px;
}
.iv-remoji {
  flex: none;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: rgba(194, 106, 28, 0.1);
  font-size: 24px;
  line-height: 1;
}
.iv-rcard-id {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.iv-rcard-id h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--choco);
}
.iv-rcard-id span {
  font-size: 12.5px;
  color: var(--mute);
}
.iv-rbadge {
  flex: none;
  align-self: flex-start;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.iv-rbadge.lista {
  background: rgba(42, 132, 83, 0.14);
  color: #1f6b42;
}
.iv-rbadge.casi {
  background: rgba(185, 119, 14, 0.16);
  color: #8a5a0b;
}
.iv-rbadge.lejos {
  background: rgba(59, 33, 18, 0.08);
  color: var(--mute);
}
.iv-rmetrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(194, 106, 28, 0.06);
}
.iv-rmetrics > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.iv-rmetrics span {
  font-size: 11px;
  color: var(--mute);
}
.iv-rmetrics b {
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--choco);
  white-space: nowrap;
}
.iv-rmetrics small {
  font-size: 12px;
  font-weight: 500;
  color: var(--mute);
}
.iv-rmiss {
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(185, 119, 14, 0.1);
  color: #7a4f0a;
  font-size: 13.5px;
  font-weight: 500;
}
.iv-rcard.lejos .iv-rmiss {
  background: rgba(59, 33, 18, 0.06);
  color: var(--mute);
}
.iv-ings {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.iv-ing {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 9px 0 7px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: default;
}
.iv-ing.ok {
  background: rgba(42, 132, 83, 0.11);
  border-color: rgba(42, 132, 83, 0.3);
  color: #1f6b42;
}
.iv-ing.poco {
  background: rgba(185, 119, 14, 0.13);
  border-color: rgba(185, 119, 14, 0.35);
  color: #8a5a0b;
}
.iv-ing.falta {
  background: rgba(192, 57, 43, 0.1);
  border-color: rgba(192, 57, 43, 0.3);
  color: #a5301f;
}
.iv-ing.opt {
  border-style: dashed;
  opacity: 0.8;
}
.iv-rnone {
  margin: 0;
  padding: 26px 0;
  text-align: center;
  color: var(--mute);
}
.iv-rec-more {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
.iv-note {
  max-width: 760px;
  margin: 18px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--mute);
}

/* ---------- Diálogos ---------- */
.iv-dialog {
  width: 620px;
  max-width: 96vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 22px;
  background:
    radial-gradient(500px 240px at 0% 0%, rgba(225, 148, 52, 0.16), transparent 70%),
    #fffaf1 !important;
  color: var(--ink);
  box-shadow: 0 40px 90px rgba(60, 30, 10, 0.35);
}
.iv-dialog.wide {
  width: 760px;
}
.q-dialog__inner--maximized > .iv-dialog {
  border-radius: 0;
  max-width: 100vw;
}
.iv-dh {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 22px 24px 8px;
}
.iv-dh h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--choco);
}
.iv-dsub {
  margin: 0 24px 14px;
  font-size: 14px;
  color: var(--mute);
}
.iv-form {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}
.iv-db {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 66vh;
  padding: 10px 24px 6px;
  overflow-y: auto;
}
.q-dialog__inner--maximized .iv-db {
  max-height: none;
  flex: 1;
}
.iv-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.iv-three {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.iv-df {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 14px 24px 20px;
  border-top: 1px solid var(--line);
}
.iv-df.between {
  justify-content: space-between;
  flex-wrap: wrap;
}
.iv-df-btns {
  display: flex;
  gap: 10px;
}

/* Campos de Quasar en claro */
.iv-field .q-field__control {
  background: #fff;
}
.iv-field .q-field__control:before {
  border-color: rgba(120, 70, 30, 0.28);
}
.iv-field:hover .q-field__control:before {
  border-color: rgba(194, 106, 28, 0.6);
}
.iv-field .q-field__label,
.iv-field .q-field__suffix,
.iv-field .q-field__prefix {
  color: var(--mute);
}
.iv-field .q-field__native,
.iv-field .q-field__input,
.iv-field .q-field__append {
  color: var(--ink);
}
.iv-field.q-field--focused .q-field__label {
  color: var(--accent);
}
.iv-field .q-field__bottom {
  color: var(--neg);
}

/* Menú desplegable (opaco, para que no se mezcle con los campos de abajo) */
.iv-menu {
  background: #fffaf1 !important;
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(60, 30, 10, 0.28);
}
.iv-menu .q-item {
  color: var(--ink);
  min-height: 40px;
}
.iv-menu .q-item--active,
.iv-menu .q-item.q-manual-focusable--focused {
  color: var(--accent-ink);
  background: rgba(194, 106, 28, 0.13);
}
.iv-opt-dot {
  min-width: 0 !important;
  padding-right: 10px !important;
}

/* Vista previa en vivo */
.iv-live {
  --tone: var(--hi);
  margin: 12px 0 8px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: rgba(194, 106, 28, 0.06);
}
.iv-live.mid {
  --tone: var(--mid);
}
.iv-live.lo {
  --tone: var(--neg);
}
.iv-live-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}
.iv-live-grid > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.iv-live-grid span {
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mute);
}
.iv-live-grid b {
  font-size: 18px;
  font-variant-numeric: tabular-nums;
  color: var(--choco);
}
.iv-live-grid b.iv-live-estado {
  color: var(--tone);
}
.iv-live .iv-meter i {
  animation: none;
}

/* Lista de compras */
.iv-scroll {
  margin: 0 24px 4px;
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
}
.iv-ctab {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  color: var(--ink);
}
.iv-ctab th {
  padding: 12px 14px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mute);
  background: rgba(194, 106, 28, 0.07);
  border-bottom: 1px solid var(--line);
  white-space: nowrap;
}
.iv-ctab td {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(120, 70, 30, 0.1);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.iv-ctab tbody tr:last-child td {
  border-bottom: 0;
}
.iv-ctab .r {
  text-align: right;
}
.iv-falta {
  color: var(--neg);
  font-weight: 650;
}
.iv-total {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.iv-total span {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mute);
}
.iv-total b {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--accent);
}

/* Diálogo de confirmación de Quasar con el mismo tono */
.q-dialog .q-card.q-dialog-plugin.iv-confirm,
.q-dialog .iv-confirm .q-card.q-dialog-plugin {
  border: 1px solid var(--line);
  border-radius: 18px;
  background: #fffaf1;
  color: var(--ink);
}

/* ---------- Pantallas pequeñas ---------- */
@media (max-width: 1000px) {
  .iv-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 600px) {
  .iv-head-acts {
    width: 100%;
  }
  .iv-head-acts > button {
    flex: 1;
    justify-content: center;
  }
  .iv-seg {
    width: 100%;
    overflow-x: auto;
  }
  .iv-two {
    grid-template-columns: 1fr;
  }
  .iv-three {
    grid-template-columns: 1fr 1fr;
  }
  .iv-stat-v {
    font-size: 22px;
  }
  .iv-table tbody td {
    padding: 8px 10px;
  }
  .iv-rec-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .iv-rmetrics b {
    font-size: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .iv-rise,
  .iv-row,
  .iv-row.flash td,
  .iv-meter i,
  .iv-buy.alert,
  .iv-skel,
  .iv-rcard {
    animation: none;
  }
  .iv-stat,
  .iv-cta,
  .iv-chip,
  .iv-meter i,
  .iv-rcard {
    transition: none;
  }
}
</style>
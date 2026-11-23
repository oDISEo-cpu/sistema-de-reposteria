<template>
  <q-page class="ui-page">
    <div class="ui-wrap">
      <!-- Encabezado -->
      <header class="ui-head ui-rise">
        <div>
          <p class="ui-eyebrow">Producción</p>
          <h1 class="ui-title">Recetas</h1>
          <p class="ui-sub">Ingredientes por unidad, costo y margen. Simula precios y produce directo desde aquí.</p>
        </div>
        <button type="button" class="ui-cta" @click="abrirNueva">
          <q-icon name="add" size="20px" />
          <span>Nueva receta</span>
        </button>
      </header>

      <!-- Resumen -->
      <section class="ui-stats ui-rise" style="--d: 80ms" aria-label="Resumen">
        <div class="ui-stat">
          <span class="ui-stat-ico ui-t-accent"><q-icon name="receipt_long" size="22px" /></span>
          <div class="ui-stat-body">
            <span class="ui-stat-k">Recetas</span>
            <span class="ui-stat-v">{{ Math.round(shown.total) }}</span>
            <span class="ui-stat-h">registradas</span>
          </div>
        </div>
        <div class="ui-stat">
          <span class="ui-stat-ico ui-t-good"><q-icon name="trending_up" size="22px" /></span>
          <div class="ui-stat-body">
            <span class="ui-stat-k">Margen promedio</span>
            <span class="ui-stat-v">{{ shown.avg.toFixed(1) }}<small>%</small></span>
            <span class="ui-stat-h">sobre el precio de venta</span>
          </div>
        </div>
        <div class="ui-stat">
          <span class="ui-stat-ico ui-t-amber"><q-icon name="payments" size="22px" /></span>
          <div class="ui-stat-body">
            <span class="ui-stat-k">Costo promedio</span>
            <span class="ui-stat-v">{{ money(shown.cost) }}</span>
            <span class="ui-stat-h">por unidad</span>
          </div>
        </div>
        <div class="ui-stat">
          <span class="ui-stat-ico ui-t-pink"><q-icon name="emoji_events" size="22px" /></span>
          <div class="ui-stat-body">
            <span class="ui-stat-k">Más rentable</span>
            <span class="ui-stat-v rc-stat-name">{{ stats.mejor ? stats.mejor.nombre : '—' }}</span>
            <span class="ui-stat-h">
              {{ stats.mejor ? `${margen(stats.mejor.precio_venta, stats.mejor.costo)}% de margen` : 'sin datos' }}
            </span>
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
            placeholder="Buscar por receta o ingrediente…  ( / )"
            autocomplete="off"
            spellcheck="false"
          />
        </label>
        <div class="ui-seg" role="group" aria-label="Filtrar por margen">
          <button
            v-for="f in filtros"
            :key="f.id"
            type="button"
            class="ui-pill"
            :class="{ on: filtro === f.id }"
            @click="filtro = f.id"
          >
            {{ f.label }}<b>{{ conteoFiltro(f.id) }}</b>
          </button>
        </div>
        <div class="ui-seg" role="group" aria-label="Ordenar">
          <button
            v-for="o in ordenes"
            :key="o.id"
            type="button"
            class="ui-pill"
            :class="{ on: orden === o.id }"
            @click="orden = o.id"
          >
            {{ o.label }}
          </button>
        </div>
      </section>

      <!-- Cargando -->
      <div v-if="loading && recetas.length === 0 && !loadError" class="rc-grid">
        <div v-for="n in 3" :key="n" class="ui-skel"></div>
      </div>

      <!-- No se pudo cargar -->
      <div v-else-if="loadError" class="ui-empty ui-rise">
        <div class="ui-empty-ico"><q-icon name="cloud_off" size="40px" /></div>
        <h2>{{ loadError.titulo }}</h2>
        <p>{{ loadError.texto }}</p>
        <button type="button" class="ui-cta" @click="recargar">
          <q-icon name="refresh" size="20px" />
          <span>Reintentar</span>
        </button>
      </div>

      <!-- Sin recetas -->
      <div v-else-if="recetas.length === 0" class="ui-empty ui-rise">
        <div class="ui-empty-ico"><q-icon name="receipt_long" size="40px" /></div>
        <h2>Aún no tienes recetas</h2>
        <p>Crea la primera eligiendo ingredientes de tu inventario; el costo se calcula solo.</p>
        <button type="button" class="ui-cta" @click="abrirNueva">
          <q-icon name="add" size="20px" />
          <span>Crear receta</span>
        </button>
      </div>

      <!-- Sin resultados -->
      <div v-else-if="visibles.length === 0" class="ui-empty">
        <div class="ui-empty-ico"><q-icon name="search_off" size="40px" /></div>
        <h2>Nada coincide con tu búsqueda</h2>
        <p>Prueba con otro nombre o quita los filtros.</p>
        <button type="button" class="ui-ghost" @click="limpiarFiltros">Quitar filtros</button>
      </div>

      <!-- Tarjetas -->
      <transition-group v-else name="rc-list" tag="div" class="rc-grid" appear>
        <article
          v-for="(r, idx) in visibles"
          :key="r.id"
          class="rc-card"
          :class="tierCard(r)"
          :style="{ '--i': Math.min(idx, 10) }"
          @pointermove="foco"
        >
          <div class="rc-card-top">
            <div class="rc-card-name">
              <h3>{{ r.nombre }}</h3>
              <p>{{ r.descripcion || 'Sin descripción' }}</p>
            </div>
            <div class="rc-acts">
              <button type="button" class="ui-ico" aria-label="Duplicar" @click="abrirDuplicar(r)">
                <q-icon name="content_copy" size="18px" />
                <q-tooltip>Duplicar</q-tooltip>
              </button>
              <button type="button" class="ui-ico" aria-label="Editar" @click="abrirEditar(r)">
                <q-icon name="edit" size="18px" />
                <q-tooltip>Editar</q-tooltip>
              </button>
              <button type="button" class="ui-ico danger" aria-label="Eliminar" @click="pedirEliminar(r)">
                <q-icon name="delete" size="18px" />
                <q-tooltip>Eliminar</q-tooltip>
              </button>
            </div>
          </div>

          <div class="rc-nums">
            <div>
              <span>Costo{{ kDe(r) > 1 ? ` ×${kDe(r)}` : '' }}</span>
              <b>{{ money(r.costo * kDe(r)) }}</b>
            </div>
            <div>
              <span>Precio{{ kDe(r) > 1 ? ` ×${kDe(r)}` : '' }}</span>
              <b>{{ money(precioDe(r) * kDe(r)) }}</b>
            </div>
            <div>
              <span>Ganancia</span>
              <b :class="{ neg: precioDe(r) - r.costo < 0 }">{{ money((precioDe(r) - r.costo) * kDe(r)) }}</b>
            </div>
          </div>

          <div class="rc-margin">
            <div class="rc-margin-row">
              <span>Margen</span>
              <b>{{ margen(precioDe(r), r.costo) }}%</b>
            </div>
            <div class="rc-track"><i :style="{ width: barra(precioDe(r), r.costo) + '%' }"></i></div>
          </div>

          <!-- Simulador de precio -->
          <label class="rc-sim">
            <span>Precio</span>
            <input
              type="range"
              class="rc-range"
              :aria-label="`Simular precio de ${r.nombre}`"
              :min="rango(r).min"
              :max="rango(r).max"
              step="0.05"
              :value="precioDe(r)"
              :style="{ '--p': pctRango(r) + '%' }"
              @input="simular(r, $event)"
            />
            <output>{{ money(precioDe(r)) }}</output>
          </label>
          <div v-if="cambiado(r)" class="rc-sim-acts">
            <button type="button" class="rc-link" @click="restablecer(r)">Restablecer a {{ money(r.precio_venta) }}</button>
            <button type="button" class="ui-ghost rc-mini" :disabled="guardandoPrecio === r.id" @click="guardarPrecio(r)">
              <q-spinner v-if="guardandoPrecio === r.id" size="14px" />
              Guardar este precio
            </button>
          </div>

          <!-- Cantidad a producir -->
          <div class="rc-batch">
            <span>Unidades</span>
            <button
              v-for="n in lotes"
              :key="n"
              type="button"
              class="ui-pill sm"
              :class="{ on: kDe(r) === n }"
              @click="lote[r.id] = n"
            >
              ×{{ n }}
            </button>
          </div>

          <!-- Ingredientes -->
          <ul class="rc-ings">
            <li class="rc-ings-h">Ingredientes · {{ r.ingredientes.length }}</li>
            <li
              v-for="ing in ingredientesVisibles(r)"
              :key="ing.inventario_id"
              class="rc-ing"
            >
              <span class="rc-dot" :class="estadoIng(ing, r)" :title="textoIng(ing, r)"></span>
              <span class="rc-ing-n">{{ ing.nombre_producto }}</span>
              <span class="rc-ing-q">{{ cant(ing.cantidad * kDe(r)) }} {{ ing.unidad_medida }}</span>
              <span class="rc-ing-c">{{ money(ing.cantidad * ing.precio_unitario * kDe(r)) }}</span>
            </li>
          </ul>
          <button v-if="r.ingredientes.length > 4" type="button" class="rc-link rc-more" @click="abiertos[r.id] = !abiertos[r.id]">
            {{ abiertos[r.id] ? 'Ver menos' : `Ver ${r.ingredientes.length - 4} más` }}
          </button>

          <div class="rc-foot">
            <span class="rc-cap" :class="{ low: alcanza(r) < kDe(r) }">
              Alcanza para <b>{{ alcanza(r) }}</b> {{ alcanza(r) === 1 ? 'unidad' : 'unidades' }}
            </span>
            <button type="button" class="rc-prod" @click="pedirProducir(r)">
              <q-icon name="local_fire_department" size="18px" />
              Producir ×{{ kDe(r) }}
            </button>
          </div>
        </article>
      </transition-group>
    </div>

    <canvas ref="fxRef" class="rc-fx" aria-hidden="true"></canvas>

    <!-- Crear / editar -->
    <q-dialog v-model="showForm" persistent :maximized="$q.screen.lt.sm" transition-show="jump-up" transition-hide="jump-down">
      <q-card class="ui-dialog">
        <div class="ui-dh">
          <div>
            <p class="ui-eyebrow">{{ form.id ? 'Editar' : 'Nueva' }}</p>
            <h2>{{ form.id ? 'Editar receta' : 'Nueva receta' }}</h2>
          </div>
          <button type="button" class="ui-ico" aria-label="Cerrar" @click="showForm = false">
            <q-icon name="close" size="20px" />
          </button>
        </div>

        <q-form class="ui-form" @submit.prevent="guardar">
          <div class="ui-db">
            <q-input
              v-model="form.nombre"
              dense
              outlined
              color="primary"
              label="Nombre de la receta"
              class="ui-field"
              maxlength="80"
              :rules="[(val: string) => !!val.trim() || 'El nombre es requerido']"
            />
            <q-input
              v-model="form.descripcion"
              dense
              outlined
              autogrow
              color="primary"
              label="Descripción (opcional)"
              class="ui-field"
              maxlength="200"
            />

            <div class="rc-price">
              <q-input
                v-model.number="form.precio_venta"
                dense
                outlined
                color="primary"
                type="number"
                min="0"
                step="any"
                prefix="$"
                label="Precio de venta por unidad"
                class="ui-field"
                :rules="[(val: number) => Number(val) >= 0 || 'No puede ser negativo']"
              />
              <div class="ui-quick">
                <span>Fijar margen</span>
                <button
                  v-for="m in margenesRapidos"
                  :key="m"
                  type="button"
                  class="ui-pill sm"
                  :class="{ on: Math.abs(Number(margenForm) - m) < 0.5 }"
                  :disabled="costoForm <= 0"
                  @click="fijarMargen(m)"
                >
                  {{ m }}%
                </button>
              </div>
            </div>

            <div class="ui-sec-head">
              <h3>Ingredientes <small class="ui-mute">(por unidad de producto)</small></h3>
              <button type="button" class="ui-ghost" @click="agregarIngrediente">
                <q-icon name="add" size="18px" /> Agregar
              </button>
            </div>

            <p v-if="inventario.length === 0" class="ui-warn">No hay productos en el inventario. Registra insumos primero.</p>

            <transition-group name="rc-row" tag="div" class="rc-rows">
              <div v-for="(ing, idx) in form.ingredientes" :key="ing.uid" class="rc-row">
                <q-select
                  v-model="ing.inventario_id"
                  dense
                  outlined
                  use-input
                  hide-selected
                  fill-input
                  input-debounce="0"
                  color="primary"
                  class="ui-field"
                  label="Ingrediente"
                  option-value="id"
                  option-label="nombre_producto"
                  emit-value
                  map-options
                  behavior="menu"
                  popup-content-class="ui-menu"
                  :options="opcionesPara(idx)"
                  :rules="[(val: number | null) => !!val || 'Elige un insumo']"
                  @filter="filtrar"
                >
                  <template #option="{ itemProps, opt }">
                    <q-item v-bind="itemProps">
                      <q-item-section>
                        <q-item-label>{{ opt.nombre_producto }}</q-item-label>
                        <q-item-label caption>{{ money(opt.precio_unitario) }} / {{ opt.unidad_medida }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                  <template #no-option>
                    <q-item>
                      <q-item-section class="text-grey-7">Sin resultados</q-item-section>
                    </q-item>
                  </template>
                </q-select>

                <q-input
                  v-model.number="ing.cantidad"
                  dense
                  outlined
                  color="primary"
                  type="number"
                  min="0"
                  step="any"
                  label="Cantidad"
                  class="ui-field"
                  :suffix="unidadDe(ing.inventario_id)"
                  :rules="[(val: number) => Number(val) > 0 || 'Mayor a 0']"
                />

                <span class="rc-line">{{ money(costoFila(ing)) }}</span>

                <button
                  type="button"
                  class="ui-ico danger"
                  aria-label="Quitar ingrediente"
                  :disabled="form.ingredientes.length === 1"
                  @click="quitarIngrediente(idx)"
                >
                  <q-icon name="close" size="18px" />
                </button>
              </div>
            </transition-group>

            <div class="ui-live" :class="tierDe(Number(form.precio_venta) || 0, costoForm)">
              <div class="ui-live-grid">
                <div><span>Costo</span><b>{{ money(costoForm) }}</b></div>
                <div><span>Precio</span><b>{{ money(Number(form.precio_venta) || 0) }}</b></div>
                <div><span>Ganancia</span><b>{{ money((Number(form.precio_venta) || 0) - costoForm) }}</b></div>
                <div><span>Margen</span><b class="tone">{{ margenForm }}%</b></div>
              </div>
              <div class="rc-track"><i :style="{ width: barra(Number(form.precio_venta) || 0, costoForm) + '%' }"></i></div>
            </div>

            <!-- Error al guardar: aviso claro con el motivo real -->
            <div v-if="formError" class="ui-alert" role="alert">
              <q-icon name="error_outline" size="20px" />
              <div>
                <b>{{ formError.titulo }}</b>
                <span>{{ formError.texto }}</span>
              </div>
            </div>
          </div>

          <div class="ui-df">
            <button type="button" class="ui-ghost" @click="showForm = false">Cancelar</button>
            <button type="submit" class="ui-cta" :disabled="submitting">
              <q-spinner v-if="submitting" size="18px" color="white" />
              <span>{{ submitting ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Crear receta' }}</span>
            </button>
          </div>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Confirmar: producir / eliminar -->
    <q-dialog v-model="showConf" :persistent="confBusy" transition-show="jump-up" transition-hide="jump-down">
      <q-card v-if="conf" class="ui-dialog rc-conf">
        <div class="ui-dh">
          <div>
            <p class="ui-eyebrow">{{ conf.tipo === 'producir' ? 'Producción' : 'Eliminar' }}</p>
            <h2>{{ conf.tipo === 'producir' ? `Producir ${conf.k} × ${conf.r.nombre}` : 'Eliminar receta' }}</h2>
          </div>
        </div>
        <div class="ui-db">
          <template v-if="conf.tipo === 'producir'">
            <p class="ui-mute rc-conf-t">Se descontarán estos insumos del inventario. Esta acción queda registrada.</p>
            <ul class="rc-descuento">
              <li v-for="ing in conf.r.ingredientes" :key="ing.inventario_id" :class="estadoIng(ing, conf.r, conf.k)">
                <span class="rc-dot" :class="estadoIng(ing, conf.r, conf.k)"></span>
                <span class="n">{{ ing.nombre_producto }}</span>
                <span class="q">−{{ cant(ing.cantidad * conf.k) }} {{ ing.unidad_medida }}</span>
                <small>quedan {{ cant(restante(ing, conf.k)) }}</small>
              </li>
            </ul>
            <p v-if="faltantesConf.length" class="ui-warn">
              Falta inventario de: {{ faltantesConf.join(', ') }}. Reduce la cantidad o repón esos insumos.
            </p>
          </template>
          <p v-else class="rc-conf-t">
            ¿Seguro que deseas eliminar <b>«{{ conf.r.nombre }}»</b>? Esta acción no se puede deshacer.
          </p>

          <div v-if="confError" class="ui-alert" role="alert">
            <q-icon name="error_outline" size="20px" />
            <div>
              <b>{{ confError.titulo }}</b>
              <span>{{ confError.texto }}</span>
            </div>
          </div>
        </div>
        <div class="ui-df">
          <button type="button" class="ui-ghost" :disabled="confBusy" @click="showConf = false">Cancelar</button>
          <button
            type="button"
            class="ui-cta"
            :class="{ danger: conf.tipo === 'eliminar' }"
            :disabled="confBusy || (conf.tipo === 'producir' && faltantesConf.length > 0)"
            @click="confirmar($event)"
          >
            <q-spinner v-if="confBusy" size="18px" color="white" />
            <span>{{ conf.tipo === 'producir' ? 'Confirmar producción' : 'Eliminar' }}</span>
          </button>
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '../../boot/axios';
import type { AxiosError } from 'axios';
import '../../css/ui.css';

interface Ingrediente {
  inventario_id: number;
  nombre_producto: string;
  unidad_medida: string;
  cantidad: number;
  precio_unitario: number;
}
interface Receta {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio_venta: number;
  costo: number;
  ingredientes: Ingrediente[];
}
interface RecetaRaw extends Omit<Receta, 'precio_venta' | 'costo'> {
  precio_venta: string | number;
  costo: string | number;
}
interface Insumo {
  id: number;
  nombre_producto: string;
  unidad_medida: string;
  precio_unitario: number;
  stock: number;
  stock_minimo: number;
}
interface InsumoRaw extends Omit<Insumo, 'precio_unitario' | 'stock' | 'stock_minimo'> {
  precio_unitario: string | number;
  stock: string | number;
  stock_minimo: string | number;
}
interface FilaIngrediente {
  uid: number;
  inventario_id: number | null;
  cantidad: number;
}
interface Aviso {
  titulo: string;
  texto: string;
}

type Filtro = 'todas' | 'hi' | 'mid' | 'lo';
type Orden = 'nombre' | 'margen' | 'costo';
type Tier = 'hi' | 'mid' | 'lo' | 'neg';
type EstadoIng = 'ok' | 'warn' | 'bad';

const $q = useQuasar();
const loading = ref(false);
const submitting = ref(false);
const showForm = ref(false);
const recetas = ref<Receta[]>([]);
const inventario = ref<Insumo[]>([]);
const loadError = ref<Aviso | null>(null);
const formError = ref<Aviso | null>(null);

/* ---------- Mensajes de error con el motivo real ---------- */
const avisoDe = (error: unknown, titulo: string): Aviso => {
  const err = error as AxiosError<unknown>;
  if (!err.response) {
    return {
      titulo: 'Sin conexión con el servidor',
      texto: 'Revisa que el servidor esté encendido y que la dirección de la API sea correcta.',
    };
  }
  const data = err.response.data;
  let srv = '';
  if (data && typeof data === 'object') {
    const d = data as { error?: unknown; mensaje?: unknown; message?: unknown };
    const crudo = d.error ?? d.mensaje ?? d.message;
    srv = typeof crudo === 'string' ? crudo : '';
  }
  if (srv) return { titulo, texto: srv };
  return {
    titulo: `${titulo} (código ${err.response.status})`,
    texto:
      err.response.status >= 500
        ? 'El servidor falló sin dar detalles. Revisa los registros del backend (docker compose logs backend).'
        : 'El servidor rechazó la solicitud.',
  };
};

/* ---------- Búsqueda, filtro y orden ---------- */
const busqueda = ref('');
const filtro = ref<Filtro>('todas');
const orden = ref<Orden>('nombre');
const searchRef = ref<HTMLInputElement | null>(null);

const filtros: { id: Filtro; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'hi', label: 'Rentables' },
  { id: 'mid', label: 'Ajustadas' },
  { id: 'lo', label: 'En riesgo' },
];
const ordenes: { id: Orden; label: string }[] = [
  { id: 'nombre', label: 'Nombre' },
  { id: 'margen', label: 'Margen' },
  { id: 'costo', label: 'Costo' },
];
const margenesRapidos = [30, 40, 50, 60];
const lotes = [1, 2, 5, 10];

/* ---------- Formato y cálculos ---------- */
const money = (n: number): string => `${n < 0 ? '-' : ''}$${Math.abs(Number.isFinite(n) ? n : 0).toFixed(2)}`;
const cant = (n: number): string => String(Math.round(n * 1000) / 1000);

const margenNum = (precio: number, costo: number): number => (precio > 0 ? ((precio - costo) / precio) * 100 : 0);
const margen = (precio: number, costo: number): string => margenNum(precio, costo).toFixed(1);
const barra = (precio: number, costo: number): number => Math.max(0, Math.min(100, margenNum(precio, costo)));

const tierDe = (precio: number, costo: number): Tier => {
  if (precio <= 0 || precio < costo) return 'neg';
  const m = margenNum(precio, costo);
  if (m >= 50) return 'hi';
  if (m >= 25) return 'mid';
  return 'lo';
};
const tier = (r: Receta): Tier => tierDe(r.precio_venta, r.costo);

const grupoFiltro = (r: Receta): Filtro => {
  const t = tier(r);
  return t === 'neg' || t === 'lo' ? 'lo' : t;
};
const conteoFiltro = (f: Filtro): number =>
  f === 'todas' ? recetas.value.length : recetas.value.filter((r) => grupoFiltro(r) === f).length;

const visibles = computed<Receta[]>(() => {
  const q = busqueda.value.trim().toLowerCase();
  const lista = recetas.value.filter((r) => {
    if (filtro.value !== 'todas' && grupoFiltro(r) !== filtro.value) return false;
    if (!q) return true;
    return (
      r.nombre.toLowerCase().includes(q) ||
      (r.descripcion ?? '').toLowerCase().includes(q) ||
      r.ingredientes.some((i) => i.nombre_producto.toLowerCase().includes(q))
    );
  });
  const copia = [...lista];
  if (orden.value === 'nombre') copia.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  if (orden.value === 'margen') copia.sort((a, b) => margenNum(b.precio_venta, b.costo) - margenNum(a.precio_venta, a.costo));
  if (orden.value === 'costo') copia.sort((a, b) => b.costo - a.costo);
  return copia;
});

const limpiarFiltros = (): void => {
  busqueda.value = '';
  filtro.value = 'todas';
};

/* ---------- Resumen con conteo animado ---------- */
const stats = computed(() => {
  const n = recetas.value.length;
  const conPrecio = recetas.value.filter((r) => r.precio_venta > 0);
  const avg = conPrecio.length ? conPrecio.reduce((a, r) => a + margenNum(r.precio_venta, r.costo), 0) / conPrecio.length : 0;
  const cost = n ? recetas.value.reduce((a, r) => a + r.costo, 0) / n : 0;
  const mejor = conPrecio.length
    ? conPrecio.reduce((a, r) => (margenNum(r.precio_venta, r.costo) > margenNum(a.precio_venta, a.costo) ? r : a))
    : null;
  return { total: n, avg, cost, mejor };
});

const reducido = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const shown = reactive({ total: 0, avg: 0, cost: 0 });
let raf = 0;
const animarStats = (to: { total: number; avg: number; cost: number }): void => {
  cancelAnimationFrame(raf);
  if (reducido) {
    Object.assign(shown, to);
    return;
  }
  const from = { ...shown };
  const t0 = performance.now();
  const step = (t: number): void => {
    const k = Math.min(1, (t - t0) / 700);
    const e = 1 - Math.pow(1 - k, 3);
    shown.total = from.total + (to.total - from.total) * e;
    shown.avg = from.avg + (to.avg - from.avg) * e;
    shown.cost = from.cost + (to.cost - from.cost) * e;
    if (k < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
};
watch(stats, (s) => animarStats({ total: s.total, avg: s.avg, cost: s.cost }));

/* Luz que sigue al puntero sobre cada tarjeta */
const foco = (e: PointerEvent): void => {
  if (e.pointerType === 'touch') return;
  const el = e.currentTarget as HTMLElement;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - r.left}px`);
  el.style.setProperty('--my', `${e.clientY - r.top}px`);
};

/* ---------- Tarjetas: simulador, unidades, inventario ---------- */
const lote = reactive<Record<number, number>>({});
const sim = reactive<Record<number, number>>({});
const abiertos = reactive<Record<number, boolean>>({});
const guardandoPrecio = ref<number | null>(null);

const kDe = (r: Receta): number => lote[r.id] ?? 1;
const precioDe = (r: Receta): number => sim[r.id] ?? r.precio_venta;
const cambiado = (r: Receta): boolean => sim[r.id] !== undefined && Math.abs(sim[r.id]! - r.precio_venta) > 0.004;
const tierCard = (r: Receta): Tier => tierDe(precioDe(r), r.costo);

const rango = (r: Receta): { min: number; max: number } => {
  const min = Math.max(0.5, Math.round(r.costo * 0.8 * 100) / 100);
  const max = Math.max(min + 1, Math.round(Math.max(r.precio_venta, r.costo) * 2 * 100) / 100);
  return { min, max };
};
const pctRango = (r: Receta): number => {
  const { min, max } = rango(r);
  return Math.max(0, Math.min(100, ((precioDe(r) - min) / (max - min)) * 100));
};
const simular = (r: Receta, e: Event): void => {
  sim[r.id] = Number((e.target as HTMLInputElement).value);
};
const restablecer = (r: Receta): void => {
  delete sim[r.id];
};

const mapaInv = computed(() => new Map(inventario.value.map((i) => [i.id, i])));
const ingredientesVisibles = (r: Receta): Ingrediente[] =>
  abiertos[r.id] || r.ingredientes.length <= 4 ? r.ingredientes : r.ingredientes.slice(0, 4);

const estadoIng = (ing: Ingrediente, _r: Receta, k?: number): EstadoIng => {
  const inv = mapaInv.value.get(ing.inventario_id);
  if (!inv) return 'ok';
  const unidades = k ?? kDe(_r);
  const need = ing.cantidad * unidades;
  if (need > inv.stock + 1e-9) return 'bad';
  return inv.stock - need < inv.stock_minimo ? 'warn' : 'ok';
};
const textoIng = (ing: Ingrediente, r: Receta): string => {
  const inv = mapaInv.value.get(ing.inventario_id);
  return inv ? `Hay ${cant(inv.stock)} ${inv.unidad_medida} · necesitas ${cant(ing.cantidad * kDe(r))}` : '';
};
const alcanza = (r: Receta): number => {
  let min = Infinity;
  for (const ing of r.ingredientes) {
    const inv = mapaInv.value.get(ing.inventario_id);
    if (!inv || ing.cantidad <= 0) continue;
    min = Math.min(min, Math.floor((inv.stock + 1e-9) / ing.cantidad));
  }
  return Number.isFinite(min) ? min : 0;
};
const restante = (ing: Ingrediente, k: number): number => {
  const inv = mapaInv.value.get(ing.inventario_id);
  return (inv?.stock ?? 0) - ing.cantidad * k;
};

const guardarPrecio = async (r: Receta): Promise<void> => {
  guardandoPrecio.value = r.id;
  try {
    await api.put(`/recetas/${r.id}`, {
      nombre: r.nombre,
      descripcion: r.descripcion ?? '',
      precio_venta: precioDe(r),
      ingredientes: r.ingredientes.map((i) => ({ inventario_id: i.inventario_id, cantidad: i.cantidad })),
    });
    $q.notify({ type: 'positive', message: `Precio de «${r.nombre}» actualizado a ${money(precioDe(r))}` });
    delete sim[r.id];
    await cargarRecetas();
  } catch (error) {
    const a = avisoDe(error, 'No se pudo guardar el precio');
    $q.notify({ type: 'negative', message: `${a.titulo}. ${a.texto}`, timeout: 6000 });
  } finally {
    guardandoPrecio.value = null;
  }
};

/* ---------- Confirmaciones: producir / eliminar ---------- */
const showConf = ref(false);
const conf = ref<{ tipo: 'producir' | 'eliminar'; r: Receta; k: number } | null>(null);
const confBusy = ref(false);
const confError = ref<Aviso | null>(null);

const faltantesConf = computed<string[]>(() => {
  const c = conf.value;
  if (!c || c.tipo !== 'producir') return [];
  return c.r.ingredientes.filter((i) => estadoIng(i, c.r, c.k) === 'bad').map((i) => i.nombre_producto);
});

const pedirProducir = (r: Receta): void => {
  conf.value = { tipo: 'producir', r, k: kDe(r) };
  confError.value = null;
  showConf.value = true;
};
const pedirEliminar = (r: Receta): void => {
  conf.value = { tipo: 'eliminar', r, k: 1 };
  confError.value = null;
  showConf.value = true;
};

const confirmar = async (e: MouseEvent): Promise<void> => {
  const c = conf.value;
  if (!c) return;
  confBusy.value = true;
  confError.value = null;
  try {
    if (c.tipo === 'producir') {
      const { data } = await api.post<{ bajo_minimo?: { nombre_producto: string }[] }>('/produccion', {
        receta_id: c.r.id,
        cantidad: c.k,
      });
      showConf.value = false;
      confetti(e.clientX, e.clientY);
      $q.notify({ type: 'positive', message: `Producción registrada: ${c.k} × ${c.r.nombre}. Inventario descontado.` });
      const bajos = data.bajo_minimo ?? [];
      if (bajos.length) {
        $q.notify({
          type: 'warning',
          message: `Por reponer: ${bajos.map((b) => b.nombre_producto).join(', ')}`,
          timeout: 6000,
        });
      }
      await cargarInventario();
      window.dispatchEvent(new Event('inventario-actualizado'));
    } else {
      await api.delete(`/recetas/${c.r.id}`);
      showConf.value = false;
      $q.notify({ type: 'positive', message: `Receta «${c.r.nombre}» eliminada` });
      await cargarRecetas();
    }
  } catch (error) {
    confError.value = avisoDe(error, c.tipo === 'producir' ? 'No se pudo registrar la producción' : 'No se pudo eliminar la receta');
  } finally {
    confBusy.value = false;
  }
};

/* ---------- Confeti ---------- */
const fxRef = ref<HTMLCanvasElement | null>(null);
interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  r: number;
  vr: number;
  c: string;
  l: number;
}
let particulas: Particula[] = [];
let fxActivo = false;
const COLORES = ['#c8641f', '#f2c27a', '#8a4a2a', '#fff0cf', '#d99a6c', '#e19434'];
const confetti = (x: number, y: number): void => {
  const cv = fxRef.value;
  if (!cv || reducido) return;
  const d = window.devicePixelRatio || 1;
  cv.width = window.innerWidth * d;
  cv.height = window.innerHeight * d;
  cv.getContext('2d')?.setTransform(d, 0, 0, d, 0, 0);
  for (let i = 0; i < 80; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    const v = 4 + Math.random() * 7;
    particulas.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      w: 8 + Math.random() * 7, h: 4 + Math.random() * 3,
      r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      c: COLORES[i % COLORES.length] ?? '#c8641f', l: 1,
    });
  }
  if (!fxActivo) {
    fxActivo = true;
    requestAnimationFrame(tickFx);
  }
};
const tickFx = (): void => {
  const cv = fxRef.value;
  const ctx = cv?.getContext('2d');
  if (!cv || !ctx) {
    fxActivo = false;
    return;
  }
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  particulas = particulas.filter((p) => {
    p.vy += 0.22; p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.l -= 0.011;
    return p.l > 0 && p.y < window.innerHeight + 30;
  });
  for (const p of particulas) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.l * 1.6));
    ctx.translate(p.x, p.y);
    ctx.rotate(p.r);
    ctx.fillStyle = p.c;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
  if (particulas.length) requestAnimationFrame(tickFx);
  else {
    fxActivo = false;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
};

/* ---------- Formulario ---------- */
let uidSeq = 0;
const nuevaFila = (inventario_id: number | null = null, cantidad = 0): FilaIngrediente => ({
  uid: ++uidSeq,
  inventario_id,
  cantidad,
});
const formVacio = () => ({
  id: null as number | null,
  nombre: '',
  descripcion: '',
  precio_venta: 0 as number | string,
  ingredientes: [nuevaFila()] as FilaIngrediente[],
});
const form = reactive(formVacio());

const unidadDe = (id: number | null): string => inventario.value.find((i) => i.id === id)?.unidad_medida ?? '';
const costoFila = (ing: FilaIngrediente): number => {
  const insumo = inventario.value.find((i) => i.id === ing.inventario_id);
  return insumo ? insumo.precio_unitario * (Number(ing.cantidad) || 0) : 0;
};
const costoForm = computed(() => form.ingredientes.reduce((acc, ing) => acc + costoFila(ing), 0));
const margenForm = computed(() => margen(Number(form.precio_venta) || 0, costoForm.value));

const fijarMargen = (m: number): void => {
  if (costoForm.value <= 0) return;
  form.precio_venta = Math.round((costoForm.value / (1 - m / 100)) * 100) / 100;
};

/* Selector de ingredientes con búsqueda; no deja repetir insumos */
const filtroTxt = ref('');
const filtrar = (val: string, update: (cb: () => void) => void): void => {
  update(() => {
    filtroTxt.value = val.trim().toLowerCase();
  });
};
const opcionesPara = (idx: number): Insumo[] => {
  const usados = new Set(
    form.ingredientes.filter((_, i) => i !== idx).map((f) => f.inventario_id).filter((v): v is number => v !== null),
  );
  return inventario.value.filter(
    (i) => !usados.has(i.id) && (!filtroTxt.value || i.nombre_producto.toLowerCase().includes(filtroTxt.value)),
  );
};

/* ---------- API ---------- */
const cargarRecetas = async (): Promise<void> => {
  loading.value = true;
  try {
    const { data } = await api.get<RecetaRaw[]>('/recetas');
    recetas.value = data.map((r) => ({
      ...r,
      precio_venta: Number(r.precio_venta),
      costo: Number(r.costo),
      ingredientes: r.ingredientes.map((i) => ({
        ...i,
        cantidad: Number(i.cantidad),
        precio_unitario: Number(i.precio_unitario),
      })),
    }));
    loadError.value = null;
  } catch (error) {
    const err = error as AxiosError;
    recetas.value = [];
    // 404 = todavía no hay recetas; cualquier otro fallo se muestra con su motivo
    loadError.value = err.response?.status === 404 ? null : avisoDe(error, 'No se pudieron cargar las recetas');
  } finally {
    loading.value = false;
  }
};

const cargarInventario = async (): Promise<void> => {
  try {
    const { data } = await api.get<InsumoRaw[]>('/inventario');
    inventario.value = data.map((i) => ({
      ...i,
      precio_unitario: Number(i.precio_unitario),
      stock: Number(i.stock),
      stock_minimo: Number(i.stock_minimo),
    }));
  } catch {
    inventario.value = [];
  }
};

const recargar = async (): Promise<void> => {
  await Promise.all([cargarRecetas(), cargarInventario()]);
};

const abrirNueva = (): void => {
  Object.assign(form, formVacio());
  formError.value = null;
  showForm.value = true;
};
const llenarDesde = (r: Receta, id: number | null, nombre: string): void => {
  Object.assign(form, {
    id,
    nombre,
    descripcion: r.descripcion ?? '',
    precio_venta: r.precio_venta,
    ingredientes: r.ingredientes.map((i) => nuevaFila(i.inventario_id, i.cantidad)),
  });
  formError.value = null;
  showForm.value = true;
};
const abrirEditar = (r: Receta): void => llenarDesde(r, r.id, r.nombre);
const abrirDuplicar = (r: Receta): void => llenarDesde(r, null, `${r.nombre} (copia)`);

const agregarIngrediente = (): void => {
  form.ingredientes.push(nuevaFila());
};
const quitarIngrediente = (idx: number): void => {
  form.ingredientes.splice(idx, 1);
};

const guardar = async (): Promise<void> => {
  formError.value = null;
  const ids = form.ingredientes.map((i) => i.inventario_id);
  if (new Set(ids).size !== ids.length) {
    formError.value = { titulo: 'Ingrediente repetido', texto: 'Cada insumo solo puede aparecer una vez en la receta.' };
    return;
  }

  submitting.value = true;
  const payload = {
    nombre: form.nombre.trim(),
    descripcion: form.descripcion.trim(),
    precio_venta: Number(form.precio_venta) || 0,
    ingredientes: form.ingredientes.map((i) => ({
      inventario_id: i.inventario_id,
      cantidad: Number(i.cantidad),
    })),
  };
  try {
    if (form.id) {
      await api.put(`/recetas/${form.id}`, payload);
      $q.notify({ type: 'positive', message: 'Receta actualizada' });
    } else {
      await api.post('/recetas', payload);
      $q.notify({ type: 'positive', message: 'Receta creada exitosamente' });
    }
    showForm.value = false;
    await cargarRecetas();
  } catch (error) {
    formError.value = avisoDe(error, 'No se pudo guardar la receta');
    await nextTick();
    document.querySelector('.ui-dialog .ui-alert')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } finally {
    submitting.value = false;
  }
};

const atajo = (e: KeyboardEvent): void => {
  const t = e.target as HTMLElement | null;
  const escribiendo = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  if (e.key === '/' && !escribiendo && !showForm.value && !showConf.value) {
    e.preventDefault();
    searchRef.value?.focus();
  }
};

onMounted(() => {
  window.addEventListener('keydown', atajo);
  void recargar();
});
onUnmounted(() => {
  window.removeEventListener('keydown', atajo);
  cancelAnimationFrame(raf);
});
</script>

<style>
.rc-stat-name {
  font-size: 20px !important;
  line-height: 1.5 !important;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rc-fx {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 6000;
}

/* Cuadrícula y tarjetas */
.rc-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: 18px;
  align-items: start;
}
.rc-card {
  --tone: var(--mid);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--panel);
  box-shadow: 0 10px 28px rgba(92, 48, 14, 0.1);
  overflow: hidden;
  transition: transform 0.25s var(--ease), border-color 0.25s, box-shadow 0.25s;
}
.rc-card.hi { --tone: var(--hi); }
.rc-card.mid { --tone: var(--mid); }
.rc-card.lo { --tone: var(--lo); }
.rc-card.neg { --tone: var(--neg); }
.rc-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(320px circle at var(--mx, 50%) var(--my, 0), rgba(225, 148, 52, 0.2), transparent 62%);
  transition: opacity 0.25s;
}
.rc-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent-2);
  box-shadow: 0 22px 44px var(--shadow);
}
.rc-card:hover::before {
  opacity: 1;
}
.rc-card > * {
  position: relative;
}
.rc-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}
.rc-card-name h3 {
  margin: 0;
  font-size: 19px;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: var(--choco);
  overflow-wrap: anywhere;
}
.rc-card-name p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--mute);
}
.rc-acts {
  display: flex;
  gap: 2px;
  opacity: 0.6;
  transition: opacity 0.2s;
}
.rc-card:hover .rc-acts,
.rc-acts:focus-within {
  opacity: 1;
}
.rc-nums {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.rc-nums > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(217, 130, 43, 0.1);
}
.rc-nums span {
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mute);
}
.rc-nums b {
  font-size: 17px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.rc-nums b.neg {
  color: var(--neg);
}
.rc-margin-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 7px;
  font-size: 13px;
  color: var(--mute);
}
.rc-margin-row b {
  font-size: 15px;
  color: var(--tone);
  font-variant-numeric: tabular-nums;
}
.rc-track {
  height: 7px;
  border-radius: 999px;
  background: rgba(59, 33, 18, 0.13);
  overflow: hidden;
}
.rc-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--tone, var(--accent));
  transition: width 0.5s var(--ease), background 0.3s;
}
.ui-live .rc-track i {
  background: var(--tone);
}

/* Simulador de precio */
.rc-sim {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--mute);
}
.rc-sim output {
  min-width: 52px;
  text-align: right;
  font-weight: 600;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.rc-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 99px;
  background: linear-gradient(90deg, var(--accent) var(--p, 50%), rgba(59, 33, 18, 0.13) var(--p, 50%));
  outline-offset: 6px;
  cursor: pointer;
}
.rc-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid var(--accent);
  box-shadow: 0 2px 8px var(--shadow);
  transition: transform 0.15s;
}
.rc-range::-moz-range-thumb {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid var(--accent);
  box-shadow: 0 2px 8px var(--shadow);
}
.rc-range:active::-webkit-slider-thumb {
  transform: scale(1.2);
}
.rc-sim-acts {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: -4px;
}
.rc-link {
  border: 0;
  background: none;
  padding: 0;
  font: 500 13px 'IBM Plex Sans', sans-serif;
  color: var(--accent-ink);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}
.rc-mini {
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
}
.rc-batch {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--mute);
}

/* Ingredientes */
.rc-ings {
  margin: 0;
  padding: 12px 0 0;
  list-style: none;
  border-top: 1px solid var(--line);
}
.rc-ings-h {
  padding-bottom: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--mute);
}
.rc-ing {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  font-size: 14px;
}
.rc-ing-n {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rc-ing-q {
  font-size: 13px;
  color: var(--mute);
  font-variant-numeric: tabular-nums;
}
.rc-ing-c {
  min-width: 52px;
  text-align: right;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.rc-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--hi);
  box-shadow: 0 0 0 3px rgba(42, 132, 83, 0.22);
}
.rc-dot.warn {
  background: var(--mid);
  box-shadow: 0 0 0 3px rgba(176, 114, 15, 0.22);
}
.rc-dot.bad {
  background: var(--neg);
  box-shadow: 0 0 0 3px rgba(191, 58, 44, 0.24);
}
.rc-more {
  align-self: flex-start;
  text-decoration: none;
}
.rc-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}
.rc-cap {
  font-size: 12px;
  color: var(--mute);
}
.rc-cap b {
  color: var(--ink);
}
.rc-cap.low b {
  color: var(--neg);
}
.rc-prod {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px;
  border: 0;
  border-radius: 10px;
  color: #fff;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  font: 600 13px 'IBM Plex Sans', sans-serif;
  cursor: pointer;
  transition: transform 0.2s var(--ease), box-shadow 0.2s;
}
.rc-prod:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 22px var(--shadow);
}
.rc-prod:active {
  transform: scale(0.96);
}

/* Lista animada */
.rc-list-enter-active,
.rc-list-leave-active {
  transition: opacity 0.35s var(--ease), transform 0.35s var(--ease);
  transition-delay: calc(var(--i, 0) * 45ms);
}
.rc-list-leave-active {
  position: absolute;
  transition-delay: 0s;
}
.rc-list-enter-from {
  opacity: 0;
  transform: translateY(16px);
}
.rc-list-leave-to {
  opacity: 0;
  transform: scale(0.94);
}
.rc-list-move {
  transition: transform 0.4s var(--ease);
}

/* Formulario */
.rc-price {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 14px;
  align-items: start;
}
.rc-price .ui-quick {
  flex-direction: column;
  align-items: flex-start;
}
.rc-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rc-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 130px 64px 34px;
  gap: 8px;
  align-items: start;
}
.rc-line {
  align-self: center;
  text-align: right;
  font-weight: 600;
  font-size: 14px;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.rc-row .ui-ico {
  align-self: center;
}
.rc-row-enter-active,
.rc-row-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}
.rc-row-enter-from,
.rc-row-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

/* Confirmaciones */
.ui-dialog.rc-conf {
  width: 480px;
}
.rc-conf-t {
  margin: 0;
}
.rc-descuento {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.rc-descuento li {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  align-items: center;
  gap: 4px 10px;
  font-size: 14px;
}
.rc-descuento .q {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.rc-descuento small {
  grid-column: 2 / -1;
  margin-top: -4px;
  color: var(--mute);
}
.ui-cta.danger {
  background: linear-gradient(135deg, #bf3a2c, #d65a44);
  box-shadow: 0 10px 24px rgba(191, 58, 44, 0.3);
}

@media (max-width: 599px) {
  .rc-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .rc-price {
    grid-template-columns: 1fr;
  }
  .rc-price .ui-quick {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
  }
  .rc-row {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 34px;
  }
  .rc-row .rc-line {
    display: none;
  }
  .rc-foot {
    flex-wrap: wrap;
  }
  .rc-prod {
    flex: 1;
    justify-content: center;
  }
  .rc-nums b {
    font-size: 15px;
  }
}
</style>
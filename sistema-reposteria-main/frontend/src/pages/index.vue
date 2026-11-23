<template>
  <q-layout view="hHh LpR lFf" class="ly">
    <!-- Chispas decorativas de fondo -->
    <div class="ly-sprinkles" aria-hidden="true">
      <i v-for="(s, k) in sprinkles" :key="k" :class="'c' + s.c" :style="s.style"></i>
    </div>

    <!-- Cabecera -->
    <q-header class="ly-header">
      <q-toolbar>
        <q-btn flat round dense icon="menu" class="lt-md ly-burger" aria-label="Abrir menú" @click="drawer = !drawer" />

        <q-toolbar-title class="ly-crumb">
          <span class="ly-crumb-root">Repostería</span>
          <template v-if="seccion">
            <q-icon name="chevron_right" size="18px" class="ly-crumb-sep" />
            <transition name="title" mode="out-in">
              <span :key="seccion" class="ly-crumb-now">{{ seccion }}</span>
            </transition>
          </template>
        </q-toolbar-title>

        <span class="ly-role gt-xs">
          <q-icon name="badge" size="16px" />
          {{ usuario?.rol ?? 'usuario' }}
        </span>

        <q-btn flat no-caps class="ly-user">
          <q-avatar size="32px" class="ly-avatar">{{ iniciales }}</q-avatar>
          <span class="ly-user-name gt-xs">{{ usuario?.nombre ?? 'Usuario' }}</span>
          <q-icon name="expand_more" size="18px" />

          <q-menu class="ly-menu" anchor="bottom right" self="top right" :offset="[0, 8]" transition-show="jump-down" transition-hide="jump-up">
            <q-list style="min-width: 210px">
              <q-item>
                <q-item-section>
                  <q-item-label caption>Sesión iniciada como</q-item-label>
                  <q-item-label>{{ usuario?.email }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator />
              <q-item v-close-popup clickable class="ly-logout" @click="logout">
                <q-item-section avatar><q-icon name="logout" /></q-item-section>
                <q-item-section>Cerrar sesión</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- Menú lateral -->
    <q-drawer v-model="drawer" show-if-above :width="250" :breakpoint="1023" class="ly-drawer">
      <div class="ly-drawer-in">
        <div class="ly-brand">
          <div class="ly-logo" :class="{ fallback: !logoSrc }">
            <img v-if="logoSrc" :src="logoSrc" alt="Repostería" @error="onLogoError" />
            <q-icon v-else name="bakery_dining" size="28px" />
          </div>
          <div>
            <div class="ly-brand-n">Repostería</div>
            <div class="ly-brand-s">Sistema de Gestión</div>
          </div>
        </div>

        <q-list class="ly-nav">
          <q-item
            v-for="item in menu"
            :key="item.label"
            v-ripple
            :to="item.to || undefined"
            :disable="!item.to"
            exact
            clickable
            class="ly-item"
            active-class="ly-active"
            @click="cerrarEnMovil"
          >
            <q-item-section avatar>
              <span class="ly-tile"><q-icon :name="item.icon" size="20px" /></span>
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ item.label }}</q-item-label>
              <q-item-label v-if="!item.to" caption class="ly-soon">Próximamente</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <!--
          Panel de inventario:
          - Con insumos por reponer: lista de compras con costo estimado y acceso directo.
          - Con todo en orden: salud del inventario y los insumos más cerca de su mínimo.
        -->
        <div class="ly-shop" :class="{ alert: bajos.length > 0 }">
          <div class="ly-shop-head">
            <div
              class="ly-ring"
              :style="{ '--p': salud, '--ring': colorAnillo }"
              role="img"
              :aria-label="`Salud del inventario: ${salud}%`"
            >
              <b>{{ total ? salud + '%' : '—' }}</b>
            </div>
            <div class="ly-shop-ttl">
              <h4>{{ bajos.length ? 'Lista de compras' : 'Salud del inventario' }}</h4>
              <p v-if="!cargado">Revisando existencias…</p>
              <p v-else-if="fallo">No se pudo cargar</p>
              <p v-else-if="total === 0">Aún no hay insumos</p>
              <p v-else-if="bajos.length">
                <b>{{ bajos.length }}</b> por reponer · ≈ {{ money(costoReponer) }}
              </p>
              <p v-else>{{ total }} de {{ total }} insumos al día</p>
            </div>
          </div>

          <template v-if="bajos.length">
            <ul class="ly-shop-list">
              <li v-for="b in bajos.slice(0, 3)" :key="b.id">
                <span>{{ b.nombre_producto }}</span>
                <b>{{ cant(b.stock) }} {{ b.unidad_medida }}</b>
              </li>
              <li v-if="bajos.length > 3" class="more">y {{ bajos.length - 3 }} más</li>
            </ul>
            <button type="button" class="ly-shop-btn" @click="verCompras">
              <span>Ver lista completa</span>
              <q-icon name="arrow_forward" size="16px" />
            </button>
          </template>

          <template v-else-if="vigilancia.length">
            <h5>Más cerca de su mínimo</h5>
            <ul class="ly-watch">
              <li
                v-for="v in vigilancia"
                :key="v.id"
                :class="{ warn: v.ratio <= 1.5 }"
                :title="`${cant(v.stock)} ${v.unidad_medida} · mínimo ${cant(v.stock_minimo)} ${v.unidad_medida}`"
              >
                <div class="ly-watch-top">
                  <span>{{ v.nombre_producto }}</span>
                  <b>×{{ v.ratio.toFixed(1) }}</b>
                </div>
                <span class="ly-watch-bar"><i :style="{ width: Math.min(100, (v.ratio / 3) * 100) + '%' }"></i></span>
              </li>
            </ul>
            <p class="ly-shop-foot">
              {{
                cercanos > 0
                  ? `${cercanos} ${cercanos === 1 ? 'insumo está' : 'insumos están'} cerca de su mínimo.`
                  : 'Nada cerca del mínimo por ahora.'
              }}
            </p>
          </template>
        </div>
      </div>
    </q-drawer>

    <q-page-container class="ly-main">
      <router-view #default="{ Component, route: r }">
        <transition name="page" mode="out-in">
          <component :is="Component" :key="r.path" />
        </transition>
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { api } from '../boot/axios';
import '../css/ui.css';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
}
interface Insumo {
  id: number;
  nombre_producto: string;
  unidad_medida: string;
  stock: number;
  stock_minimo: number;
  precio_unitario: number;
}

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const drawer = ref(false);

// Este layout usa el tema claro (caramelo): se asegura de que Quasar no esté en modo oscuro
const modoPrevio = $q.dark.mode;
$q.dark.set(false);
onBeforeUnmount(() => {
  $q.dark.set(modoPrevio);
  window.removeEventListener('inventario-actualizado', alActualizarInventario);
});

// El logo prueba varias rutas; si ninguna existe, se muestra un ícono de respaldo
const logoSources = ['/logo.jpeg', '/logo.jpg', '/Reposteria%20logo.jpeg', '/Reposteria%20logo.jpg'];
const logoIdx = ref(0);
const logoSrc = computed<string | null>(() => logoSources[logoIdx.value] ?? null);
const onLogoError = (e: Event): void => {
  const failed = (e.target as HTMLImageElement).getAttribute('src');
  if (failed === logoSrc.value) logoIdx.value += 1;
};

const usuario = ref<Usuario | null>(null);
try {
  const raw = localStorage.getItem('usuario');
  usuario.value = raw ? (JSON.parse(raw) as Usuario) : null;
} catch {
  usuario.value = null;
}

const iniciales = computed(() =>
  (usuario.value?.nombre ?? 'U')
    .split(' ')
    .map((p) => p.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase(),
);

const menu = [
  { label: 'Inventario', icon: 'inventory_2', to: '/' },
  { label: 'Recetas', icon: 'receipt_long', to: '/recetas' },
  { label: 'Pedidos', icon: 'shopping_bag', to: '/pedidos' },
  { label: 'Pagos', icon: 'payments', to: '/pagos' },
  { label: 'Reportes', icon: 'insights', to: '/reportes' },
];
const seccion = computed<string | null>(() => menu.find((m) => m.to === route.path)?.label ?? null);

const cerrarEnMovil = (): void => {
  if ($q.screen.lt.md) drawer.value = false;
};

const logout = async (): Promise<void> => {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  await router.push('/login');
};

/* ---------- Panel de inventario (lista de compras / salud) ---------- */
const todos = ref<Insumo[]>([]);
const cargado = ref(false);
const fallo = ref(false);

const money = (n: number): string => `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
const cant = (n: number): string => String(Math.round(n * 100) / 100);

const total = computed(() => todos.value.length);

// Insumos en o bajo su mínimo, los más críticos primero
const bajos = computed(() =>
  todos.value
    .filter((i) => i.stock <= i.stock_minimo)
    .sort((a, b) => a.stock / (a.stock_minimo || 1) - b.stock / (b.stock_minimo || 1)),
);

// Porcentaje de insumos que están por encima de su mínimo
const salud = computed(() =>
  total.value ? Math.round(((total.value - bajos.value.length) / total.value) * 100) : 0,
);
const colorAnillo = computed(() => (salud.value >= 80 ? '#8fd9a8' : salud.value >= 50 ? '#f0b866' : '#ff9a8a'));

const costoReponer = computed(() =>
  bajos.value.reduce((acc, i) => acc + Math.max(i.stock_minimo - i.stock, 0) * i.precio_unitario, 0),
);

// Cuántas veces supera el stock a su mínimo (×1.0 = justo en el mínimo)
const sobreMinimo = computed(() =>
  todos.value
    .filter((i) => i.stock_minimo > 0 && i.stock > i.stock_minimo)
    .map((i) => ({ ...i, ratio: i.stock / i.stock_minimo }))
    .sort((a, b) => a.ratio - b.ratio),
);
const vigilancia = computed(() => sobreMinimo.value.slice(0, 3));
const cercanos = computed(() => sobreMinimo.value.filter((i) => i.ratio <= 1.5).length);

async function cargarBajos(): Promise<void> {
  try {
    const { data } = await api.get<Insumo[]>('/inventario');
    todos.value = data.map((i) => ({
      ...i,
      stock: Number(i.stock),
      stock_minimo: Number(i.stock_minimo ?? 0),
      precio_unitario: Number(i.precio_unitario ?? 0),
    }));
    fallo.value = false;
  } catch {
    todos.value = [];
    fallo.value = true;
  } finally {
    cargado.value = true;
  }
}

// Lleva al inventario y abre allí la lista de compras completa
const verCompras = async (): Promise<void> => {
  cerrarEnMovil();
  await router.push({ path: '/', query: { compras: '1' } });
};

const alActualizarInventario = (): void => {
  void cargarBajos();
};
onMounted(() => {
  void cargarBajos();
  window.addEventListener('inventario-actualizado', alActualizarInventario);
});
watch(() => route.path, () => void cargarBajos());

/* ---------- Chispas de fondo (posiciones fijas) ---------- */
const sprinkles = (() => {
  let s = 11;
  const rnd = (): number => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 46 }, () => ({
    c: Math.floor(rnd() * 4),
    style: {
      left: `${(rnd() * 100).toFixed(1)}%`,
      top: `${(rnd() * 100).toFixed(1)}%`,
      width: `${(9 + rnd() * 9).toFixed(0)}px`,
      transform: `rotate(${(rnd() * 180).toFixed(0)}deg)`,
      animationDelay: `${(-rnd() * 8).toFixed(1)}s`,
      animationDuration: `${(7 + rnd() * 5).toFixed(1)}s`,
      '--r2': `${(rnd() * 180).toFixed(0)}deg`,
    },
  }));
})();
</script>

<style lang="scss">
.ly {
  --ly-h: 60px;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  background:
    radial-gradient(900px 520px at 8% -8%, rgba(255, 230, 190, 0.85), transparent 62%),
    radial-gradient(800px 520px at 100% 0%, rgba(225, 148, 52, 0.2), transparent 60%),
    linear-gradient(180deg, #fcf5e9, #f4e2c6) fixed;

  button {
    font-family: inherit;
  }

  /* ---------- Chispas ---------- */
  .ly-sprinkles {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    opacity: 0.55;
    i {
      position: absolute;
      display: block;
      height: 5px;
      border-radius: 4px;
      animation: lyDrift 8s ease-in-out infinite alternate;
      &.c0 { background: #d9822b; }
      &.c1 { background: #e8b87a; }
      &.c2 { background: #8a4b1f; }
      &.c3 { background: #f2d9a8; }
    }
  }

  /* ---------- Cabecera ---------- */
  .q-header.ly-header {
    height: var(--ly-h);
    background: rgba(252, 245, 233, 0.85) !important;
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--line);
    color: var(--ink);

    .q-toolbar {
      height: var(--ly-h);
      min-height: var(--ly-h);
      padding: 0 clamp(12px, 2vw, 24px);
      gap: 6px;
    }
  }
  .ly-burger {
    color: var(--ink);
  }
  .ly-crumb {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0;
    font-size: 15px;
    font-weight: 500;
  }
  .ly-crumb-root,
  .ly-crumb-sep {
    color: var(--mute);
    @media (max-width: 599px) {
      display: none;
    }
  }
  .ly-crumb-now {
    display: inline-block;
    font-weight: 650;
    color: var(--ink);
  }
  .ly-role {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 12px;
    margin-right: 6px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: rgba(194, 106, 28, 0.1);
    color: var(--accent-ink);
    font-size: 13px;
    font-weight: 500;
    text-transform: capitalize;
  }
  .ly-user {
    padding: 4px 10px 4px 6px;
    border-radius: 12px;
    color: var(--ink);
    .q-btn__content {
      gap: 8px;
      flex-wrap: nowrap;
    }
  }
  .ly-user-name {
    font-size: 14px;
    font-weight: 500;
  }
  .ly-avatar {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #fff;
    font-size: 13px;
    font-weight: 700;
  }

  /* ---------- Menú lateral ---------- */
  .ly-drawer {
    background: linear-gradient(180deg, #3d2213, #26140a) !important;
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(255, 240, 220, 0.86);
  }
  .ly-drawer-in {
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }
  .ly-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 20px 18px 18px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  .ly-brand-n {
    font-size: 17px;
    font-weight: 700;
    color: #fff4e3;
  }
  .ly-brand-s {
    font-size: 12px;
    color: rgba(255, 240, 220, 0.6);
  }
  .ly-logo {
    width: 52px;
    height: 52px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 50%;
    background: #f3ecd8;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.85), 0 6px 14px rgba(0, 0, 0, 0.4);
    transition: transform 0.3s ease;
    &:hover {
      transform: rotate(-6deg) scale(1.06);
    }
    img {
      display: block;
      width: 100%;
      height: 100%;
      transform: scale(1.07) translate(-0.3%, 2%);
    }
    &.fallback {
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: #fff4e3;
    }
  }
  .ly-nav {
    padding: 16px 12px;
  }
  .ly-tile {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 11px;
    background: rgba(255, 244, 227, 0.92);
    color: var(--accent);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
    transition: transform 0.2s ease;
  }
  .ly-item {
    min-height: 52px;
    padding: 0 8px;
    margin-bottom: 6px;
    border: 1px solid transparent;
    border-radius: 14px;
    color: rgba(255, 240, 220, 0.86);
    font-size: 15px;
    font-weight: 500;
    transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;

    .q-item__section--avatar {
      min-width: 0;
      padding-right: 12px;
    }
    &:hover:not(.disabled):not(.ly-active) {
      background: rgba(255, 255, 255, 0.07);
      transform: translateX(3px);
      .ly-tile {
        transform: scale(1.08) rotate(-4deg);
      }
    }
    &.ly-active {
      color: #fff;
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(225, 148, 52, 0.7);
      .ly-tile {
        background: linear-gradient(135deg, var(--accent), var(--accent-2));
        color: #fff;
      }
    }
  }
  .ly-soon {
    color: rgba(255, 240, 220, 0.5);
  }

  /* ---------- Panel de inventario ---------- */
  .ly-shop {
    margin: auto 12px 14px;
    padding: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.05);
    font-size: 12px;
    transition: border-color 0.25s ease, background 0.25s ease;

    &.alert {
      border-color: rgba(240, 184, 102, 0.45);
      background: rgba(240, 184, 102, 0.07);
    }

    h4 {
      margin: 0;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(255, 240, 220, 0.6);
    }
    h5 {
      margin: 14px 0 8px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: rgba(255, 240, 220, 0.6);
    }
    p {
      margin: 0;
    }
  }
  .ly-shop-head {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .ly-shop-ttl {
    min-width: 0;
    display: grid;
    gap: 3px;
    p {
      font-size: 12.5px;
      line-height: 1.3;
      color: rgba(255, 244, 227, 0.88);
      b {
        color: #f0b866;
        font-weight: 700;
      }
    }
  }

  /* Anillo de salud */
  .ly-ring {
    --p: 0;
    --ring: #8fd9a8;
    position: relative;
    flex: none;
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    &::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: conic-gradient(var(--ring) calc(var(--p) * 1%), rgba(255, 255, 255, 0.14) 0);
      -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px));
      mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px));
    }
    b {
      position: relative;
      font-size: 12px;
      font-weight: 700;
      color: #fff4e3;
      font-variant-numeric: tabular-nums;
    }
  }

  /* Lista de compras */
  .ly-shop-list {
    display: grid;
    gap: 6px;
    margin: 12px 0 0;
    padding: 0;
    list-style: none;
    li {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      color: rgba(255, 240, 220, 0.86);
      span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      b {
        color: #f0b866;
        font-weight: 600;
        white-space: nowrap;
      }
      &.more {
        color: rgba(255, 240, 220, 0.55);
      }
    }
  }
  .ly-shop-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    height: 34px;
    margin-top: 12px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.08);
    color: #ffe9cc;
    cursor: pointer;
    font-size: 12.5px;
    font-weight: 600;
    transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
    &:hover {
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      border-color: transparent;
      color: #fff;
    }
    &:focus-visible {
      outline: 2px solid #f0b866;
      outline-offset: 2px;
    }
  }

  /* En vigilancia */
  .ly-watch {
    display: grid;
    gap: 9px;
    margin: 0;
    padding: 0;
    list-style: none;
    li {
      --c: #8fd9a8;
      &.warn {
        --c: #f0b866;
      }
    }
  }
  .ly-watch-top {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 4px;
    color: rgba(255, 240, 220, 0.86);
    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    b {
      color: var(--c);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
  }
  .ly-watch-bar {
    display: block;
    height: 4px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    i {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--c);
      transition: width 0.6s ease;
    }
  }
  .ly-shop-foot {
    margin-top: 10px !important;
    color: rgba(255, 240, 220, 0.6);
  }

  /* ---------- Contenido ---------- */
  .q-page-container.ly-main {
    position: relative;
    z-index: 1;
    padding-top: var(--ly-h) !important;
    background: transparent;
    .q-page {
      min-height: calc(100vh - var(--ly-h)) !important;
    }
  }
}

@keyframes lyDrift {
  to {
    translate: 0 -12px;
    rotate: var(--r2, 40deg);
  }
}

/* ---------- Menú del usuario ---------- */
.ly-menu {
  background: #fffaf1 !important;
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 14px;
  .q-item {
    min-height: 44px;
  }
  .q-item__label--caption {
    color: var(--mute);
  }
  .ly-logout .q-icon {
    color: var(--neg);
  }
}

/* ---------- Transiciones ---------- */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.title-enter-active,
.title-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
  display: inline-block;
}
.title-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.title-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ---------- Utilidades que usan las páginas internas ---------- */
.fade-up {
  opacity: 0;
  animation: fadeUp 0.5s ease-out forwards;
  animation-delay: calc(var(--i, 0) * 70ms);
}
@keyframes fadeUp {
  from {
    opacity: 0;
    translate: 0 14px;
  }
  to {
    opacity: 1;
    translate: 0 0;
  }
}
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  &:hover {
    transform: translateY(-3px);
    border-color: var(--accent-2);
    box-shadow: 0 12px 26px var(--shadow);
  }
}
.q-table tbody tr {
  transition: background 0.15s ease;
}

@media (prefers-reduced-motion: reduce) {
  .ly .ly-sprinkles i {
    animation: none;
  }
  .fade-up {
    animation: none;
    opacity: 1;
  }
  .page-enter-active,
  .page-leave-active,
  .title-enter-active,
  .title-leave-active,
  .ly-item,
  .ly-tile,
  .ly-logo,
  .ly-shop-btn,
  .ly-watch-bar i {
    transition: none;
  }
}
</style>
<template>
  <q-layout view="lHh Lpr lFf" class="login-layout">
    <q-page-container>
      <q-page class="stage">
        <canvas ref="canvasRef" class="gl" aria-hidden="true"></canvas>

        <div class="ui" :class="{ leaving }">
          <header class="top">
            <div class="brand">
              <img v-if="logoSrc" :src="logoSrc" alt="" draggable="false" @error="onLogoError" />
              <span>Repostería</span>
            </div>
            <div class="aside">Uso interno · {{ year }}</div>
          </header>

          <div class="center">
            <div ref="panelRef" class="panel">
              <!-- Lado izquierdo: identidad del sistema -->
              <section class="intro">
                <p class="eyebrow">Sistema de gestión</p>
                <h1 class="display" aria-label="Gestión del obrador">
                  <span class="row">Gestión</span>
                  <span class="row accent">del obrador</span>
                </h1>
                <p class="lede">Todo el taller en un solo lugar: de la receta al pedido entregado.</p>

                <ul class="chips">
                  <li><span aria-hidden="true">🧁</span> Recetas</li>
                  <li><span aria-hidden="true">📦</span> Inventario</li>
                  <li><span aria-hidden="true">🧾</span> Pedidos</li>
                  <li><span aria-hidden="true">📊</span> Reportes</li>
                </ul>

                <p class="tip">Pasa el mouse sobre los postres y haz clic: reaccionan.</p>
              </section>

              <!-- Lado derecho: formulario -->
              <section class="card" :class="{ compact: isRegister }">
                <div class="tabs" role="tablist" aria-label="Acceso">
                  <button
                    type="button"
                    role="tab"
                    class="tab"
                    :class="{ on: mode === 'login' }"
                    :aria-selected="mode === 'login'"
                    @click="setMode('login')"
                  >
                    Iniciar sesión
                  </button>
                  <button
                    type="button"
                    role="tab"
                    class="tab"
                    :class="{ on: mode === 'register' }"
                    :aria-selected="mode === 'register'"
                    @click="setMode('register')"
                  >
                    Crear cuenta
                  </button>
                  <span class="tab-bar" :class="{ right: mode === 'register' }" aria-hidden="true"></span>
                </div>

                <h2 class="card-title">{{ isRegister ? 'Crea tu cuenta' : 'Bienvenido de nuevo' }}</h2>
                <p class="card-sub">
                  {{ isRegister ? 'Regístrate y entra al sistema al instante.' : 'Ingresa con tu cuenta para continuar.' }}
                </p>

                <form class="form" novalidate @submit.prevent="handleSubmit">
                  <div v-if="isRegister" class="group" :class="{ invalid: !!nameErr }">
                    <label class="lbl" for="reg-name">Nombre</label>
                    <div class="control">
                      <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c1-4 4-6 8-6s7 2 8 6" />
                      </svg>
                      <input
                        id="reg-name"
                        v-model="nombre"
                        type="text"
                        placeholder="Tu nombre"
                        autocomplete="name"
                        maxlength="100"
                        @focus="focusMode = 'mail'"
                        @blur="onBlur('name')"
                        @input="onType"
                      />
                    </div>
                    <p class="msg">{{ nameErr }}</p>
                  </div>

                  <div class="group" :class="{ invalid: !!emailErr }">
                    <label class="lbl" for="login-email">Correo electrónico</label>
                    <div class="control">
                      <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <path d="M3 7l9 6 9-6" />
                      </svg>
                      <input
                        id="login-email"
                        v-model="email"
                        type="email"
                        placeholder="nombre@correo.com"
                        autocomplete="username"
                        autocapitalize="off"
                        spellcheck="false"
                        @focus="focusMode = 'mail'"
                        @blur="onBlur('email')"
                        @input="onType"
                      />
                    </div>
                    <p class="msg">{{ emailErr }}</p>
                  </div>

                  <div class="group" :class="{ invalid: !!passErr }">
                    <label class="lbl" for="login-pass">Contraseña</label>
                    <div class="control">
                      <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="5" y="11" width="14" height="9" rx="2" />
                        <path d="M8 11V8a4 4 0 018 0v3" />
                      </svg>
                      <input
                        id="login-pass"
                        v-model="password"
                        :type="showPassword ? 'text' : 'password'"
                        :placeholder="isRegister ? 'Mínimo 6 caracteres' : 'Tu contraseña'"
                        :autocomplete="isRegister ? 'new-password' : 'current-password'"
                        @focus="focusMode = 'pass'"
                        @blur="onBlur('pass')"
                        @input="onType"
                        @keyup="checkCapsLock"
                        @keydown="checkCapsLock"
                      />
                      <button
                        type="button"
                        class="ghost"
                        tabindex="-1"
                        :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                        @click="showPassword = !showPassword"
                      >
                        {{ showPassword ? 'Ocultar' : 'Ver' }}
                      </button>
                    </div>
                    <div v-if="isRegister" class="meter" :data-level="strength.level" aria-hidden="true">
                      <i></i><i></i><i></i><i></i>
                      <span>{{ strength.label }}</span>
                    </div>
                    <p class="msg">{{ passErr || (capsOn ? 'Bloq Mayús activado' : '') }}</p>
                  </div>

                  <div v-if="isRegister" class="group" :class="{ invalid: !!confirmErr }">
                    <label class="lbl" for="reg-confirm">Confirmar contraseña</label>
                    <div class="control">
                      <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="5" y="11" width="14" height="9" rx="2" />
                        <path d="M8 11V8a4 4 0 018 0v3" />
                      </svg>
                      <input
                        id="reg-confirm"
                        v-model="confirm"
                        :type="showPassword ? 'text' : 'password'"
                        placeholder="Repite la contraseña"
                        autocomplete="new-password"
                        @focus="focusMode = 'pass'"
                        @blur="onBlur('confirm')"
                        @input="onType"
                      />
                    </div>
                    <p class="msg">{{ confirmErr }}</p>
                  </div>

                  <label v-if="!isRegister" class="remember">
                    <input v-model="remember" type="checkbox" />
                    <span>Recordar este correo</span>
                  </label>

                  <p v-if="errorMsg" class="error" role="alert">{{ errorMsg }}</p>

                  <button class="enter" :class="{ 'is-loading': loading }" :disabled="loading" type="submit">
                    <span>{{ submitLabel }}</span>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 12h15M13 6l6 6-6 6" />
                    </svg>
                  </button>
                </form>

                <p class="help">
                  {{ isRegister ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?' }}
                  <button type="button" class="link" @click="setMode(isRegister ? 'login' : 'register')">
                    {{ isRegister ? 'Inicia sesión' : 'Crea una aquí' }}
                  </button>
                </p>
              </section>
            </div>
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { api } from '../boot/axios';
import type { AxiosError } from 'axios';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
}

type Mode = 'login' | 'register';

/* Ruta del backend para crear usuarios (ajústala si en tu API es distinta) */
const LOGIN_PATH = '/usuarios/login';
const REGISTER_PATH = '/usuarios/registro';

interface LoginResponse {
  mensaje: string;
  token: string;
  usuario: Usuario;
}

const router = useRouter();
const $q = useQuasar();

/* ------------------------------------------------------------------ */
/* Estado del formulario                                               */
/* ------------------------------------------------------------------ */
const mode = ref<Mode>('login');
const isRegister = computed(() => mode.value === 'register');
const nombre = ref('');
const confirm = ref('');
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const remember = ref(false);
const loading = ref(false);
const capsOn = ref(false);
const leaving = ref(false);
const errorMsg = ref('');
const focusMode = ref<'' | 'mail' | 'pass'>('');
const year = new Date().getFullYear();

const touched = reactive({ name: false, email: false, pass: false, confirm: false });

const nameErr = computed(() => {
  if (!isRegister.value || !touched.name) return '';
  return nombre.value.trim().length < 2 ? 'Escribe tu nombre (mínimo 2 letras)' : '';
});

const emailErr = computed(() => {
  if (!touched.email) return '';
  const v = email.value.trim();
  if (!v) return 'El correo es requerido';
  return /.+@.+\..+/.test(v) ? '' : 'Correo no válido';
});
const passErr = computed(() => {
  if (!touched.pass) return '';
  if (!password.value) return 'La contraseña es requerida';
  if (isRegister.value && password.value.length < 6) return 'Mínimo 6 caracteres';
  return '';
});
const confirmErr = computed(() => {
  if (!isRegister.value || !touched.confirm) return '';
  return confirm.value !== password.value ? 'Las contraseñas no coinciden' : '';
});

/* Indicador de seguridad de la contraseña (solo orientativo) */
const strength = computed(() => {
  const p = password.value;
  let score = 0;
  if (p.length >= 6) score++;
  if (p.length >= 10) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
  if (!p) return { level: 0, label: '' };
  const labels = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte'];
  const level = Math.max(1, score);
  return { level, label: labels[level] ?? '' };
});

const submitLabel = computed(() => {
  if (loading.value) return isRegister.value ? 'Creando cuenta…' : 'Comprobando…';
  return isRegister.value ? 'Crear cuenta y entrar' : 'Entrar';
});

const setMode = (m: Mode): void => {
  if (mode.value === m) return;
  mode.value = m;
  errorMsg.value = '';
  touched.name = touched.email = touched.pass = touched.confirm = false;
  confirm.value = '';
  showPassword.value = false;
  fx.excite = 1;
};

const canvasRef = ref<HTMLCanvasElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);

const logoSources = ['/logo.jpeg', '/logo.jpg', '/Reposteria%20logo.jpeg', '/Reposteria%20logo.jpg'];
const logoIdx = ref(0);
const logoSrc = computed<string | null>(() => logoSources[logoIdx.value] ?? null);
const onLogoError = (e: Event): void => {
  const failed = (e.target as HTMLImageElement).getAttribute('src');
  if (failed === logoSrc.value) logoIdx.value += 1;
};

/* Efectos compartidos entre el formulario y la escena 3D */
const fx = { shock: 0, excite: 0, burstAt: null as null | { x: number; y: number; s: number } };

const checkCapsLock = (e: KeyboardEvent): void => {
  capsOn.value = !!(e.getModifierState && e.getModifierState('CapsLock'));
};
const onBlur = (k: 'name' | 'email' | 'pass' | 'confirm'): void => {
  focusMode.value = '';
  touched[k] = true;
};
const onType = (): void => {
  errorMsg.value = '';
  fx.excite = 1;
};

const shakePanel = (): void => {
  panelRef.value?.animate(
    [
      { translate: '0 0' },
      { translate: '-8px 0' },
      { translate: '6px 0' },
      { translate: '-3px 0' },
      { translate: '0 0' },
    ],
    { duration: 360, easing: 'ease-in-out' },
  );
};

type ApiError = { mensaje?: string; message?: string; error?: string };

const apiMessage = (err: AxiosError<ApiError>, fallback: string): string =>
  err.response?.data?.mensaje ||
  err.response?.data?.message ||
  err.response?.data?.error ||
  (err.response ? fallback : 'No se pudo conectar con el servidor.');

const startSession = async (data: LoginResponse, emailClean: string): Promise<void> => {
  localStorage.setItem('token', data.token);
  localStorage.setItem('usuario', JSON.stringify(data.usuario));
  if (!isRegister.value) {
    if (remember.value) localStorage.setItem('recordar_email', emailClean);
    else localStorage.removeItem('recordar_email');
  }

  $q.notify({ type: 'positive', message: `¡Bienvenido, ${data.usuario.nombre}!` });
  fx.burstAt = { x: 0, y: 0, s: 1.4 };
  leaving.value = true;
  await new Promise((resolve) => setTimeout(resolve, 650));
  await router.push('/');
};

const handleSubmit = async (): Promise<void> => {
  if (loading.value) return;
  touched.name = true;
  touched.email = true;
  touched.pass = true;
  touched.confirm = true;
  if (emailErr.value || passErr.value || nameErr.value || confirmErr.value) {
    shakePanel();
    return;
  }

  loading.value = true;
  errorMsg.value = '';
  const emailClean = email.value.trim().toLowerCase();
  let registered = false;

  try {
    if (isRegister.value) {
      // Solo se envían nombre, correo y contraseña: el rol lo decide el servidor, nunca el formulario.
      await api.post(REGISTER_PATH, {
        nombre: nombre.value.trim(),
        email: emailClean,
        password: password.value,
      });
      registered = true;
    }

    const { data } = await api.post<LoginResponse>(LOGIN_PATH, {
      email: emailClean,
      password: password.value,
    });
    await startSession(data, emailClean);
  } catch (error) {
    const err = error as AxiosError<ApiError>;
    fx.shock = 1;
    fx.burstAt = { x: 0, y: 0, s: 0.8 };
    shakePanel();

    if (registered) {
      // La cuenta sí se creó, pero el ingreso automático falló: pasamos a "Iniciar sesión".
      mode.value = 'login';
      confirm.value = '';
      touched.pass = false;
      errorMsg.value = 'Tu cuenta fue creada. Inicia sesión para continuar.';
    } else if (err.response?.status === 409) {
      errorMsg.value = apiMessage(err, 'Ese correo ya está registrado.');
    } else {
      errorMsg.value = apiMessage(
        err,
        isRegister.value ? 'No se pudo crear la cuenta.' : 'Correo o contraseña incorrectos.',
      );
    }
    console.error('Acceso falló:', err.response?.status, err.response?.data ?? err.message);
  } finally {
    loading.value = false;
  }
};

/* ------------------------------------------------------------------ */
/* Escena 3D: postres flotando                                         */
/* ------------------------------------------------------------------ */
const mat = (color: number, o: THREE.MeshPhysicalMaterialParameters = {}): THREE.MeshPhysicalMaterial =>
  new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.5,
    clearcoat: 0.4,
    clearcoatRoughness: 0.4,
    ...o,
  });

const SPRINKLE_COLORS = [0xffffff, 0xffd166, 0x06d6a0, 0x4cc9f0, 0xff6b9d];

function makeDonut(icing: number): THREE.Group {
  const g = new THREE.Group();
  const dough = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.22, 24, 56),
    mat(0xd49a5a, { roughness: 0.85, clearcoat: 0 }),
  );
  const ic = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.235, 24, 56),
    mat(icing, { roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1 }),
  );
  ic.scale.z = 0.72;
  ic.position.z = 0.07;
  g.add(dough, ic);

  const sprinkleGeo = new THREE.CapsuleGeometry(0.014, 0.07, 2, 5);
  const sprinkleMats = SPRINKLE_COLORS.map((c) => mat(c, { roughness: 0.5, clearcoat: 0.2 }));
  for (let i = 0; i < 28; i += 1) {
    const u = Math.random() * Math.PI * 2;
    const v = 0.5 + Math.random() * 2.1;
    const rad = 0.5 + 0.24 * Math.cos(v);
    const s = new THREE.Mesh(sprinkleGeo, sprinkleMats[i % sprinkleMats.length]);
    s.position.set(rad * Math.cos(u), rad * Math.sin(u), 0.07 + 0.175 * Math.sin(v));
    s.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    g.add(s);
  }
  return g;
}

function makeCupcake(paper: number, frost: number): THREE.Group {
  const g = new THREE.Group();
  const wrapper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.25, 0.4, 18, 1),
    mat(paper, { roughness: 0.75, clearcoat: 0, flatShading: true }),
  );
  wrapper.position.y = -0.1;
  g.add(wrapper);

  const frostMat = mat(frost, { roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.15 });
  const rings: Array<[number, number, number]> = [
    [0.34, 0.11, 0.18],
    [0.25, 0.1, 0.32],
    [0.16, 0.09, 0.44],
  ];
  rings.forEach(([r, t, y]) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 16, 36), frostMat);
    m.rotation.x = Math.PI / 2;
    m.position.y = y;
    g.add(m);
  });
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 16), frostMat);
  tip.position.y = 0.6;
  g.add(tip);
  const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 16), mat(0xc1121f, { roughness: 0.15, clearcoat: 1 }));
  cherry.position.y = 0.74;
  g.add(cherry);
  return g;
}

function makeMacaron(color: number): THREE.Group {
  const g = new THREE.Group();
  const shell = mat(color, { roughness: 0.35, clearcoat: 0.6 });
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 16), shell);
  top.scale.y = 0.34;
  top.position.y = 0.15;
  const bottom = top.clone();
  bottom.position.y = -0.15;
  const fill = new THREE.Mesh(
    new THREE.CylinderGeometry(0.37, 0.37, 0.16, 32),
    mat(0xfff2dc, { roughness: 0.85, clearcoat: 0 }),
  );
  g.add(top, bottom, fill);
  return g;
}

function makeCake(): THREE.Group {
  const g = new THREE.Group();
  const sponge = mat(0xf7e0e6, { roughness: 0.55 });
  const frost = mat(0xfbbdd0, { roughness: 0.3, clearcoat: 0.8 });
  const t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.5, 48), sponge);
  t1.position.y = -0.2;
  const t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.45, 48), sponge);
  t2.position.y = 0.28;
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.07, 14, 56), frost);
  r1.rotation.x = Math.PI / 2;
  r1.position.y = 0.05;
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 14, 56), frost);
  r2.rotation.x = Math.PI / 2;
  r2.position.y = 0.505;
  g.add(t1, t2, r1, r2);

  const berry = mat(0xe5233d, { roughness: 0.2, clearcoat: 1 });
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), berry);
    b.position.set(Math.cos(a) * 0.46, 0.56, Math.sin(a) * 0.46);
    g.add(b);
  }
  const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 16), mat(0x8d0b1a, { roughness: 0.15, clearcoat: 1 }));
  cherry.position.y = 0.6;
  g.add(cherry);
  return g;
}

function makeRollingPin(): THREE.Group {
  const g = new THREE.Group();
  const wood = mat(0xc79a62, { roughness: 0.6, clearcoat: 0.2 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.1, 32), wood);
  body.rotation.z = Math.PI / 2;
  g.add(body);
  [-1, 1].forEach((side) => {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 16), wood);
    h.rotation.z = Math.PI / 2;
    h.position.x = side * 0.8;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), wood);
    cap.position.x = side * 1.05;
    g.add(h, cap);
  });
  return g;
}

interface Item {
  root: THREE.Group;
  model: THREE.Group;
  nx: number;
  ny: number;
  z: number;
  s: number;
  spin: number;
  rx: number;
  phase: number;
  ang: number;
  hover: number;
  pop: number;
  boost: number;
  hovered: boolean;
  base: THREE.Vector3;
}

let cleanup = (): void => {};

onMounted(() => {
  try {
    const saved = localStorage.getItem('recordar_email');
    if (saved) {
      email.value = saved;
      remember.value = true;
    }
  } catch {
    /* localStorage no disponible */
  }

  const canvas = canvasRef.value;
  if (!canvas) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return; // sin WebGL: queda el fondo CSS y el formulario funciona igual
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x1a0f15, 10, 24);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  (scene as unknown as { environmentIntensity: number }).environmentIntensity = 0.55;

  const FOV = 40;
  const CAM_Z = 9;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
  camera.position.set(0, 0, CAM_Z);

  const key = new THREE.DirectionalLight(0xfff0dc, 2.4);
  key.position.set(3, 5, 6);
  const rim = new THREE.PointLight(0xff7aa8, 55, 0, 2);
  rim.position.set(-5, -2, 2);
  const mouseLight = new THREE.PointLight(0xffc48a, 45, 0, 2);
  mouseLight.position.set(0, 0, 3);
  scene.add(key, rim, mouseLight, new THREE.HemisphereLight(0xffe3c4, 0x2a1420, 0.7));

  const halfH = (z: number): number => Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * (CAM_Z - z);
  let aspect = 1;
  let viewScale = 1;

  const specs: Array<{ m: () => THREE.Group; nx: number; ny: number; z: number; s: number; spin: number; rx: number }> = [
    { m: () => makeDonut(0xff7fa8), nx: -0.7, ny: 0.5, z: 1.5, s: 1.3, spin: 0.35, rx: 0.9 },
    { m: () => makeDonut(0x6b3a2a), nx: 0.74, ny: -0.52, z: 1.0, s: 1.2, spin: -0.3, rx: 0.8 },
    { m: () => makeCupcake(0xe8a0b4, 0xfff0f5), nx: -0.78, ny: -0.5, z: 2.0, s: 1.15, spin: 0.4, rx: 0.35 },
    { m: () => makeCupcake(0xf2c94c, 0xb9774a), nx: 0.8, ny: 0.48, z: 0.5, s: 1.1, spin: -0.35, rx: 0.3 },
    { m: () => makeMacaron(0xff9ec0), nx: -0.3, ny: 0.82, z: 0.0, s: 1.0, spin: 0.5, rx: 0.5 },
    { m: () => makeMacaron(0x8fe3c0), nx: 0.32, ny: -0.84, z: 0.5, s: 1.0, spin: -0.45, rx: 0.55 },
    { m: () => makeMacaron(0xb9a2f0), nx: 0.52, ny: 0.8, z: -1.0, s: 0.9, spin: 0.4, rx: 0.5 },
    { m: () => makeCake(), nx: -0.5, ny: -0.84, z: -0.5, s: 0.85, spin: 0.25, rx: 0.45 },
    { m: () => makeRollingPin(), nx: 0.94, ny: 0.02, z: -1.0, s: 0.9, spin: 0.3, rx: 0.2 },
    { m: () => makeCupcake(0xa9d6e5, 0xffd6e8), nx: -0.94, ny: 0.0, z: -1.0, s: 0.9, spin: -0.3, rx: 0.35 },
    { m: () => makeDonut(0xff9ec0), nx: 0.02, ny: 0.05, z: -6.0, s: 5.0, spin: 0.08, rx: 0.7 },
  ];

  const items: Item[] = specs.map((sp, i) => {
    const root = new THREE.Group();
    const model = sp.m();
    root.add(model);
    scene.add(root);
    return {
      root,
      model,
      nx: sp.nx,
      ny: sp.ny,
      z: sp.z,
      s: sp.s,
      spin: sp.spin,
      rx: sp.rx,
      phase: i * 1.7,
      ang: Math.random() * 6,
      hover: 0,
      pop: 0,
      boost: 0,
      hovered: false,
      base: new THREE.Vector3(),
    };
  });

  /* Chispas flotantes que reaccionan al clic */
  const N = 140;
  const spGeo = new THREE.CapsuleGeometry(0.03, 0.15, 2, 6);
  const spMesh = new THREE.InstancedMesh(spGeo, mat(0xffffff, { roughness: 0.5, clearcoat: 0.2 }), N);
  scene.add(spMesh);
  const sp = Array.from({ length: N }, () => ({
    nx: Math.random() * 2 - 1,
    ny: Math.random() * 2 - 1,
    z: -4 + Math.random() * 7,
    p: new THREE.Vector3(),
    v: new THREE.Vector3(),
    rot: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6),
    rs: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5),
    k: 0.7 + Math.random() * 0.8,
    phase: Math.random() * 6,
  }));
  const tmpColor = new THREE.Color();
  sp.forEach((s, i) => {
    tmpColor.setHex(SPRINKLE_COLORS[i % SPRINKLE_COLORS.length] ?? 0xffffff);
    spMesh.setColorAt(i, tmpColor);
    s.p.set(s.nx * 6, s.ny * 3, s.z);
  });
  if (spMesh.instanceColor) spMesh.instanceColor.needsUpdate = true;

  const layout = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    aspect = w / Math.max(h, 1);
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    viewScale = THREE.MathUtils.clamp(Math.min(w / 1500, h / 900), 0.5, 1.1);
    items.forEach((it) => {
      const hh = halfH(it.z);
      it.base.set(it.nx * hh * aspect, it.ny * hh, it.z);
    });
  };
  layout();
  window.addEventListener('resize', layout);

  /* Puntero */
  const ndc = new THREE.Vector2(0, 0);
  const smooth = new THREE.Vector2(0, 0);
  const ray = new THREE.Raycaster();
  let overPanel = false;
  let needsPick = false;

  const onMove = (e: PointerEvent): void => {
    ndc.x = (e.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
    ndc.y = -((e.clientY / Math.max(window.innerHeight, 1)) * 2 - 1);
    overPanel = !!(e.target as HTMLElement | null)?.closest?.('.panel');
    needsPick = true;
  };

  const burst = (cx: number, cy: number, strength: number, radius = 3.6): void => {
    sp.forEach((s) => {
      const dx = s.p.x - cx;
      const dy = s.p.y - cy;
      const d = Math.max(Math.hypot(dx, dy), 0.05);
      if (d < radius) {
        const f = (radius - d) * 2.4 * strength;
        s.v.x += (dx / d) * f;
        s.v.y += (dy / d) * f;
        s.v.z += (Math.random() - 0.3) * f * 0.5;
      }
    });
  };

  const onDown = (): void => {
    burst(ndc.x * halfH(0) * aspect, ndc.y * halfH(0), 1);
    items.forEach((it) => {
      if (it.hovered) {
        it.pop = 1;
        it.boost += 6;
      }
    });
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });

  const findItem = (start: THREE.Object3D): Item | null => {
    let found: Item | null = items.find((it) => it.root === start) ?? null;
    if (!found) {
      start.traverseAncestors((anc) => {
        if (!found) found = items.find((it) => it.root === anc) ?? null;
      });
    }
    return found;
  };

  const dummy = new THREE.Object3D();
  let raf = 0;
  let running = true;
  let leave = 0;
  let last = performance.now();
  const started = last;

  const frame = (now: number): void => {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = (now - started) / 1000;

    smooth.x += (ndc.x - smooth.x) * Math.min(1, dt * 3);
    smooth.y += (ndc.y - smooth.y) * Math.min(1, dt * 3);

    fx.shock *= Math.pow(0.02, dt);
    fx.excite *= Math.pow(0.08, dt);
    leave += ((leaving.value ? 1 : 0) - leave) * Math.min(1, dt * 2.2);

    if (fx.burstAt) {
      burst(fx.burstAt.x, fx.burstAt.y, fx.burstAt.s, 9);
      fx.burstAt = null;
    }

    /* Cámara con paralaje */
    camera.position.x = smooth.x * 0.7;
    camera.position.y = smooth.y * 0.4;
    camera.lookAt(0, 0, 0);

    /* Luz que sigue al mouse (suave) */
    mouseLight.position.set(smooth.x * 6, smooth.y * 3.4, 3.5);
    mouseLight.intensity = 45 * (1 - (focusMode.value ? 0.35 : 0)) + fx.excite * 25;

    /* Selección con raycaster */
    if (needsPick) {
      needsPick = false;
      let hit: Item | null = null;
      if (!overPanel) {
        ray.setFromCamera(ndc, camera);
        const hits = ray.intersectObjects(
          items.map((i) => i.root),
          true,
        );
        const first = hits[0];
        if (first) hit = findItem(first.object);
      }
      items.forEach((it) => {
        it.hovered = it === hit;
      });
    }

    /* Postres */
    items.forEach((it, i) => {
      it.hover += ((it.hovered ? 1 : 0) - it.hover) * Math.min(1, dt * 8);
      it.pop *= Math.pow(0.02, dt);
      it.boost *= Math.pow(0.12, dt);
      const speed = it.spin + it.hover * 1.6 + it.boost + fx.excite * 1.2;
      it.ang += speed * dt;

      const sc = it.s * viewScale * (1 + it.hover * 0.12 + it.pop * 0.28 + fx.excite * 0.04);
      it.root.scale.setScalar(sc);

      const float = Math.sin(t * 0.8 + it.phase) * 0.14 * viewScale;
      const jump = it.pop * 0.35;
      const shake = Math.sin(t * 55 + i) * 0.09 * fx.shock;
      const dir = Math.sign(it.nx || 1);
      it.root.position.set(
        it.base.x + shake + dir * leave * 7,
        it.base.y + float + jump + leave * 2.5,
        it.base.z + leave * 9,
      );
      it.model.rotation.set(it.rx + Math.sin(t * 0.6 + it.phase) * 0.18, it.ang, Math.sin(t * 0.5 + it.phase) * 0.1);
    });

    /* Chispas */
    const wz = halfH(0);
    sp.forEach((s, i) => {
      const hh = halfH(s.z);
      const hx = s.nx * hh * aspect + Math.sin(t * 0.4 + s.phase) * 0.35;
      const hy = s.ny * hh + Math.cos(t * 0.5 + s.phase) * 0.3;
      s.v.x += (hx - s.p.x) * 2.2 * dt;
      s.v.y += (hy - s.p.y) * 2.2 * dt;
      s.v.z += (s.z - s.p.z) * 2.2 * dt;
      s.v.multiplyScalar(1 - Math.min(1, 2.4 * dt));
      s.p.addScaledVector(s.v, dt);
      s.rot.addScaledVector(s.rs, dt * (1 + s.v.length()));
      dummy.position.copy(s.p);
      dummy.rotation.set(s.rot.x, s.rot.y, s.rot.z);
      dummy.scale.setScalar(s.k * viewScale);
      dummy.updateMatrix();
      spMesh.setMatrixAt(i, dummy.matrix);
    });
    spMesh.instanceMatrix.needsUpdate = true;
    void wz;

    /* Inclinación 3D del panel */
    const panel = panelRef.value;
    if (panel && !reduce) {
      const calm = focusMode.value ? 0.25 : 1;
      panel.style.transform = `perspective(1400px) rotateX(${(smooth.y * 2.2 * calm).toFixed(2)}deg) rotateY(${(smooth.x * 3.2 * calm).toFixed(2)}deg)`;
    }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };

  if (reduce) renderer.render(scene, camera);
  else raf = requestAnimationFrame(frame);

  cleanup = () => {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', layout);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerdown', onDown);
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const m = mesh.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else if (m) m.dispose();
    });
    envTex.dispose();
    pmrem.dispose();
    renderer.dispose();
  };
});

onUnmounted(() => cleanup());
</script>

<style lang="scss">
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap');
</style>

<style scoped lang="scss">
.login-layout {
  min-height: 100dvh;
  overflow: hidden;
  color: #f7efe6;
  font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
  background:
    radial-gradient(1100px 760px at 50% 42%, #4a2634 0%, #26141c 55%, #0f0a0d 100%);
}

.stage {
  position: relative;
  height: 100dvh;
  min-height: 100dvh;
  padding: 0 !important;
  overflow: hidden;
  background: transparent;
  color: #f7efe6;
}

.gl {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}

.ui {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: clamp(16px, 2.5vh, 28px) clamp(16px, 3vw, 48px);
  transition: opacity 0.45s ease;
  pointer-events: none; /* deja pasar el mouse a los postres 3D */

  &.leaving {
    opacity: 0;
  }
}

.top,
.panel {
  pointer-events: auto;
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  pointer-events: none;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;

  img {
    width: 38px;
    height: 38px;
    object-fit: cover;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.25);
  }
}

.aside {
  font-size: 12px;
  color: rgba(247, 239, 230, 0.6);
}

.center {
  flex: 1;
  display: flex; /* con margin:auto en .panel no se corta por arriba si el formulario es alto */
  min-height: 0;
  overflow-y: auto;
  padding: 12px 0;
}

/* ---------- Panel central ---------- */
.panel {
  width: min(960px, 100%);
  margin: auto;
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  border-radius: 26px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(48, 26, 36, 0.62), rgba(18, 11, 15, 0.8));
  border: 1px solid rgba(255, 220, 200, 0.16);
  box-shadow:
    0 40px 90px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
  transform-style: preserve-3d;
  will-change: transform;
  animation: rise 0.9s cubic-bezier(0.2, 0.9, 0.2, 1) both;
}

.intro {
  padding: clamp(28px, 4vw, 52px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  background:
    radial-gradient(420px 300px at 0% 0%, rgba(255, 143, 163, 0.18), transparent 70%),
    radial-gradient(360px 260px at 100% 100%, rgba(255, 176, 103, 0.14), transparent 70%);
}

.eyebrow {
  margin: 0 0 14px;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 196, 160, 0.85);
}

.display {
  margin: 0;
  font-size: clamp(40px, 4.6vw, 64px);
  font-weight: 600;
  letter-spacing: -0.04em;
  line-height: 1.02;
}

.row {
  display: block;
  white-space: nowrap;
  padding: 0.06em 10px;
  margin: 0 -10px;
  animation: wipe 1s cubic-bezier(0.77, 0, 0.18, 1) both;

  &.accent {
    animation-delay: 0.1s;
    background: linear-gradient(90deg, #ffb067, #ff8fa3);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
  }
}

.lede {
  max-width: 36ch;
  margin: 18px 0 0;
  font-size: 16px;
  line-height: 1.55;
  color: rgba(247, 239, 230, 0.78);
}

.chips {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 24px 0 0;
  padding: 0;

  li {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 14px;
    font-size: 13px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.12);
    transition:
      transform 0.25s ease,
      background 0.25s ease;
    cursor: default;

    &:hover {
      transform: translateY(-3px);
      background: rgba(255, 176, 103, 0.18);
    }
  }
}

.tip {
  margin: 26px 0 0;
  font-size: 12px;
  color: rgba(247, 239, 230, 0.5);
}

/* ---------- Formulario ---------- */
.card {
  padding: clamp(28px, 4vw, 48px);
  background: rgba(12, 7, 10, 0.55);
  border-left: 1px solid rgba(255, 220, 200, 0.1);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.card-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.card-sub {
  margin: 6px 0 22px;
  font-size: 14px;
  color: rgba(247, 239, 230, 0.62);
}

.group {
  margin-bottom: 2px;
}

.lbl {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(247, 239, 230, 0.88);
}

.control {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 50px;
  padding: 0 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.18);
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;

  &:focus-within {
    border-color: #ffb067;
    background: rgba(255, 255, 255, 0.1);
    box-shadow: 0 0 0 3px rgba(255, 176, 103, 0.22);
  }

  input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: #fffaf3;
    font: 400 16px/1 'IBM Plex Sans', sans-serif;
    caret-color: #ffb067;

    &::placeholder {
      color: rgba(247, 239, 230, 0.36);
    }

    &:-webkit-autofill {
      -webkit-text-fill-color: #fffaf3;
      transition: background-color 99999s ease-out;
    }
  }
}

.ico {
  width: 18px;
  height: 18px;
  flex: none;
  fill: none;
  stroke: rgba(247, 239, 230, 0.55);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.group.invalid .control {
  border-color: #f0a898;
}

.msg {
  min-height: 20px;
  margin: 5px 2px 0;
  font-size: 12px;
  color: #f4b9aa;
}

.ghost {
  border: 0;
  background: transparent;
  color: rgba(247, 239, 230, 0.7);
  font: 500 12px/1 'IBM Plex Sans', sans-serif;
  cursor: pointer;
  padding: 8px 0 8px 8px;

  &:hover {
    color: #fff;
  }
}

.remember {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 4px 0 16px;
  font-size: 14px;
  color: rgba(247, 239, 230, 0.82);
  cursor: pointer;
  user-select: none;

  input {
    appearance: none;
    width: 17px;
    height: 17px;
    margin: 0;
    border: 1px solid rgba(247, 239, 230, 0.5);
    border-radius: 4px;
    display: grid;
    place-items: center;
    background: transparent;
    cursor: pointer;
  }

  input:checked {
    background: #ffb067;
    border-color: #ffb067;
  }

  input:checked::after {
    content: '';
    width: 8px;
    height: 4px;
    border-left: 1.6px solid #2a1608;
    border-bottom: 1.6px solid #2a1608;
    transform: rotate(-45deg) translateY(-1px);
  }

  input:focus-visible {
    outline: 2px solid #ffb067;
    outline-offset: 2px;
  }
}

.error {
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.4;
  color: #ffdcd2;
  background: rgba(214, 72, 52, 0.2);
  border: 1px solid rgba(240, 130, 110, 0.5);
}

.enter {
  width: 100%;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(90deg, #ffb067, #ff8fa3);
  color: #2a1608;
  font: 600 15px/1 'IBM Plex Sans', sans-serif;
  cursor: pointer;
  box-shadow: 0 10px 28px rgba(255, 143, 120, 0.28);
  transition:
    transform 0.15s ease,
    box-shadow 0.25s ease,
    filter 0.2s ease;

  svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    transition: transform 0.3s ease;
  }

  &:hover:not(:disabled) {
    filter: brightness(1.06);
    box-shadow: 0 14px 34px rgba(255, 143, 120, 0.4);
  }

  &:hover:not(:disabled) svg {
    transform: translateX(4px);
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 3px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.75;
  }

  &.is-loading svg {
    animation: pulse 0.9s ease infinite;
  }
}

.help {
  margin: 16px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(247, 239, 230, 0.52);
}

/* ---------- Pestañas Iniciar sesión / Crear cuenta ---------- */
.card.compact .msg {
  min-height: 16px;
}
.card.compact .card-sub {
  margin-bottom: 14px;
}
.card.compact .control {
  height: 44px;
}
.card.compact .lbl {
  margin-bottom: 6px;
}
.card.compact .remember {
  margin-bottom: 10px;
}

.tabs {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin-bottom: 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}

.tab {
  padding: 0 0 12px;
  border: 0;
  background: transparent;
  color: rgba(247, 239, 230, 0.55);
  font: 500 14px/1 'IBM Plex Sans', sans-serif;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: rgba(247, 239, 230, 0.85);
  }

  &.on {
    color: #fffaf3;
  }

  &:focus-visible {
    outline: 2px solid #ffb067;
    outline-offset: 2px;
  }
}

.tab-bar {
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 50%;
  height: 2px;
  background: #ffb067;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &.right {
    transform: translateX(100%);
  }
}

.meter {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;

  i {
    flex: 1;
    max-width: 44px;
    height: 4px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.14);
    transition: background 0.25s ease;
  }

  span {
    margin-left: 6px;
    font-size: 12px;
    color: rgba(247, 239, 230, 0.62);
  }

  &[data-level='1'] i:nth-child(-n + 1) {
    background: #f0a898;
  }
  &[data-level='2'] i:nth-child(-n + 2) {
    background: #f2c27a;
  }
  &[data-level='3'] i:nth-child(-n + 3) {
    background: #b9d98a;
  }
  &[data-level='4'] i:nth-child(-n + 4) {
    background: #7fd6a0;
  }
}

.link {
  padding: 0;
  border: 0;
  background: transparent;
  color: #ffb067;
  font: 500 12px/1.45 'IBM Plex Sans', sans-serif;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;

  &:hover {
    color: #ffd0a0;
  }
}

@keyframes wipe {
  from {
    clip-path: inset(0 100% 0 0);
  }
  to {
    clip-path: inset(0 0 0 0);
  }
}

@keyframes rise {
  from {
    opacity: 0;
    translate: 0 24px;
  }
  to {
    opacity: 1;
    translate: 0 0;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
}

@media (max-width: 860px) {
  .panel {
    grid-template-columns: 1fr;
    width: min(480px, 100%);
  }

  .intro {
    padding-bottom: 8px;
  }

  .tip,
  .chips {
    display: none;
  }

  .card {
    border-left: 0;
    background: transparent;
  }

  .display {
    font-size: 38px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .panel,
  .row,
  .enter,
  .enter svg {
    animation: none !important;
    transition: none !important;
  }
}
</style>
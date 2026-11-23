<template>
  <section class="tb ui-rise" style="--d: 40ms" aria-label="Tasas de cambio">
    <div class="tb-chips">
      <div v-for="t in items" :key="t.clave" class="tb-chip" :class="{ old: t.vieja }">
        <span class="tb-k">{{ t.label }}</span>
        <b class="tb-v">{{ t.valor ? bs(t.valor) : '—' }}</b>
        <small v-if="t.hora" class="tb-h">{{ t.fecha ? `Tasa del ${t.fecha} · ` : '' }}act. {{ t.hora }}</small>
      </div>
      <button type="button" class="tb-ref" :disabled="cargando" aria-label="Actualizar tasas" @click="$emit('actualizar')">
        <q-icon name="refresh" size="18px" :class="{ spin: cargando }" />
        <q-tooltip>Actualizar tasas ahora</q-tooltip>
      </button>
    </div>

    <p v-if="problema" class="tb-warn" role="alert">
      <q-icon name="warning_amber" size="18px" />
      <span v-if="sinConexion">No se puede consultar al servidor. Las tasas mostradas pueden no ser las actuales.</span>
      <span v-else>
        La fuente de tasas no está respondiendo. Se usa la última tasa guardada; confirma la hora antes de cobrar en Bs.
      </span>
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Tasa, TasaClave, EstadoTasas } from '../composables/useTasas';

const props = defineProps<{
  tasas: Partial<Record<TasaClave, Tasa>>;
  estado: EstadoTasas | null;
  problema: boolean;
  sinConexion: boolean;
  cargando: boolean;
}>();
defineEmits<{ (e: 'actualizar'): void }>();

const bs = (v: number): string => `Bs ${v.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ETIQUETAS: { clave: TasaClave; label: string }[] = [
  { clave: 'usd_bcv', label: 'Dólar BCV' },
  { clave: 'eur_bcv', label: 'Euro BCV' },
  { clave: 'usdt', label: 'USDT' },
];

const items = computed(() =>
  ETIQUETAS.map(({ clave, label }) => {
    const t = props.tasas[clave];
    return {
      clave,
      label,
      valor: t?.valor ?? 0,
      vieja: !t || t.desactualizada,
      // Fecha que reporta la fuente (ej. "2026-11-20" -> "20/11")
      fecha:
        t?.fecha_fuente && /^\d{4}-\d{2}-\d{2}$/.test(t.fecha_fuente)
          ? `${t.fecha_fuente.slice(8, 10)}/${t.fecha_fuente.slice(5, 7)}`
          : '',
      hora: t ? new Date(t.actualizado_en).toLocaleTimeString('es-VE', { timeStyle: 'short' }) : '',
    };
  }),
);
</script>

<style>
.tb {
  margin-bottom: 18px;
}
.tb-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 10px;
}
.tb-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 140px;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
}
.tb-chip.old {
  border-color: rgba(242, 194, 122, 0.55);
}
.tb-k {
  font-size: 12px;
  color: var(--mute);
}
.tb-v {
  font-size: 18px;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}
.tb-h {
  font-size: 11px;
  color: var(--mute);
}
.tb-ref {
  display: grid;
  place-items: center;
  width: 44px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  color: var(--mute);
  cursor: pointer;
}
.tb-ref:hover:not(:disabled) {
  color: var(--ink);
  background: var(--panel-2);
}
.tb-ref:disabled {
  opacity: 0.6;
  cursor: default;
}
.tb .spin {
  animation: tb-spin 0.9s linear infinite;
}
@keyframes tb-spin {
  to {
    transform: rotate(360deg);
  }
}
.tb-warn {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(242, 194, 122, 0.12);
  color: var(--mid);
  font-size: 13px;
}
@media (prefers-reduced-motion: reduce) {
  .tb .spin {
    animation: none;
  }
}
</style>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '../boot/axios';

export type TasaClave = 'usd_bcv' | 'eur_bcv' | 'usdt';

export interface Tasa {
  valor: number;
  fuente: string | null;
  fecha_fuente: string | null;
  actualizado_en: string;
  desactualizada: boolean;
}

export interface EstadoTasas {
  caida: boolean;
  desactualizada: boolean;
  ultimo_error: string | null;
  ultimo_exito: string | null;
  ultimo_intento: string | null;
}

interface RespuestaTasas {
  tasas: Partial<Record<TasaClave, Tasa>>;
  estado: EstadoTasas;
}

// Consulta las tasas al servidor cada minuto y avisa si la fuente deja de responder
export function useTasas(intervaloMs = 60_000) {
  const $q = useQuasar();
  const tasas = ref<Partial<Record<TasaClave, Tasa>>>({});
  const estado = ref<EstadoTasas | null>(null);
  const cargando = ref(false);
  const sinConexion = ref(false); // el navegador no llega a TU servidor

  const hayProblema = computed(
    () => sinConexion.value || !!estado.value?.caida || !!estado.value?.desactualizada,
  );

  const tasaDe = (clave: TasaClave): number => tasas.value[clave]?.valor ?? 0;

  const aplicar = (data: RespuestaTasas): void => {
    tasas.value = data.tasas;
    estado.value = data.estado;
    sinConexion.value = false;
  };

  const cargar = async (): Promise<void> => {
    try {
      const { data } = await api.get<RespuestaTasas>('/tasas');
      aplicar(data);
    } catch {
      sinConexion.value = true;
    }
  };

  const actualizarAhora = async (): Promise<void> => {
    cargando.value = true;
    try {
      const { data } = await api.post<RespuestaTasas>('/tasas/actualizar');
      aplicar(data);
    } catch (error) {
      const msg = (error as { response?: { data?: { error?: string } } }).response?.data?.error;
      $q.notify({ type: 'warning', message: msg || 'No se pudo actualizar las tasas' });
    } finally {
      cargando.value = false;
    }
  };

  // Aviso emergente: aparece cuando empieza el problema y se quita solo cuando se resuelve
  let cerrarAviso: (() => void) | null = null;
  const quitarAviso = (): void => {
    if (cerrarAviso) cerrarAviso();
    cerrarAviso = null;
  };

  watch(hayProblema, (ahora, antes) => {
    if (ahora) {
      quitarAviso();
      cerrarAviso = $q.notify({
        type: 'warning',
        timeout: 0,
        message: 'Las tasas no se están actualizando',
        caption: 'Se usa la última tasa guardada. Revisa la fecha de actualización antes de cobrar en Bs.',
        actions: [{ label: 'Cerrar', color: 'brown-9' }],
      });
    } else if (antes) {
      quitarAviso();
      $q.notify({ type: 'positive', message: 'Las tasas se actualizaron de nuevo' });
    }
  });

  let id = 0;
  onMounted(() => {
    void cargar();
    id = window.setInterval(() => void cargar(), intervaloMs);
  });
  onUnmounted(() => {
    window.clearInterval(id);
    quitarAviso(); // al salir de Pagos no debe quedarse el aviso en otras páginas
  });

  return { tasas, estado, cargando, sinConexion, hayProblema, tasaDe, cargar, actualizarAhora };
}
<template>
  <q-item clickable tag="a" target="_blank" :href="link">
    <q-item-section v-if="icon" avatar>
      <q-icon :name="icon" />
    </q-item-section>

    <q-item-section>
      <q-item-label>{{ label }}</q-item-label>
      <q-item-label caption>{{ caption }}</q-item-label>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
export interface EssentialLinkProps {
  label: string;
  caption?: string;
  link?: string;
  icon?: string;
}

withDefaults(defineProps<EssentialLinkProps>(), {
  caption: '',
  link: '#',
  icon: '',
});
</script>
Con esta salida ya se ve cuál es el problema. Las rutas sí existen en tu backend: recetas, pedidos, pagos y reportes. Lo que pasa es que index.js no las conecta, porque solo monta usuarios e inventario. Por eso recibías el 404.

Además falta un archivo: tu pantalla de Recetas llama a POST /api/produccion al pulsar “Producir”, y no hay ninguna ruta de producción.

mira eso es todo lo que tengo en mi proyecto y tengo 2 dockerfile uno en el backend y uno en el frontend y no se si este bien esto, ya que solo backend y base de datos lo dockee el front es para netlify, pero no se si eso es necesari
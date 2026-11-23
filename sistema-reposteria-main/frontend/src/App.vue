<template>
  <q-layout view="lHh Lpr lFf">
    <!-- Barra superior visible solo cuando no estamos en la página de login -->
    <q-header v-if="route.path !== '/login'" elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title class="text-weight-bold">
          Repostería - Panel de Control
        </q-toolbar-title>

        <q-btn
          flat
          round
          dense
          icon="logout"
          label="Salir"
          @click="handleLogout"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();

const handleLogout = async (): Promise<void> => {
  localStorage.removeItem('token');
  $q.notify({
    type: 'info',
    message: 'Sesión cerrada correctamente.',
  });
  await router.push('/login');
};
</script>
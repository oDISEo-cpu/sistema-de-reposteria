import { defineRouter } from '#q-app';
import { routes, handleHotUpdate } from 'vue-router/auto-routes';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';

export default defineRouter((/* { store, ssrContext } */) => {
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE),
  });

  // --- GUARDIA DE RUTA (PROTECCIÓN DE SESIÓN) ---
  Router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token');

    // Si la ruta NO es /login y NO hay token, redirigir al login
    if (to.path !== '/login' && !token) {
      next('/login');
    } 
    // Si ya tiene sesión y quiere ir al login, mandarlo al inventario (/)
    else if (to.path === '/login' && token) {
      next('/');
    } 
    else {
      next(); // Permitir el paso
    }
  });

  // enable HMR for it
  if (import.meta.hot) {
    handleHotUpdate(Router);
  }

  return Router;
});
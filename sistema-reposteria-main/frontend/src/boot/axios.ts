import axios, { type AxiosInstance } from 'axios';

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Adjunta el token a cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el token venció o es inválido, vuelve al login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const esLogin = error.config?.url?.includes('/usuarios/login');
    if (error.response?.status === 401 && !esLogin) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.hash = '#/login';
    }
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  },
);

export { api };
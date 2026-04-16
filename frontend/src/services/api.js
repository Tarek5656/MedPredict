// src/services/api.js

/**
 * Configuration centralisée d'Axios.
 * 
 * Ce fichier crée une instance Axios pré-configurée avec :
 * - L'URL de base de l'API Django
 * - Un interceptor qui ajoute automatiquement le token JWT à chaque requête
 * - Un interceptor qui gère l'expiration du token (rafraîchissement automatique)
 */

import axios from 'axios';

// Crée une instance Axios avec l'URL de base
const api = axios.create({
  baseURL: 'http://localhost:8000/api',  // URL du backend Django
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Interceptor de requête ──────────────────────────────────────
// S'exécute AVANT chaque requête envoyée par Axios.
// Ajoute le token JWT dans le header Authorization.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Interceptor de réponse ──────────────────────────────────────
// S'exécute APRÈS chaque réponse reçue.
// Si le serveur retourne 401 (token expiré), on tente de le rafraîchir.
api.interceptors.response.use(
  (response) => response,  // Réponse OK → on la retourne telle quelle
  async (error) => {
    const originalRequest = error.config;

    // Si erreur 401 ET qu'on n'a pas déjà essayé de rafraîchir
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;  // Flag pour éviter une boucle infinie

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        // Appel direct (pas via l'instance 'api' pour éviter la boucle)
        const response = await axios.post(
          'http://localhost:8000/api/token/refresh/',
          { refresh: refreshToken }
        );

        const newAccessToken = response.data.access;
        localStorage.setItem('access_token', newAccessToken);

        // Rejoue la requête originale avec le nouveau token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Le refresh token est aussi expiré → déconnexion
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
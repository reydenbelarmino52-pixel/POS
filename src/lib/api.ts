import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pos_token');
  const storeId = localStorage.getItem('pos_store_id');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (storeId) {
    config.headers['x-store-id'] = storeId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK') {
      console.error('Network Error: The API is unreachable. This usually means the backend is not running or redirected incorrectly.');
    }
    
    // Global handle for 401 (Unauthorized)
    if (error.response?.status === 401) {
       console.warn('Unauthorized request detected, clearing session...');
       localStorage.removeItem('pos_token');
       localStorage.removeItem('pos_user');
       localStorage.removeItem('pos_stores');
       localStorage.removeItem('pos_current_store');
       localStorage.removeItem('pos_store_id');
       // We can't use navigate() here easily without context, but we can window.location
       if (!window.location.pathname.includes('/login')) {
         window.location.href = '/login';
       }
    }
    
    return Promise.reject(error);
  }
);

export default api;

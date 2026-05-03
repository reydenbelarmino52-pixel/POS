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
    return Promise.reject(error);
  }
);

export default api;

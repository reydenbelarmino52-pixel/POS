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

export default api;

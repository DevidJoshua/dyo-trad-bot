import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
};

export const accountApi = {
  getAll: () => api.get('/account'),
  getPerformance: (id: number) => api.get(`/account/${id}/performance`),
};

export const strategyApi = {
  getAll: () => api.get('/strategies'),
  update: (id: number, data: any) => api.put(`/strategies/${id}`, data),
};

export const signalApi = {
  getAll: () => api.get('/signals'),
};

export const orderApi = {
  getOpen: () => api.get('/orders/open'),
  getHistory: (limit?: number) => api.get(`/orders/history${limit ? `?limit=${limit}` : ''}`),
  close: (id: number) => api.post(`/orders/close/${id}`),
  modify: (id: number, data: any) => api.post(`/orders/modify/${id}`, data),
};

export const riskApi = {
  get: () => api.get('/risk'),
  update: (data: any) => api.put('/risk', data),
};

export const marketDataApi = {
  getCandles: (symbol: string, timeframe: string, limit?: number) =>
    api.get(`/market-data/${symbol}/${timeframe}${limit ? `?limit=${limit}` : ''}`),
};

export const backtestApi = {
  run: (params: any) => api.post('/backtest', params),
};

export const auditApi = {
  getLogs: (limit?: number) => api.get(`/audit-logs${limit ? `?limit=${limit}` : ''}`),
};

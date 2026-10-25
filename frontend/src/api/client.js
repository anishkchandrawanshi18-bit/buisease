import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: attach Bearer token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('buisease_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 token expiry gracefully
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthUrl = error.config.url.includes('/login') || error.config.url.includes('/register');
      if (!isAuthUrl) {
        localStorage.removeItem('buisease_token');
        localStorage.removeItem('buisease_user');
        window.dispatchEvent(new Event('auth-change'));
      }
    }
    return Promise.reject(error);
  }
);

// Helper to extract clean error message
export const getErrorMessage = (error) => {
  if (error.response?.data?.detail) {
    if (typeof error.response.data.detail === 'string') {
      return error.response.data.detail;
    }
    if (Array.isArray(error.response.data.detail)) {
      return error.response.data.detail.map((err) => err.msg || err.detail).join(', ');
    }
  }
  return error.message || 'An unexpected error occurred. Please try again.';
};

// API Service Layer
export const api = {
  // Auth
  register: (data) => apiClient.post('/register', data),
  login: (data) => apiClient.post('/login', data),
  logout: (data) => apiClient.post('/logout', data),
  getMe: () => apiClient.get('/users/me'),
  recoverCredentials: (email) => apiClient.post('/users/recover-credentials', { email }),
  resetPassword: (token, newPassword) => apiClient.post('/users/reset-password', { token, new_password: newPassword }),

  // Account
  changePassword: (data) => apiClient.put('/users/change-password', data),
  updateUsername: (data) => apiClient.put('/users/update-username', data),

  // Tasks
  getTasks: (username) => apiClient.get('/tasks', { params: username ? { username } : {} }),
  getTask: (taskId) => apiClient.get(`/tasks/${taskId}`),
  createTask: (data) => apiClient.post('/tasks', data),
  updateTask: (taskId, data) => apiClient.put(`/tasks/${taskId}`, data),
  deleteTask: (taskId) => apiClient.delete(`/tasks/${taskId}`),
  clearCompletedTasks: (username) => apiClient.delete('/tasks/completed', { params: username ? { username } : {} }),
  getTaskStats: (username) => apiClient.get('/tasks/stats', { params: username ? { username } : {} }),

  // Competitor Analysis
  getFoodDeliveryInsights: () => apiClient.get('/analysis/food-delivery'),
  getZomatoAnalysis: () => apiClient.get('/competitor-analysis/food-delivery/zomato'),
  getSwiggyAnalysis: () => apiClient.get('/competitor-analysis/food-delivery/swiggy'),

  // Chart image helpers
  getFoodDeliveryChartUrl: () => `${API_BASE_URL}/competitor-analysis/food-delivery/charts?t=${Date.now()}`,
  getZomatoChartUrl: () => `${API_BASE_URL}/competitor-analysis/food-delivery/zomato/chart?t=${Date.now()}`,
  getSwiggyChartUrl: () => `${API_BASE_URL}/competitor-analysis/food-delivery/swiggy/chart?t=${Date.now()}`,
  getTaskBarChartUrl: (username, token) => `${API_BASE_URL}/tasks/stats/bar-chart?username=${encodeURIComponent(username || '')}&token=${encodeURIComponent(token || '')}&t=${Date.now()}`,
};

export default apiClient;

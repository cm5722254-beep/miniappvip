/**
 * Admin API Service
 * Separate client with admin JWT token
 */
import axios, { AxiosInstance } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

const ADMIN_TOKEN_KEY = 'admin_token';

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export const adminApiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

adminApiClient.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      clearAdminToken();
      window.location.href = '/admin/login';
    }
    const message = error.response?.data?.message;
    const errorMessage = Array.isArray(message) ? message[0] : message;
    return Promise.reject(new Error(errorMessage || 'Server error'));
  },
);

/* ─── Admin API calls ─── */

export const adminAuthService = {
  async login(username: string, password: string) {
    return adminApiClient.post('/auth/admin/login', { username, password });
  },
};

export const adminDashboardService = {
  async getStats() {
    return adminApiClient.get('/admin/stats');
  },
};

export const adminMoviesService = {
  async getMovies(params?: { page?: number; limit?: number; status?: string }) {
    return adminApiClient.get('/admin/movies', { params: { page: 1, limit: 20, ...params } });
  },
  async createMovie(data: object) {
    return adminApiClient.post('/admin/movies', data);
  },
  async updateMovie(id: string, data: object) {
    return adminApiClient.patch(`/admin/movies/${id}`, data);
  },
  async deleteMovie(id: string) {
    return adminApiClient.delete(`/admin/movies/${id}`);
  },
  async getCategories() {
    return adminApiClient.get('/categories');
  },
};

export const adminUsersService = {
  async getUsers(params?: { page?: number; limit?: number; search?: string }) {
    return adminApiClient.get('/admin/users', { params: { page: 1, limit: 20, ...params } });
  },
  async adjustBalance(userId: string, amount: number, reason: string) {
    return adminApiClient.post(`/admin/users/${userId}/balance`, { amount, reason });
  },
  async updateStatus(userId: string, status: string) {
    return adminApiClient.patch(`/admin/users/${userId}/status`, { status });
  },
};

export const adminDepositsService = {
  async getDeposits(params?: { page?: number; limit?: number; status?: string }) {
    return adminApiClient.get('/admin/deposits', { params: { page: 1, limit: 20, ...params } });
  },
  async approveDeposit(depositId: string) {
    return adminApiClient.post(`/admin/deposits/${depositId}/approve`);
  },
  async rejectDeposit(depositId: string, reason: string) {
    return adminApiClient.post(`/admin/deposits/${depositId}/reject`, { reason });
  },
};

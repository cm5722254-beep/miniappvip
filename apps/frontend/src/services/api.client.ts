import axios, { AxiosInstance, AxiosError } from 'axios';
import { useAuthStore } from '@/store/auth.store';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from store to every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — clear auth state and let UI redirect
apiClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<{ message: string | string[]; success: boolean }>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    // Re-throw with Khmer message if available
    const message = error.response?.data?.message;
    const errorMessage = Array.isArray(message) ? message[0] : message;
    return Promise.reject(new Error(errorMessage || 'មិនអាចភ្ជាប់ទៅ Server បានទេ'));
  },
);

export default apiClient;

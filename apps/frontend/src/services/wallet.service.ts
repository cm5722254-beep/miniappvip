import apiClient from './api.client';
import type { ApiResponse, WalletInfo, Pagination, Transaction, Deposit } from '@/types';

export const walletService = {
  async getWallet(): Promise<ApiResponse<WalletInfo>> {
    return apiClient.get('/wallet');
  },

  async getTransactions(page = 1, limit = 20): Promise<ApiResponse<Pagination<Transaction>>> {
    return apiClient.get('/wallet/transactions', { params: { page, limit } });
  },

  async createDeposit(data: {
    amount: number;
    paymentMethod: string;
    paymentReference?: string;
  }): Promise<ApiResponse<Deposit>> {
    return apiClient.post('/wallet/deposit', data);
  },

  async getDeposit(depositId: string): Promise<ApiResponse<Deposit>> {
    return apiClient.get(`/wallet/deposit/${depositId}`);
  },

  async cancelDeposit(depositId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post(`/wallet/deposit/${depositId}/cancel`);
  },
};

export const purchasesService = {
  async purchaseMovie(movieId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post(`/purchases/movie/${movieId}`);
  },

  async purchaseEpisode(episodeId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post(`/purchases/episode/${episodeId}`);
  },

  async getPurchases(page = 1, limit = 20) {
    return apiClient.get('/purchases', { params: { page, limit } });
  },
};

export const watchProgressService = {
  async getProgress(episodeId: string) {
    return apiClient.get(`/watch-progress/${episodeId}`);
  },

  async updateProgress(episodeId: string, position: number, duration: number) {
    return apiClient.post(`/watch-progress/${episodeId}`, { position, duration });
  },

  async getContinueWatching() {
    return apiClient.get('/watch-progress/continue-watching');
  },
};

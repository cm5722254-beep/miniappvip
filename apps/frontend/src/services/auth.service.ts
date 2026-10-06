import apiClient from './api.client';
import type { ApiResponse, User } from '@/types';

export const authService = {
  /**
   * Authenticate with Telegram initData
   * Sends verified initData to backend for server-side validation
   */
  async loginWithTelegram(initData: string): Promise<{ accessToken: string; user: User }> {
    const response = await apiClient.post<unknown, ApiResponse<{ accessToken: string; user: User }>>(
      '/auth/telegram',
      {},
      {
        headers: {
          Authorization: `TelegramWebApp ${initData}`,
        },
      },
    );
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<unknown, ApiResponse<User>>('/users/me');
    return response.data;
  },
};

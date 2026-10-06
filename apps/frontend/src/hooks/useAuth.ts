/**
 * Auth Hook — handles Telegram login flow
 * 1. Gets initData from Telegram WebApp SDK
 * 2. Sends to backend for server-side HMAC validation
 * 3. Stores JWT + user in Zustand
 */
import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import { useTelegram } from './useTelegram';

export function useAuth() {
  const { setAuth, setLoading, setError, logout, isAuthenticated, user, isLoading, error } =
    useAuthStore();
  const { initData, isReady, isInTelegram } = useTelegram();

  const loginWithTelegram = useCallback(async () => {
    if (!initData) {
      setError('មិនអាចទទួលបានព័ត៌មាន Telegram ទេ');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await authService.loginWithTelegram(initData);
      setAuth(result.accessToken, result.user);
    } catch (err) {
      setError((err as Error).message || 'ការចូលគណនីបានបរាជ័យ');
    } finally {
      setLoading(false);
    }
  }, [initData, setAuth, setError, setLoading]);

  // Auto-login when Telegram SDK is ready
  useEffect(() => {
    if (!isReady) return;
    if (isAuthenticated) return; // Already logged in

    if (isInTelegram && initData) {
      loginWithTelegram();
    } else if (!isInTelegram) {
      // Dev mode: show error that Telegram is required
      setError('សូមបើក App នេះតាម Telegram');
    }
  }, [isReady, isAuthenticated, isInTelegram, initData, loginWithTelegram]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    logout,
    loginWithTelegram,
  };
}

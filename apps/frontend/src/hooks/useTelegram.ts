/**
 * Telegram Mini App Hook
 * Handles all Telegram WebApp SDK integration:
 * - Detects Telegram environment
 * - Expands viewport
 * - Sets theme colors
 * - Provides haptic feedback
 * - Manages back button
 */
import { useEffect, useRef, useState } from 'react';
import type { TelegramWebApp } from '@/types';

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);
  const tg = useRef<TelegramWebApp | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      tg.current = webApp;

      // Tell Telegram the app is ready
      webApp.ready();

      // Expand to full height
      webApp.expand();

      // Set dark cinematic colors
      try {
        webApp.setBackgroundColor('#0a0a0f');
        webApp.setHeaderColor('#0a0a0f');
      } catch {
        // Some versions don't support color setting
      }

      // Disable closing confirmation (user must use Telegram back)
      try {
        webApp.disableClosingConfirmation();
      } catch {
        // Not all versions support this
      }

      setIsReady(true);
    } else {
      // Running outside Telegram (dev browser)
      setIsReady(true);
    }
  }, []);

  const haptic = {
    light: () => {
      try { tg.current?.HapticFeedback?.impactOccurred('light'); } catch {}
    },
    medium: () => {
      try { tg.current?.HapticFeedback?.impactOccurred('medium'); } catch {}
    },
    success: () => {
      try { tg.current?.HapticFeedback?.notificationOccurred('success'); } catch {}
    },
    error: () => {
      try { tg.current?.HapticFeedback?.notificationOccurred('error'); } catch {}
    },
    selection: () => {
      try { tg.current?.HapticFeedback?.selectionChanged(); } catch {}
    },
  };

  const showBackButton = (callback: () => void) => {
    if (!tg.current?.BackButton) return;
    tg.current.BackButton.show();
    tg.current.BackButton.onClick(callback);
  };

  const hideBackButton = () => {
    if (!tg.current?.BackButton) return;
    tg.current.BackButton.hide();
  };

  return {
    tg: tg.current,
    isReady,
    initData: tg.current?.initData ?? '',
    user: tg.current?.initDataUnsafe?.user ?? null,
    platform: tg.current?.platform ?? 'unknown',
    haptic,
    showBackButton,
    hideBackButton,
    isInTelegram: !!window?.Telegram?.WebApp,
  };
}

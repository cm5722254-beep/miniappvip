/**
 * Utility helpers
 */

/** Format price: "0.00" → "$0" or "$5.00" */
export function formatPrice(price: string | number): string {
  const n = parseFloat(String(price));
  if (isNaN(n)) return '$0';
  if (n === 0) return 'ឥតគិតថ្លៃ';
  return `$${n.toFixed(2).replace(/\.00$/, '')}`;
}

/** Format balance always with 2 decimal places */
export function formatBalance(balance: string | number): string {
  const n = parseFloat(String(balance));
  if (isNaN(n)) return '$0.00';
  return `$${n.toFixed(2)}`;
}

/** Format duration from seconds → "1:23:45" or "23:45" */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Format Khmer date */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('km-KH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Format Khmer datetime */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('km-KH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Get Khmer transaction type label */
export function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    DEPOSIT: 'ដាក់ប្រាក់',
    PURCHASE: 'ទិញរឿង',
    REFUND: 'សងប្រាក់វិញ',
    ADMIN_CREDIT: 'Admin បន្ថែម',
    ADMIN_DEBIT: 'Admin កាត់',
  };
  return labels[type] || type;
}

/** Get progress percentage */
export function getProgressPercent(position: number, duration: number): number {
  if (!duration || duration <= 0) return 0;
  return Math.min(100, Math.round((position / duration) * 100));
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Debounce function */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timeout: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  }) as T;
}

/** Build image URL with fallback */
export function posterUrl(url?: string | null): string {
  if (!url) return '/placeholder-poster.svg';
  return url;
}

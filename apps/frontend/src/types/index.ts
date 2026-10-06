// ─── Telegram WebApp ───
export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    auth_date: number;
    hash: string;
    query_id?: string;
    start_param?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  BackButton: TelegramBackButton;
  MainButton: TelegramMainButton;
  HapticFeedback: TelegramHapticFeedback;
  ready(): void;
  expand(): void;
  close(): void;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
  setBackgroundColor(color: string): void;
  setHeaderColor(color: string): void;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
}

export interface TelegramBackButton {
  isVisible: boolean;
  show(): void;
  hide(): void;
  onClick(callback: () => void): void;
  offClick(callback: () => void): void;
}

export interface TelegramMainButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;
  setText(text: string): void;
  onClick(callback: () => void): void;
  offClick(callback: () => void): void;
  show(): void;
  hide(): void;
  enable(): void;
  disable(): void;
  showProgress(leaveActive?: boolean): void;
  hideProgress(): void;
}

export interface TelegramHapticFeedback {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
  notificationOccurred(type: 'error' | 'success' | 'warning'): void;
  selectionChanged(): void;
}

// Make Telegram global
declare global {
  interface Window {
    Telegram: {
      WebApp: TelegramWebApp;
    };
  }
}

// ─── API Models ───
export interface User {
  id: string;
  telegramId: string;
  username?: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  balance: string | number;
  currency: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  createdAt: string;
  stats?: {
    totalPurchases: number;
    watchHistory: number;
    favorites: number;
  };
}

export interface Category {
  id: string;
  name: string;
  nameKh: string;
  slug: string;
  imageUrl?: string;
  sortOrder: number;
  _count?: { movies: number };
}

export interface Movie {
  id: string;
  title: string;
  titleKh?: string;
  description?: string;
  descriptionKh?: string;
  posterUrl?: string;
  bannerUrl?: string;
  trailerUrl?: string;
  year?: number;
  totalEpisodes: number;
  price: string | number;
  isFree: boolean;
  isPopular: boolean;
  isNew: boolean;
  isFeatured: boolean;
  rating?: string | number;
  viewCount: number;
  purchaseCount: number;
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';
  tags: string[];
  category: {
    id: string;
    name: string;
    nameKh: string;
    slug: string;
  };
  isPurchased?: boolean;
  createdAt: string;
}

export interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  titleKh?: string;
  thumbnailUrl?: string;
  duration?: number;
  price: string | number;
  isFree: boolean;
  isLocked?: boolean;
  sortOrder: number;
}

export interface PlaybackData {
  episodeId: string;
  episodeNumber: number;
  title: string;
  titleKh?: string;
  playbackUrls: Array<{ quality: string; url: string }>;
  subtitles: Array<{
    id: string;
    language: string;
    languageName: string;
    isDefault: boolean;
    url: string;
  }>;
  resumePosition: number;
  duration: number;
}

export interface WalletInfo {
  id: string;
  balance: string | number;
  currency: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'PURCHASE' | 'REFUND' | 'ADMIN_CREDIT' | 'ADMIN_DEBIT';
  amount: string | number;
  balanceBefore: string | number;
  balanceAfter: string | number;
  description: string;
  createdAt: string;
}

export interface Deposit {
  depositId: string;
  amount: string | number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  paymentMethod: string;
  instructions?: string;
  config?: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    qrImageUrl?: string;
  };
  expiresAt?: string;
  createdAt: string;
}

export interface Purchase {
  id: string;
  totalAmount: string | number;
  status: 'COMPLETED' | 'REFUNDED';
  createdAt: string;
  movie?: Pick<Movie, 'id' | 'title' | 'titleKh' | 'posterUrl' | 'totalEpisodes'>;
}

export interface WatchProgress {
  id: string;
  userId: string;
  episodeId: string;
  movieId: string;
  position: number;
  duration: number;
  completed: boolean;
  updatedAt: string;
  movie?: Pick<Movie, 'id' | 'title' | 'titleKh' | 'posterUrl' | 'totalEpisodes'>;
  episode?: Pick<Episode, 'id' | 'episodeNumber' | 'title' | 'titleKh'> & { thumbnailUrl?: string };
}

export interface Pagination<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

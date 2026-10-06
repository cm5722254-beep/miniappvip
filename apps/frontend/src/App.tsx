import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { BottomNav } from '@/components/ui/BottomNav';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { TelegramErrorScreen } from '@/components/ui/TelegramErrorScreen';

// ── Mini-App Pages ──
import { HomePage }     from '@/pages/HomePage';
import { SearchPage }   from '@/pages/SearchPage';
import { MoviePage }    from '@/pages/MoviePage';
import { WatchPage }    from '@/pages/WatchPage';
import { LibraryPage }  from '@/pages/LibraryPage';
import { WalletPage }   from '@/pages/WalletPage';
import { DepositPage }  from '@/pages/DepositPage';
import { ProfilePage }  from '@/pages/ProfilePage';
import { CategoryPage } from '@/pages/CategoryPage';

// ── Admin Pages ──
import { AdminLoginPage }     from '@/admin/pages/AdminLoginPage';
import { AdminDashboardPage } from '@/admin/pages/AdminDashboardPage';
import { AdminMoviesPage }    from '@/admin/pages/AdminMoviesPage';
import { AdminUsersPage }     from '@/admin/pages/AdminUsersPage';
import { AdminDepositsPage }  from '@/admin/pages/AdminDepositsPage';
import { AdminGuard }         from '@/admin/AdminGuard';

// ─────────────────────────────────────────
// Mini-App shell (requires Telegram auth)
// ─────────────────────────────────────────
function MiniApp() {
  const { isAuthenticated, isLoading, error } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (error && !isAuthenticated) return <TelegramErrorScreen message={error} />;
  if (!isAuthenticated) return <LoadingScreen message="កំពុងភ្ជាប់..." />;

  return (
    <div className="min-h-screen bg-cinema-bg pb-20">
      <Routes>
        <Route path="/"                                element={<HomePage />} />
        <Route path="/search"                          element={<SearchPage />} />
        <Route path="/movie/:id"                       element={<MoviePage />} />
        <Route path="/movie/:movieId/watch/:episodeId" element={<WatchPage />} />
        <Route path="/library"                         element={<LibraryPage />} />
        <Route path="/wallet"                          element={<WalletPage />} />
        <Route path="/wallet/deposit"                  element={<DepositPage />} />
        <Route path="/profile"                         element={<ProfilePage />} />
        <Route path="/category/:slug"                  element={<CategoryPage />} />
        <Route path="*"                                element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

// ─────────────────────────────────────────
// Root — splits /admin vs mini-app
// ─────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin routes — no Telegram auth required */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={<AdminGuard><AdminDashboardPage /></AdminGuard>}
        />
        <Route
          path="/admin/movies"
          element={<AdminGuard><AdminMoviesPage /></AdminGuard>}
        />
        <Route
          path="/admin/users"
          element={<AdminGuard><AdminUsersPage /></AdminGuard>}
        />
        <Route
          path="/admin/deposits"
          element={<AdminGuard><AdminDepositsPage /></AdminGuard>}
        />

        {/* Telegram Mini-App — all other routes */}
        <Route path="/*" element={<MiniApp />} />
      </Routes>
    </BrowserRouter>
  );
}

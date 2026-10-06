import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearAdminToken } from './admin.service';
import { clsx } from 'clsx';

const NAV_LINKS = [
  { path: '/admin', label: 'Dashboard', icon: '📊', exact: true },
  { path: '/admin/movies', label: 'Movies', icon: '🎬', exact: false },
  { path: '/admin/users', label: 'Users', icon: '👥', exact: false },
  { path: '/admin/deposits', label: 'Deposits', icon: '💰', exact: false },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAdminToken();
    navigate('/admin/login');
  };

  const isActive = (link: { path: string; exact: boolean }) =>
    link.exact ? location.pathname === link.path : location.pathname.startsWith(link.path);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xl">👑</span>
          <div>
            <span className="text-white font-bold text-base leading-none block">Admin Panel</span>
            <span className="text-gray-500 text-[10px]">អាធិរាជរឿង</span>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive(link)
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800',
              )}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-400/10"
        >
          Logout
        </button>
      </header>

      {/* Mobile tab bar */}
      <nav className="md:hidden sticky top-[53px] z-40 bg-gray-900 border-b border-gray-800 flex overflow-x-auto">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={clsx(
              'flex-shrink-0 flex flex-col items-center gap-0.5 px-5 py-2.5 text-[10px] font-medium transition-colors border-b-2',
              isActive(link)
                ? 'text-yellow-400 border-yellow-400'
                : 'text-gray-500 border-transparent',
            )}
          >
            <span className="text-lg">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}

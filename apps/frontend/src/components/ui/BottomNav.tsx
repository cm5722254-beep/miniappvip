import { useNavigate, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { useTelegram } from '@/hooks/useTelegram';

const NAV_ITEMS = [
  { path: '/',        icon: '🏠', label: 'ទំព័រដើម' },
  { path: '/search',  icon: '🔍', label: 'ស្វែងរក'   },
  { path: '/library', icon: '📚', label: 'រឿងខ្ញុំ'   },
  { path: '/wallet',  icon: '💰', label: 'កាបូប'      },
  { path: '/profile', icon: '👤', label: 'គណនី'       },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { haptic } = useTelegram();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const handleNav = (path: string) => {
    haptic.selection();
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-cinema-border safe-bottom">
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.path}
            onClick={() => handleNav(item.path)}
            className={clsx(
              'nav-item flex-1 rounded-xl transition-all duration-200',
              isActive(item.path)
                ? 'text-gold'
                : 'text-gray-500 active:text-gray-300',
            )}
          >
            <span className={clsx('text-xl', isActive(item.path) && 'drop-shadow-[0_0_6px_rgba(212,175,55,0.8)]')}>
              {item.icon}
            </span>
            <span className={clsx(
              'text-[10px] font-medium',
              isActive(item.path) ? 'text-gold' : 'text-gray-500',
            )}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}

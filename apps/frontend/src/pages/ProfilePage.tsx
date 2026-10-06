import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useTelegram } from '@/hooks/useTelegram';
import { walletService } from '@/services/wallet.service';
import { formatBalance, formatDate } from '@/utils/helpers';

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { haptic } = useTelegram();

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletService.getWallet().then((r) => r.data),
    enabled: !!user,
  });

  const handleLogout = () => {
    haptic.medium();
    logout();
  };

  if (!user) return null;

  return (
    <div className="bg-cinema-bg min-h-screen animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-cinema-border px-4 py-3">
        <h1 className="text-white font-bold text-lg">👤 គណនីរបស់ខ្ញុំ</h1>
      </header>

      <div className="px-4 pt-4 pb-8 space-y-4">
        {/* ─── Profile Card ─── */}
        <div className="bg-gradient-to-br from-cinema-panel via-cinema-panel to-cinema-card rounded-2xl border border-cinema-border p-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.firstName}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-gold/40 shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gold/10 border-2 border-gold/40 flex items-center justify-center shadow-lg">
                  <span className="text-4xl">👤</span>
                </div>
              )}
              {user.status === 'ACTIVE' && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-cinema-bg" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-bold text-lg leading-tight">
                {user.firstName} {user.lastName ?? ''}
              </h2>
              {user.username && (
                <p className="text-gray-400 text-sm">@{user.username}</p>
              )}
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] bg-gold/20 text-gold rounded-full px-2 py-0.5 font-medium">
                  Telegram
                </span>
                {user.status === 'ACTIVE' ? (
                  <span className="text-[10px] bg-green-500/20 text-green-400 rounded-full px-2 py-0.5 font-medium">
                    ✅ សកម្ម
                  </span>
                ) : (
                  <span className="text-[10px] bg-red-500/20 text-red-400 rounded-full px-2 py-0.5 font-medium">
                    ⛔ ប្លុក
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Member since */}
          <div className="mt-4 pt-4 border-t border-cinema-border">
            <p className="text-gray-500 text-xs">
              សមាជិកតាំងពី {formatDate(user.createdAt)}
            </p>
          </div>
        </div>

        {/* ─── Wallet Balance ─── */}
        <div
          className="flex items-center justify-between bg-cinema-panel rounded-2xl border border-gold/30 p-4 cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => navigate('/wallet')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center">
              <span className="text-xl">💰</span>
            </div>
            <div>
              <p className="text-gray-400 text-xs">សមតុល្យ</p>
              <p className="text-gold font-bold text-xl">
                {formatBalance(wallet?.balance ?? user.balance)}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate('/wallet/deposit');
            }}
            className="bg-gold text-black text-xs font-bold rounded-xl px-4 py-2 active:scale-95 transition-transform"
          >
            ➕ ដាក់ប្រាក់
          </button>
        </div>

        {/* ─── Stats ─── */}
        <div className="grid grid-cols-3 gap-3">
          <StatsCard
            value={user.stats?.totalPurchases ?? 0}
            label="ការទិញ"
            icon="🎬"
          />
          <StatsCard
            value={user.stats?.watchHistory ?? 0}
            label="ប្រវត្តិ"
            icon="▶️"
          />
          <StatsCard
            value={user.stats?.favorites ?? 0}
            label="ចូលចិត្ត"
            icon="❤️"
          />
        </div>

        {/* ─── Menu Items ─── */}
        <div className="bg-cinema-panel rounded-2xl border border-cinema-border overflow-hidden divide-y divide-cinema-border">
          <MenuItem
            icon="📚"
            label="បណ្ណាល័យរឿង"
            description="រឿងដែលបានទិញ"
            onClick={() => navigate('/library')}
          />
          <MenuItem
            icon="💳"
            label="ប្រតិបត្តិការ"
            description="ប្រវត្តិការទូទាត់"
            onClick={() => navigate('/wallet')}
          />
          <MenuItem
            icon="🔍"
            label="ស្វែងរករឿង"
            description="រុករករឿងថ្មី"
            onClick={() => navigate('/search')}
          />
        </div>

        {/* ─── App Info ─── */}
        <div className="bg-cinema-panel rounded-2xl border border-cinema-border overflow-hidden divide-y divide-cinema-border">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-gray-400 text-sm">កំណែ App</span>
            <span className="text-gray-500 text-xs">v1.0.0</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-gray-400 text-sm">Telegram ID</span>
            <span className="text-gray-500 text-xs font-mono">{user.telegramId}</span>
          </div>
        </div>

        {/* ─── Logout ─── */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-500/10 border border-red-500/30 text-red-400 font-semibold rounded-xl py-4 text-base active:scale-95 transition-transform"
        >
          🚪 ចាកចេញ
        </button>

        {/* Footer branding */}
        <div className="text-center pt-2">
          <p className="text-gold-gradient font-bold text-base">👑 អាធិរាជរឿង</p>
          <p className="text-gray-600 text-[10px] mt-1">រឿងល្អៗ នៅជិតអ្នកជានិច្ច</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function StatsCard({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon: string;
}) {
  return (
    <div className="bg-cinema-card rounded-xl border border-cinema-border p-3 text-center">
      <span className="text-xl">{icon}</span>
      <p className="text-white font-bold text-xl mt-1">{value}</p>
      <p className="text-gray-500 text-[10px]">{label}</p>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  description,
  onClick,
}: {
  icon: string;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 active:bg-white/5 transition-colors text-left"
    >
      <div className="w-9 h-9 rounded-xl bg-cinema-card border border-cinema-border flex items-center justify-center flex-shrink-0 text-base">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">{label}</p>
        <p className="text-gray-500 text-xs">{description}</p>
      </div>
      <span className="text-gray-600 text-sm flex-shrink-0">›</span>
    </button>
  );
}

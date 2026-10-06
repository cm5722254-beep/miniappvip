import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { walletService } from '@/services/wallet.service';
import { useAuthStore } from '@/store/auth.store';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatBalance, formatDateTime, getTransactionTypeLabel } from '@/utils/helpers';
import type { Transaction } from '@/types';
import { clsx } from 'clsx';

export function WalletPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: wallet, isLoading: loadingWallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletService.getWallet().then((r) => r.data),
  });

  const { data: txData, isLoading: loadingTx } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => walletService.getTransactions(1, 30).then((r) => r.data),
  });

  const transactions = txData?.items ?? [];

  return (
    <div className="bg-cinema-bg min-h-screen animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-cinema-border px-4 py-3">
        <h1 className="text-white font-bold text-lg">💰 កាបូបប្រាក់</h1>
      </header>

      <div className="px-4 pt-4 pb-6 space-y-4">
        {/* ─── Balance Card ─── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-900/40 via-cinema-panel to-cinema-card border border-gold/30 p-5">
          {/* Decorative rings */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gold/5 border border-gold/10" />
          <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full bg-gold/5 border border-gold/10" />

          <p className="text-gray-400 text-xs font-medium mb-1">សមតុល្យបច្ចុប្បន្ន</p>

          {loadingWallet ? (
            <Skeleton className="h-10 w-40 rounded-lg mb-4" />
          ) : (
            <h2 className="text-gold font-bold text-4xl mb-4 text-gold-gradient">
              {formatBalance(wallet?.balance ?? user?.balance ?? 0)}
            </h2>
          )}

          {/* User info */}
          {user && (
            <div className="flex items-center gap-2 mb-4">
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.firstName}
                  className="w-7 h-7 rounded-full border border-gold/40 object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-sm">
                  👤
                </div>
              )}
              <div>
                <p className="text-white text-xs font-semibold">
                  {user.firstName} {user.lastName ?? ''}
                </p>
                {user.username && (
                  <p className="text-gray-500 text-[10px]">@{user.username}</p>
                )}
              </div>
            </div>
          )}

          {/* Deposit button */}
          <button
            onClick={() => navigate('/wallet/deposit')}
            className="w-full bg-gold text-black font-bold rounded-xl py-3 text-sm active:scale-95 transition-transform shadow-lg"
          >
            ➕ ដាក់ប្រាក់
          </button>
        </div>

        {/* ─── Quick Stats ─── */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon="🎬"
            label="ការទិញសរុប"
            value={`${user?.stats?.totalPurchases ?? 0} ភាពយន្ត`}
          />
          <StatCard
            icon="▶️"
            label="ប្រវត្តិមើល"
            value={`${user?.stats?.watchHistory ?? 0} ភាគ`}
          />
        </div>

        {/* ─── Transactions ─── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-base">📋 ប្រវត្តិប្រតិបត្តិការ</h2>
            {txData && txData.total > 30 && (
              <span className="text-gray-500 text-xs">{txData.total} ការបរានទំាងអស់</span>
            )}
          </div>

          {loadingTx ? (
            <TransactionSkeleton />
          ) : transactions.length === 0 ? (
            <EmptyState
              icon="📋"
              title="មិនទាន់មានប្រតិបត្តិការ"
              description="ប្រតិបត្តិការដាក់ប្រាក់ ឬទិញរឿងនឹងបង្ហាញនៅទីនេះ"
            />
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} transaction={tx} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-cinema-panel rounded-xl p-3 border border-cinema-border">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{icon}</span>
        <span className="text-gray-400 text-xs">{label}</span>
      </div>
      <p className="text-white font-bold text-base">{value}</p>
    </div>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const isCredit = ['DEPOSIT', 'REFUND', 'ADMIN_CREDIT'].includes(transaction.type);
  const amount = parseFloat(String(transaction.amount));

  const typeColors: Record<string, string> = {
    DEPOSIT: 'bg-green-500/20 text-green-400',
    PURCHASE: 'bg-red-500/20 text-red-400',
    REFUND: 'bg-blue-500/20 text-blue-400',
    ADMIN_CREDIT: 'bg-purple-500/20 text-purple-400',
    ADMIN_DEBIT: 'bg-orange-500/20 text-orange-400',
  };

  const typeIcons: Record<string, string> = {
    DEPOSIT: '⬆️',
    PURCHASE: '🎬',
    REFUND: '↩️',
    ADMIN_CREDIT: '✨',
    ADMIN_DEBIT: '⚙️',
  };

  return (
    <div className="flex items-center gap-3 bg-cinema-panel rounded-xl p-3 border border-cinema-border">
      {/* Icon */}
      <div
        className={clsx(
          'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-base',
          typeColors[transaction.type] || 'bg-gray-500/20 text-gray-400',
        )}
      >
        {typeIcons[transaction.type] || '💳'}
      </div>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold line-clamp-1">
          {getTransactionTypeLabel(transaction.type)}
        </p>
        {transaction.description && (
          <p className="text-gray-500 text-xs line-clamp-1">{transaction.description}</p>
        )}
        <p className="text-gray-600 text-[10px] mt-0.5">
          {formatDateTime(transaction.createdAt)}
        </p>
      </div>

      {/* Amount */}
      <div className="flex-shrink-0 text-right">
        <p
          className={clsx(
            'font-bold text-sm',
            isCredit ? 'text-green-400' : 'text-red-400',
          )}
        >
          {isCredit ? '+' : '-'}${Math.abs(amount).toFixed(2)}
        </p>
        <p className="text-gray-600 text-[10px]">
          → ${parseFloat(String(transaction.balanceAfter)).toFixed(2)}
        </p>
      </div>
    </div>
  );
}

function TransactionSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-3 bg-cinema-panel rounded-xl p-3 border border-cinema-border">
          <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-2/3 rounded" />
            <Skeleton className="h-3 w-1/3 rounded" />
          </div>
          <Skeleton className="w-14 h-4 rounded flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { purchasesService, watchProgressService } from '@/services/wallet.service';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { posterUrl, formatDate, getProgressPercent } from '@/utils/helpers';
import type { Purchase, WatchProgress } from '@/types';
import { clsx } from 'clsx';

type Tab = 'purchased' | 'history';

export function LibraryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('purchased');
  const navigate = useNavigate();

  const { data: purchases, isLoading: loadingPurchases } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => purchasesService.getPurchases(1, 50).then((r: { data: { items: Purchase[] } }) => r.data.items),
  });

  const { data: continueWatching, isLoading: loadingHistory } = useQuery({
    queryKey: ['continue-watching'],
    queryFn: () => watchProgressService.getContinueWatching().then((r: { data: WatchProgress[] }) => r.data),
  });

  return (
    <div className="bg-cinema-bg min-h-screen animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-cinema-border px-4 py-3">
        <h1 className="text-white font-bold text-lg">📚 បណ្ណាល័យរបស់ខ្ញុំ</h1>

        {/* Tabs */}
        <div className="flex gap-0 mt-3 bg-cinema-card rounded-xl p-1">
          <TabButton
            active={activeTab === 'purchased'}
            onClick={() => setActiveTab('purchased')}
          >
            🎬 រឿងបានទិញ
          </TabButton>
          <TabButton
            active={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
          >
            ▶️ ប្រវត្តិមើល
          </TabButton>
        </div>
      </header>

      <div className="p-4">
        {/* ─── Purchased Movies Tab ─── */}
        {activeTab === 'purchased' && (
          <>
            {loadingPurchases ? (
              <PurchasesSkeleton />
            ) : !purchases?.length ? (
              <EmptyState
                icon="🎬"
                title="មិនទាន់មានរឿងទេ"
                description="ទិញរឿងដើម្បីចូលទៅកាន់បណ្ណាល័យរបស់អ្នក"
                actionLabel="រុករករឿង"
                onAction={() => navigate('/')}
              />
            ) : (
              <div className="space-y-3">
                <p className="text-gray-400 text-xs mb-2">
                  រឿងបានទិញ {purchases.length} ភាពយន្ត
                </p>
                {purchases.map((purchase) => (
                  <PurchaseCard
                    key={purchase.id}
                    purchase={purchase}
                    onPress={() => purchase.movie && navigate(`/movie/${purchase.movie.id}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── Watch History Tab ─── */}
        {activeTab === 'history' && (
          <>
            {loadingHistory ? (
              <HistorySkeleton />
            ) : !continueWatching?.length ? (
              <EmptyState
                icon="▶️"
                title="មិនទាន់មានប្រវត្តិទេ"
                description="ចាប់ផ្តើមមើលរឿងដើម្បីរក្សាប្រវត្តិ"
                actionLabel="រុករករឿង"
                onAction={() => navigate('/')}
              />
            ) : (
              <div className="space-y-3">
                <p className="text-gray-400 text-xs mb-2">
                  កំពុងមើល {continueWatching.length} ភាគ
                </p>
                {continueWatching.map((progress) => (
                  <HistoryCard
                    key={progress.id}
                    progress={progress}
                    onPress={() =>
                      navigate(`/movie/${progress.movieId}/watch/${progress.episodeId}`)
                    }
                    onMoviePress={() => navigate(`/movie/${progress.movieId}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200',
        active
          ? 'bg-gold text-black shadow-sm'
          : 'text-gray-400 hover:text-gray-300',
      )}
    >
      {children}
    </button>
  );
}

function PurchaseCard({
  purchase,
  onPress,
}: {
  purchase: Purchase;
  onPress: () => void;
}) {
  return (
    <div
      onClick={onPress}
      className="flex gap-3 bg-cinema-panel rounded-2xl p-3 border border-cinema-border active:scale-[0.98] transition-transform cursor-pointer"
    >
      {/* Poster */}
      <div className="w-16 h-22 rounded-xl overflow-hidden bg-cinema-card flex-shrink-0">
        <img
          src={posterUrl(purchase.movie?.posterUrl)}
          alt={purchase.movie?.titleKh || purchase.movie?.title}
          className="w-full h-full object-cover"
          style={{ height: '88px' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-poster.svg';
          }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 py-0.5">
        <h3 className="text-white font-semibold text-sm line-clamp-2 leading-snug">
          {purchase.movie?.titleKh || purchase.movie?.title || 'រឿងដែលបានលុប'}
        </h3>
        {purchase.movie?.totalEpisodes && (
          <p className="text-gray-400 text-xs mt-1">
            {purchase.movie.totalEpisodes > 1
              ? `${purchase.movie.totalEpisodes} ភាគ`
              : 'ភាពយន្ត'}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] bg-green-500/20 text-green-400 rounded-full px-2 py-0.5 font-medium">
            ✅ បានទិញ
          </span>
          <span className="text-gray-500 text-[10px]">
            {formatDate(purchase.createdAt)}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <div className="flex items-center flex-shrink-0">
        <span className="text-gray-600 text-sm">›</span>
      </div>
    </div>
  );
}

function HistoryCard({
  progress,
  onPress,
  onMoviePress,
}: {
  progress: WatchProgress;
  onPress: () => void;
  onMoviePress: () => void;
}) {
  const percent = getProgressPercent(progress.position, progress.duration);

  return (
    <div className="bg-cinema-panel rounded-2xl border border-cinema-border overflow-hidden">
      {/* Thumbnail row */}
      <div
        className="relative h-28 cursor-pointer active:scale-[0.98] transition-transform"
        onClick={onPress}
      >
        <img
          src={posterUrl(progress.episode?.thumbnailUrl || progress.movie?.posterUrl)}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-poster.svg';
          }}
        />
        <div className="absolute inset-0 bg-black/40" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-gold/90 flex items-center justify-center shadow-lg">
            <span className="text-black text-xl ml-0.5">▶</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
          <div
            className={clsx(
              'h-full transition-all',
              progress.completed ? 'bg-green-400' : 'bg-gold',
            )}
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Completed badge */}
        {progress.completed && (
          <div className="absolute top-2 right-2 bg-green-500/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
            ✅ មើលរួច
          </div>
        )}

        {/* Progress label */}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-full">
          {percent}%
        </div>
      </div>

      {/* Info row */}
      <div
        className="px-3 py-2.5 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
        onClick={onMoviePress}
      >
        <div className="min-w-0 flex-1">
          <p className="text-white text-sm font-semibold line-clamp-1">
            {progress.movie?.titleKh || progress.movie?.title}
          </p>
          <p className="text-gray-400 text-xs mt-0.5">
            ភាគ {progress.episode?.episodeNumber}
            {progress.episode?.titleKh ? ` — ${progress.episode.titleKh}` : ''}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPress();
          }}
          className="flex-shrink-0 ml-3 bg-gold/10 border border-gold/30 text-gold text-xs font-semibold rounded-full px-3 py-1.5 active:scale-95 transition-transform"
        >
          បន្ត
        </button>
      </div>
    </div>
  );
}

function PurchasesSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex gap-3 bg-cinema-panel rounded-2xl p-3 border border-cinema-border">
          <Skeleton className="w-16 rounded-xl flex-shrink-0" style={{ height: 88 }} />
          <div className="flex-1 space-y-2 py-1">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/3 rounded" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-cinema-panel rounded-2xl border border-cinema-border overflow-hidden">
          <Skeleton className="h-28 w-full" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-2/3 rounded" />
            <Skeleton className="h-3 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

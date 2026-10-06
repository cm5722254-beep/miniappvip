import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moviesService } from '@/services/movies.service';
import { purchasesService } from '@/services/wallet.service';
import { useAuthStore } from '@/store/auth.store';
import { useTelegram } from '@/hooks/useTelegram';
import { formatPrice, formatDuration, posterUrl } from '@/utils/helpers';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import type { Episode } from '@/types';
import { clsx } from 'clsx';

export function MoviePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const updateBalance = useAuthStore((s) => s.updateBalance);
  const { haptic } = useTelegram();
  const [purchaseError, setPurchaseError] = useState('');
  const [purchaseSuccess, setPurchaseSuccess] = useState('');

  const { data: movie, isLoading: loadingMovie } = useQuery({
    queryKey: ['movie', id],
    queryFn: () => moviesService.getMovie(id!).then((r) => r.data),
    enabled: !!id,
  });

  const { data: episodes, isLoading: loadingEpisodes } = useQuery({
    queryKey: ['episodes', id],
    queryFn: () => moviesService.getEpisodes(id!).then((r) => r.data),
    enabled: !!id,
  });

  const purchaseMutation = useMutation({
    mutationFn: () => purchasesService.purchaseMovie(id!),
    onSuccess: (res) => {
      haptic.success();
      setPurchaseSuccess(res.data.message || 'ការទិញបានជោគជ័យ!');
      setPurchaseError('');
      // Refresh movie (isPurchased flag) + user balance
      queryClient.invalidateQueries({ queryKey: ['movie', id] });
      queryClient.invalidateQueries({ queryKey: ['episodes', id] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      // Optimistically update displayed balance
      if (movie && user) {
        const newBalance = parseFloat(String(user.balance)) - parseFloat(String(movie.price));
        updateBalance(Math.max(0, newBalance).toFixed(2));
      }
    },
    onError: (err: Error) => {
      haptic.error();
      setPurchaseError(err.message || 'ការទិញបានបរាជ័យ');
      setPurchaseSuccess('');
    },
  });

  const handleWatch = (episode: Episode) => {
    if (episode.isLocked) {
      setPurchaseError('សូមទិញរឿងជាមុនសិន');
      return;
    }
    haptic.light();
    navigate(`/movie/${id}/watch/${episode.id}`);
  };

  const handlePurchase = () => {
    if (!user) return;
    haptic.medium();
    setPurchaseError('');
    setPurchaseSuccess('');
    purchaseMutation.mutate();
  };

  if (loadingMovie) return <MovieDetailSkeleton />;
  if (!movie) return null;

  const canWatch = movie.isFree || movie.isPurchased;
  const firstEpisode = episodes?.[0];

  return (
    <div className="bg-cinema-bg min-h-screen animate-fade-in">
      {/* ─── Hero Banner ─── */}
      <div className="relative">
        <div className="relative h-72 overflow-hidden">
          <img
            src={posterUrl(movie.bannerUrl || movie.posterUrl)}
            alt={movie.titleKh || movie.title}
            className="w-full h-full object-cover"
          />
          <div className="hero-gradient absolute inset-0" />
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 rounded-full glass-panel border border-white/20 flex items-center justify-center active:scale-95 transition-transform"
        >
          <span className="text-white text-base">←</span>
        </button>

        {/* Poster overlay */}
        <div className="absolute bottom-4 left-4 flex gap-4 items-end">
          <img
            src={posterUrl(movie.posterUrl)}
            alt={movie.titleKh || movie.title}
            className="w-20 h-28 rounded-xl object-cover border-2 border-gold/30 shadow-2xl"
          />
          <div className="flex-1 pb-1">
            <h1 className="text-white font-bold text-xl leading-tight">
              {movie.titleKh || movie.title}
            </h1>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {movie.year && <Badge label={String(movie.year)} variant="gray" size="xs" />}
              <Badge label={movie.category.nameKh} variant="gold" size="xs" />
              {movie.isNew && <Badge label="ថ្មី" variant="red" size="xs" />}
              {movie.isPopular && <Badge label="🔥" variant="gold" size="xs" />}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="px-4 pt-3 pb-6">

        {/* Stats row */}
        <div className="flex gap-4 text-sm mb-4">
          {movie.rating && (
            <div className="flex items-center gap-1">
              <span className="text-yellow-400">⭐</span>
              <span className="text-white font-semibold">{movie.rating}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="text-gray-400">📺</span>
            <span className="text-gray-300">
              {movie.totalEpisodes > 1 ? `${movie.totalEpisodes} ភាគ` : 'ភាពយន្ត'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">👁</span>
            <span className="text-gray-300">{movie.viewCount.toLocaleString()}</span>
          </div>
        </div>

        {/* Description */}
        {(movie.descriptionKh || movie.description) && (
          <p className="text-gray-300 text-sm leading-relaxed mb-5">
            {movie.descriptionKh || movie.description}
          </p>
        )}

        {/* Error/Success messages */}
        {purchaseError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
            <p className="text-red-400 text-sm text-center">{purchaseError}</p>
          </div>
        )}
        {purchaseSuccess && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-4">
            <p className="text-green-400 text-sm text-center">✅ {purchaseSuccess}</p>
          </div>
        )}

        {/* ─── CTA Buttons ─── */}
        <div className="flex gap-3 mb-6">
          {canWatch && firstEpisode ? (
            <button
              onClick={() => handleWatch(firstEpisode)}
              className="flex-1 btn-gold text-center py-3.5 rounded-xl font-bold text-base"
            >
              ▶️ មើលឥឡូវនេះ
            </button>
          ) : (
            <button
              onClick={handlePurchase}
              disabled={purchaseMutation.isPending}
              className={clsx(
                'flex-1 bg-gold text-black font-bold rounded-xl py-3.5 text-base active:scale-95 transition-transform',
                purchaseMutation.isPending && 'opacity-70',
              )}
            >
              {purchaseMutation.isPending
                ? 'កំពុងទិញ...'
                : `💰 ទិញរឿង ${formatPrice(movie.price)}`}
            </button>
          )}
        </div>

        {/* Balance info for non-purchased */}
        {!canWatch && user && (
          <div className="bg-cinema-panel rounded-xl p-3 mb-5 border border-cinema-border">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">សមតុល្យរបស់អ្នក</span>
              <span className="text-gold font-semibold">{formatPrice(user.balance)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">តម្លៃរឿង</span>
              <span className="text-white font-semibold">{formatPrice(movie.price)}</span>
            </div>
            {parseFloat(String(user.balance)) < parseFloat(String(movie.price)) && (
              <button
                onClick={() => navigate('/wallet/deposit')}
                className="w-full mt-3 bg-cinema-card border border-gold/40 text-gold text-sm font-semibold rounded-xl py-2.5 active:scale-95 transition-transform"
              >
                ➕ ដាក់ប្រាក់
              </button>
            )}
          </div>
        )}

        {/* ─── Episode List ─── */}
        <div>
          <h2 className="text-white font-bold text-base mb-3">📺 បញ្ជីភាគ</h2>
          {loadingEpisodes ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 skeleton rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {episodes?.map((ep) => (
                <EpisodeRow
                  key={ep.id}
                  episode={ep}
                  onTap={() => handleWatch(ep)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EpisodeRow({ episode, onTap }: { episode: Episode; onTap: () => void }) {
  return (
    <div
      onClick={onTap}
      className={clsx(
        'flex items-center gap-3 bg-cinema-panel rounded-xl p-3 border border-cinema-border active:scale-[0.98] transition-transform cursor-pointer',
        episode.isLocked && 'opacity-70',
      )}
    >
      {/* Thumbnail */}
      <div className="w-20 h-12 rounded-lg overflow-hidden bg-cinema-card flex-shrink-0">
        {episode.thumbnailUrl ? (
          <img src={episode.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl">{episode.isLocked ? '🔒' : '▶'}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold">
          ភាគ {episode.episodeNumber}{episode.titleKh ? ` — ${episode.titleKh}` : episode.title ? ` — ${episode.title}` : ''}
        </p>
        {episode.duration && (
          <p className="text-gray-400 text-xs mt-0.5">{formatDuration(episode.duration)}</p>
        )}
      </div>

      {/* Lock / price */}
      <div className="flex-shrink-0">
        {episode.isLocked ? (
          <span className="text-gold text-xs font-semibold">{formatPrice(episode.price)}</span>
        ) : (
          <span className="text-green-400 text-lg">▶</span>
        )}
      </div>
    </div>
  );
}

function MovieDetailSkeleton() {
  return (
    <div className="bg-cinema-bg min-h-screen">
      <div className="h-72 skeleton" />
      <div className="p-4 space-y-4">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

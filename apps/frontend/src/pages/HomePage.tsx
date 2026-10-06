import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { moviesService, categoriesService } from '@/services/movies.service';
import { watchProgressService } from '@/services/wallet.service';
import { MovieCard } from '@/components/movie/MovieCard';
import { MovieCardSkeleton } from '@/components/ui/Skeleton';
import { formatBalance } from '@/utils/helpers';
import type { Movie, Category, WatchProgress } from '@/types';

export function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: featured, isLoading: loadingFeatured } = useQuery({
    queryKey: ['movies', 'featured'],
    queryFn: () => moviesService.getFeatured().then((r) => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesService.getCategories().then((r) => r.data),
  });

  const { data: continueWatching } = useQuery({
    queryKey: ['continue-watching'],
    queryFn: () => watchProgressService.getContinueWatching().then((r: { data: WatchProgress[] }) => r.data),
  });

  return (
    <div className="bg-cinema-bg min-h-screen animate-fade-in">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-40 glass-panel border-b border-cinema-border px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center">
              <span className="text-lg">👑</span>
            </div>
            <div>
              <h1 className="text-gold font-bold text-base leading-none">អាធិរាជរឿង</h1>
              <p className="text-gray-500 text-[9px]">រឿងល្អៗ នៅជិតអ្នកជានិច្ច</p>
            </div>
          </div>

          {/* Right: balance + search */}
          <div className="flex items-center gap-3">
            {user && (
              <button
                onClick={() => navigate('/wallet')}
                className="flex items-center gap-1.5 bg-gold/10 border border-gold/30 rounded-full px-3 py-1.5 active:scale-95 transition-transform"
              >
                <span className="text-xs">💰</span>
                <span className="text-gold font-bold text-xs">
                  {formatBalance(user.balance)}
                </span>
              </button>
            )}
            <button
              onClick={() => navigate('/search')}
              className="w-9 h-9 rounded-full bg-cinema-panel border border-cinema-border flex items-center justify-center active:scale-95 transition-transform"
            >
              <span className="text-sm">🔍</span>
            </button>
          </div>
        </div>
      </header>

      <div className="pb-4">
        {/* ─── User greeting ─── */}
        {user && (
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-3 bg-cinema-panel rounded-2xl p-3 border border-cinema-border">
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.firstName}
                  className="w-11 h-11 rounded-full object-cover border-2 border-gold/40"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gold/20 border-2 border-gold/40 flex items-center justify-center">
                  <span className="text-xl">👤</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">
                  {user.firstName} {user.lastName ?? ''}
                </p>
                {user.username && (
                  <p className="text-gray-500 text-xs">@{user.username}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-[10px]">សមតុល្យ</p>
                <p className="text-gold font-bold text-sm">{formatBalance(user.balance)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Continue Watching ─── */}
        {continueWatching && continueWatching.length > 0 && (
          <Section title="▶️ បន្តមើល">
            <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">
              {continueWatching.map((progress) => (
                <div
                  key={progress.id}
                  className="flex-shrink-0 w-52 snap-start cursor-pointer active:scale-95 transition-transform"
                  onClick={() => navigate(`/movie/${progress.movieId}/watch/${progress.episodeId}`)}
                >
                  <div className="relative rounded-xl overflow-hidden bg-cinema-card h-28">
                    <img
                      src={progress.episode?.thumbnailUrl || '/placeholder-poster.svg'}
                      alt={progress.episode?.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-gold/90 flex items-center justify-center">
                        <span className="text-black text-lg ml-0.5">▶</span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                      <div
                        className="h-full bg-gold"
                        style={{
                          width: `${Math.min(100, (progress.position / (progress.duration || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-1.5">
                    <p className="text-white text-xs font-semibold line-clamp-1">
                      {progress.movie?.titleKh || progress.movie?.title}
                    </p>
                    <p className="text-gray-400 text-[10px]">
                      ភាគ {progress.episode?.episodeNumber}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ─── Popular ─── */}
        <Section title="🔥 កំពុងពេញនិយម">
          {loadingFeatured ? (
            <div className="flex gap-3 px-4 overflow-x-auto">
              {[...Array(4)].map((_, i) => <MovieCardSkeleton key={i} />)}
            </div>
          ) : (
            <HorizontalMovieList movies={featured?.popular ?? []} />
          )}
        </Section>

        {/* ─── New ─── */}
        <Section title="🆕 រឿងថ្មី">
          {loadingFeatured ? (
            <div className="flex gap-3 px-4 overflow-x-auto">
              {[...Array(4)].map((_, i) => <MovieCardSkeleton key={i} />)}
            </div>
          ) : (
            <HorizontalMovieList movies={featured?.newMovies ?? []} />
          )}
        </Section>

        {/* ─── Featured ─── */}
        {(featured?.featured?.length ?? 0) > 0 && (
          <Section title="⭐ រឿងណែនាំ">
            <HorizontalMovieList movies={featured?.featured ?? []} />
          </Section>
        )}

        {/* ─── Categories ─── */}
        {categories && categories.length > 0 && (
          <Section title="📂 ប្រភេទរឿង">
            <div className="flex gap-2 overflow-x-auto px-4 pb-2 snap-x">
              {categories.map((cat) => (
                <CategoryChip key={cat.id} category={cat} />
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h2 className="text-white font-bold text-base px-4 mb-3">{title}</h2>
      {children}
    </div>
  );
}

function HorizontalMovieList({ movies }: { movies: Movie[] }) {
  if (!movies.length) return null;
  return (
    <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">
      {movies.map((m) => (
        <div key={m.id} className="snap-start">
          <MovieCard movie={m} size="md" />
        </div>
      ))}
    </div>
  );
}

function CategoryChip({ category }: { category: Category }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/category/${category.slug}`)}
      className="flex-shrink-0 snap-start bg-cinema-panel border border-cinema-border rounded-full px-4 py-2 active:scale-95 transition-transform"
    >
      <span className="text-white text-xs font-medium whitespace-nowrap">{category.nameKh}</span>
    </button>
  );
}

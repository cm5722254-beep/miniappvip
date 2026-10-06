import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { categoriesService } from '@/services/movies.service';
import { MovieGridCard } from '@/components/movie/MovieCard';
import { MovieGridSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Movie } from '@/types';

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ['category-movies', slug],
      queryFn: ({ pageParam = 1 }) =>
        categoriesService
          .getMoviesByCategory(slug!, pageParam as number, 18)
          .then((r) => r.data),
      getNextPageParam: (last) =>
        last.page < last.totalPages ? last.page + 1 : undefined,
      initialPageParam: 1,
      enabled: !!slug,
    });

  const category = data?.pages[0]?.category;
  const movies: Movie[] = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <div className="bg-cinema-bg min-h-screen animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-cinema-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full bg-cinema-panel border border-cinema-border flex items-center justify-center active:scale-95 transition-transform flex-shrink-0"
        >
          <span className="text-white">←</span>
        </button>
        <div className="min-w-0">
          <h1 className="text-white font-bold text-base leading-tight truncate">
            📂 {isLoading ? '...' : (category?.nameKh || category?.name || slug)}
          </h1>
          {!isLoading && total > 0 && (
            <p className="text-gray-500 text-xs">រឿងសរុប {total}</p>
          )}
        </div>
      </header>

      <div className="p-4">
        {/* Loading */}
        {isLoading && <MovieGridSkeleton count={9} />}

        {/* Results */}
        {!isLoading && movies.length === 0 && (
          <EmptyState
            icon="📂"
            title="មិនមានរឿងទេ"
            description="ប្រភេទនេះមិនទាន់មានរឿងឡើយ"
            actionLabel="ទំព័រដើម"
            onAction={() => navigate('/')}
          />
        )}

        {movies.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {movies.map((movie) => (
                <MovieGridCard key={movie.id} movie={movie} />
              ))}
            </div>

            {/* Load more */}
            {hasNextPage && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="bg-cinema-panel border border-cinema-border text-white text-sm font-semibold rounded-xl px-8 py-3 active:scale-95 transition-transform disabled:opacity-50"
                >
                  {isFetchingNextPage ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                      កំពុងផ្ទុក...
                    </span>
                  ) : (
                    '+ ផ្ទុកបន្ថែម'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

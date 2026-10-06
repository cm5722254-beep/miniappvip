import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchService } from '@/services/movies.service';
import { MovieGridCard } from '@/components/movie/MovieCard';
import { MovieGridSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { debounce } from '@/utils/helpers';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const navigate = useNavigate();

  const debouncedSearch = useCallback(
    debounce((q: string) => setActiveQuery(q), 400),
    [],
  );

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', activeQuery],
    queryFn: () => searchService.search(activeQuery).then((r: { data: { items: object[]; total: number } }) => r.data),
    enabled: activeQuery.length >= 2,
  });

  const { data: popular } = useQuery({
    queryKey: ['search', 'popular'],
    queryFn: () => searchService.getPopular().then((r: { data: object[] }) => r.data),
    enabled: activeQuery.length < 2,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    debouncedSearch(e.target.value);
  };

  return (
    <div className="bg-cinema-bg min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-cinema-border px-4 pt-4 pb-3">
        <h1 className="text-white font-bold text-lg mb-3">🔍 ស្វែងរករឿង</h1>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="search"
            value={query}
            onChange={handleChange}
            placeholder="ស្វែងរករឿង, តារា, ប្រភេទ..."
            className="w-full bg-cinema-panel border border-cinema-border rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gold/50 transition-colors"
            autoFocus
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setActiveQuery(''); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      <div className="p-4">
        {/* Loading */}
        {isLoading && <MovieGridSkeleton count={6} />}

        {/* Results */}
        {!isLoading && activeQuery.length >= 2 && results && (
          <>
            {(results.items as object[]).length > 0 ? (
              <>
                <p className="text-gray-400 text-xs mb-3">
                  រកឃើញ {results.total} លទ្ធផល
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {(results.items as Parameters<typeof MovieGridCard>[0]['movie'][]).map((movie) => (
                    <MovieGridCard key={movie.id} movie={movie} />
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                icon="🔍"
                title="រកមិនឃើញ"
                description={`មិនមានរឿងសម្រាប់ "${activeQuery}" ទេ`}
                actionLabel="ត្រលប់ទៅទំព័រដើម"
                onAction={() => navigate('/')}
              />
            )}
          </>
        )}

        {/* Popular (when no query) */}
        {activeQuery.length < 2 && popular && (
          <>
            <h2 className="text-white font-bold text-base mb-3">🔥 ពេញនិយម</h2>
            <div className="grid grid-cols-3 gap-3">
              {(popular as Parameters<typeof MovieGridCard>[0]['movie'][]).map((movie) => (
                <MovieGridCard key={movie.id} movie={movie} />
              ))}
            </div>
          </>
        )}

        {/* Empty prompt */}
        {activeQuery.length === 1 && (
          <p className="text-gray-500 text-sm text-center py-8">
            សូមបញ្ចូលយ៉ាងហោចណាស់ ២ អក្សរ
          </p>
        )}
      </div>
    </div>
  );
}

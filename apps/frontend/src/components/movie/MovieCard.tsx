import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import type { Movie } from '@/types';
import { formatPrice, posterUrl } from '@/utils/helpers';
import { Badge } from '@/components/ui/Badge';

interface MovieCardProps {
  movie: Movie;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MovieCard({ movie, size = 'md', className }: MovieCardProps) {
  const navigate = useNavigate();

  const widths = { sm: 'w-28', md: 'w-36', lg: 'w-44' };
  const heights = { sm: 'h-40', md: 'h-52', lg: 'h-64' };

  return (
    <div
      className={clsx('flex-shrink-0 cursor-pointer active:scale-95 transition-transform duration-100', widths[size], className)}
      onClick={() => navigate(`/movie/${movie.id}`)}
    >
      {/* Poster */}
      <div className={clsx('relative rounded-xl overflow-hidden bg-cinema-card', heights[size])}>
        <img
          src={posterUrl(movie.posterUrl)}
          alt={movie.titleKh || movie.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-poster.svg';
          }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {movie.isNew && <Badge label="ថ្មី" variant="red" size="xs" />}
          {movie.isPopular && <Badge label="🔥ពេញនិយម" variant="gold" size="xs" />}
        </div>

        {/* Price bottom */}
        <div className="absolute bottom-2 left-2 right-2">
          <span className={clsx(
            'text-xs font-bold px-2 py-0.5 rounded-full',
            movie.isFree ? 'bg-green-500/90 text-white' : 'bg-gold/90 text-black'
          )}>
            {movie.isFree ? 'ឥតគិតថ្លៃ' : formatPrice(movie.price)}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="mt-2 px-0.5">
        <p className="text-white text-xs font-semibold leading-tight line-clamp-2">
          {movie.titleKh || movie.title}
        </p>
        <p className="text-gray-400 text-[10px] mt-0.5">
          {movie.totalEpisodes > 1 ? `${movie.totalEpisodes} ភាគ` : 'ភាពយន្ត'}
          {movie.year ? ` • ${movie.year}` : ''}
        </p>
      </div>
    </div>
  );
}

/* Grid card variant (2 columns) */
export function MovieGridCard({ movie }: { movie: Movie }) {
  const navigate = useNavigate();

  return (
    <div
      className="cursor-pointer active:scale-95 transition-transform duration-100"
      onClick={() => navigate(`/movie/${movie.id}`)}
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-cinema-card">
        <img
          src={posterUrl(movie.posterUrl)}
          alt={movie.titleKh || movie.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-poster.svg'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        <div className="absolute top-1.5 left-1.5 flex gap-1">
          {movie.isNew && <Badge label="ថ្មី" variant="red" size="xs" />}
          {movie.isPopular && <Badge label="🔥" variant="gold" size="xs" />}
        </div>

        <div className="absolute bottom-2 left-2 right-2">
          <span className={clsx(
            'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
            movie.isFree ? 'bg-green-500/90 text-white' : 'bg-gold/90 text-black'
          )}>
            {movie.isFree ? 'ឥតគិតថ្លៃ' : formatPrice(movie.price)}
          </span>
        </div>
      </div>

      <div className="mt-1.5 px-0.5">
        <p className="text-white text-xs font-semibold leading-tight line-clamp-2">
          {movie.titleKh || movie.title}
        </p>
        <p className="text-gray-400 text-[10px] mt-0.5">
          {movie.category?.nameKh || movie.category?.name}
        </p>
      </div>
    </div>
  );
}

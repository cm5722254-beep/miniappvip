import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  rows?: number;
}

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={clsx('skeleton rounded-lg', className)}
      style={style}
    />
  );
}

export function MovieCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-32">
      <Skeleton className="w-32 h-44 rounded-xl mb-2" />
      <Skeleton className="w-24 h-3 mb-1" />
      <Skeleton className="w-16 h-3" />
    </div>
  );
}

export function MovieGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-3 px-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <Skeleton className="w-full aspect-[2/3] rounded-xl mb-2" />
          <Skeleton className="w-full h-3 mb-1" />
          <Skeleton className="w-2/3 h-3" />
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4">
      <Skeleton className="w-12 h-12 rounded-full" />
      <div className="flex-1">
        <Skeleton className="w-32 h-4 mb-2" />
        <Skeleton className="w-20 h-3" />
      </div>
    </div>
  );
}

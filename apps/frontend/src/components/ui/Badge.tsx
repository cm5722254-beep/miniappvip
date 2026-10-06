import { clsx } from 'clsx';

interface BadgeProps {
  label: string;
  variant?: 'gold' | 'red' | 'green' | 'blue' | 'gray';
  size?: 'sm' | 'xs';
}

export function Badge({ label, variant = 'gray', size = 'sm' }: BadgeProps) {
  return (
    <span
      className={clsx(
        'rounded-full font-semibold inline-block',
        size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
        {
          'bg-gold text-black': variant === 'gold',
          'bg-red-500 text-white': variant === 'red',
          'bg-green-500 text-white': variant === 'green',
          'bg-blue-500 text-white': variant === 'blue',
          'bg-gray-700 text-gray-300': variant === 'gray',
        },
      )}
    >
      {label}
    </span>
  );
}

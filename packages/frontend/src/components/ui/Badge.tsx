import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'maroon';

const toneClasses: Record<Tone, string> = {
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger:  'bg-red-50 text-red-700 border-red-200',
  info:    'bg-blue-50 text-blue-700 border-blue-200',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
  maroon:  'bg-maroon/10 text-maroon border-maroon/20',
};

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}

export function Badge({ children, tone = 'neutral', className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize',
        toneClasses[tone],
        className
      )}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full',
          tone === 'success' ? 'bg-green-600' :
          tone === 'warning' ? 'bg-amber-600' :
          tone === 'danger'  ? 'bg-red-600' :
          tone === 'info'    ? 'bg-blue-600' :
          tone === 'maroon'  ? 'bg-maroon' :
          'bg-gray-500'
        )} />
      )}
      {children}
    </span>
  );
}

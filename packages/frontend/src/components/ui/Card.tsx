import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  style?: React.CSSProperties;
}

export function Card({ children, className, hover, style }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border p-4 sm:p-5 transition-all duration-200 backdrop-blur-md',
        hover && 'cursor-pointer hover:border-maroon hover:shadow-md hover:-translate-y-0.5',
        className
      )}
      style={{
        background: 'var(--card-glass, rgba(255, 255, 255, 0.7))',
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string | null | undefined;
  icon: React.ElementType;
  loading?: boolean;
  color?: string;
  href?: string;
  trend?: { value: number; label: string };
}

export function StatCard({ label, value, icon: Icon, loading, color = 'bg-maroon/10 text-maroon', trend }: StatCardProps) {
  return (
    <Card hover className="flex items-center gap-4">
      <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', color)}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        {loading ? (
          <>
            <div className="skeleton h-7 w-16 mb-1" />
            <div className="skeleton h-3.5 w-24" />
          </>
        ) : (
          <>
            <p className="stat-value text-2xl font-extrabold tracking-tight text-foreground">{value ?? 0}</p>
            <p className="text-sm text-text-secondary truncate">{label}</p>
            {trend && (
              <p className={cn('text-xs font-medium mt-0.5', trend.value >= 0 ? 'text-success' : 'text-danger')}>
                {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

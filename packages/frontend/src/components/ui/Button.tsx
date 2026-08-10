import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning' | 'success';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-maroon text-white hover:bg-maroon-dark active:bg-maroon-dark shadow-sm hover:shadow-md',
  secondary: 'bg-card text-foreground border border-border hover:border-maroon hover:text-maroon shadow-sm',
  ghost:     'bg-transparent text-foreground hover:bg-card-2',
  danger:    'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  warning:   'bg-amber-500 text-white hover:bg-amber-600 shadow-sm',
  success:   'bg-green-600 text-white hover:bg-green-700 shadow-sm',
};

const sizeClasses: Record<Size, string> = {
  xs: 'px-2.5 py-1 text-xs rounded-lg',
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-5 py-2.5 text-base rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, icon, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed select-none',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : icon
        }
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, forwardRef, ReactNode, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Base input wrapper ── */
interface FieldWrapProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

function FieldWrap({ label, error, hint, required, children }: FieldWrapProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

/* ── Text Input ── */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, required, type, ...props }, ref) => {
    const [reveal, setReveal] = useState(false);
    // Password fields get a built-in show/hide toggle, unless the caller supplied
    // its own rightIcon (e.g. the admin user form already renders one).
    const isPassword = type === 'password';
    const showToggle = isPassword && !rightIcon;
    const effectiveType = isPassword && reveal ? 'text' : type;
    const hasRightSlot = Boolean(rightIcon) || showToggle;

    return (
      <FieldWrap label={label} error={error} hint={hint} required={required}>
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            type={effectiveType}
            required={required}
            className={cn(
              'w-full rounded-xl border bg-card-2 px-3 py-2.5 text-sm text-foreground placeholder:text-text-muted',
              'transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon',
              error ? 'border-danger focus:ring-danger/20' : 'border-border',
              leftIcon && 'pl-9',
              hasRightSlot && 'pr-9',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
              {rightIcon}
            </span>
          )}
          {showToggle && (
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground focus:outline-none p-0.5"
              title={reveal ? 'Hide password' : 'Show password'}
              aria-label={reveal ? 'Hide password' : 'Show password'}
            >
              {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
      </FieldWrap>
    );
  }
);
Input.displayName = 'Input';

/* ── Select ── */
interface SelectOption { value: string; label: string; }
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, ...props }, ref) => {
    return (
      <FieldWrap label={label} error={error} hint={hint}>
        <select
          ref={ref}
          className={cn(
            'w-full rounded-xl border bg-card-2 px-3 py-2.5 text-sm text-foreground',
            'transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon',
            error ? 'border-danger' : 'border-border',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </FieldWrap>
    );
  }
);
Select.displayName = 'Select';

/* ── Textarea ── */
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  rows?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, rows = 4, ...props }, ref) => {
    return (
      <FieldWrap label={label} error={error} hint={hint}>
        <textarea
          ref={ref}
          rows={rows}
          className={cn(
            'w-full rounded-xl border bg-card-2 px-3 py-2.5 text-sm text-foreground placeholder:text-text-muted resize-none',
            'transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon',
            error ? 'border-danger' : 'border-border',
            className
          )}
          {...props}
        />
      </FieldWrap>
    );
  }
);
Textarea.displayName = 'Textarea';

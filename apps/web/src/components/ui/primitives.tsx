import React from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'outline' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ViajaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-blue-700 text-white hover:bg-blue-800',
  outline: 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-6 text-sm',
};

export function ViajaButton({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  ...rest
}: ViajaButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {isLoading ? 'Processando...' : children}
    </button>
  );
}

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, id, className, ...props }, ref) => {
    const fieldId = id ?? props.name;
    return (
      <div className="space-y-1.5">
        {label ? (
          <label htmlFor={fieldId} className="block text-xs font-semibold text-slate-700">
            {label}
          </label>
        ) : null}
        <input
          id={fieldId}
          ref={ref}
          className={cn(
            'h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600',
            error ? 'border-red-500' : 'border-slate-200',
            className,
          )}
          {...props}
        />
        {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
      </div>
    );
  },
);
TextField.displayName = 'TextField';

export function SurfaceCard({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-slate-200 bg-white p-6 shadow-sm', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

type PillTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

const toneStyles: Record<PillTone, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-700',
  neutral: 'border-slate-200 bg-slate-100 text-slate-700',
};

export function StatusPill({
  tone = 'info',
  children,
  className,
}: {
  tone?: PillTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function DataStateBox({
  kind,
  title,
  description,
  onAction,
  actionText,
}: {
  kind: 'loading' | 'empty' | 'error';
  title: string;
  description?: string;
  onAction?: () => void;
  actionText?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-8 text-center',
        kind === 'error'
          ? 'border-red-200 bg-red-50 text-red-900'
          : 'border-slate-200 bg-white text-slate-800',
      )}
    >
      <p className="text-base font-bold">{title}</p>
      {description ? <p className="mt-1 text-sm opacity-80">{description}</p> : null}
      {onAction && actionText ? (
        <div className="mt-4">
          <ViajaButton variant="outline" size="sm" onClick={onAction}>
            {actionText}
          </ViajaButton>
        </div>
      ) : null}
    </div>
  );
}

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  header: string;
  accessor: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyFor: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  compact?: boolean;
}

export function Table<T>({
  columns,
  data,
  keyFor,
  loading,
  emptyMessage = 'No data found.',
  emptyIcon,
  compact,
}: TableProps<T>) {
  const cellPad = compact ? 'px-4 py-2' : 'px-4 py-3.5';

  if (loading) {
    return (
      <div className="overflow-x-auto rounded-xl">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.header}
                  className={cn('px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-secondary', col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-border/50">
                {columns.map((col) => (
                  <td key={col.header} className={cn(cellPad, col.className)}>
                    <div className="skeleton h-4 rounded-md" style={{ width: `${60 + (i * 13) % 40}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        {emptyIcon && <div className="mb-3 text-text-muted">{emptyIcon}</div>}
        <p className="text-sm font-medium text-text-secondary">{emptyMessage}</p>
        <p className="mt-1 text-xs text-text-muted">Try adjusting your filters or add a new entry.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.header}
                className={cn(
                  'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-secondary whitespace-nowrap',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={keyFor(row)}
              className="table-row border-b border-border/50 last:border-0"
            >
              {columns.map((col) => (
                <td
                  key={col.header}
                  className={cn(cellPad, 'text-foreground', col.className)}
                >
                  {col.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

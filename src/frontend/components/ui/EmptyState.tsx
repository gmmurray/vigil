import { Link } from 'react-router-dom';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    to: string;
  };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="p-8 text-center font-mono">
      <div className="text-gold-dim text-sm">{title}</div>
      {description && (
        <div className="text-gold-faint text-xs mt-2">{description}</div>
      )}
      {action && (
        <Link
          to={action.to}
          className="inline-block mt-4 text-xs uppercase text-gold-primary hover:text-gold-dim transition-colors"
        >
          &gt; {action.label}
        </Link>
      )}
    </div>
  );
}

export function TableEmptyRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-8 text-center text-gold-dim font-mono">
        {children}
      </td>
    </tr>
  );
}

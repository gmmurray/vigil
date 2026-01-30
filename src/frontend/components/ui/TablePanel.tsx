import type { PropsWithChildren } from 'react';
import { cn } from '../../lib/utils';

type Props = {
  title: string;
  maxHeight?: string;
} & PropsWithChildren;

function TablePanel({ title, children, maxHeight = 'max-h-100' }: Props) {
  return (
    <div className="panel p-0 overflow-hidden">
      <div className="bg-active/50 px-4 py-2 border-b border-gold-faint text-xs uppercase text-gold-dim font-medium">
        {title}
      </div>

      <div className={cn(maxHeight, 'overflow-auto theme-table-scroll')}>
        {children}
      </div>
    </div>
  );
}

export default TablePanel;

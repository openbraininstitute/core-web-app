'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

export interface MenuItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  hint?: string;
  danger?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
  onSelect?: () => void;
}

interface MenuProps {
  items: MenuItem[];
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  align?: 'left' | 'right';
  width?: string;
  className?: string;
}

export function Menu({ items, trigger, align = 'left', width = 'w-56', className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open ? (
        <div
          role="menu"
          className={cn(
            'border-neutral-2 absolute z-50 mt-1.5 overflow-hidden rounded-lg border bg-white py-1 shadow-lift',
            align === 'right' ? 'right-0' : 'left-0',
            width
          )}
        >
          {items.map((item) => (
            <div key={item.key}>
              {item.separatorBefore ? <div className="bg-neutral-2 my-1 h-px" /> : null}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors',
                  'disabled:pointer-events-none disabled:opacity-40',
                  item.danger
                    ? 'text-destructive hover:bg-destructive hover:text-white'
                    : 'text-primary-9 hover:bg-primary-0'
                )}
              >
                {item.icon ? (
                  <span className="flex size-4 items-center justify-center opacity-70">
                    {item.icon}
                  </span>
                ) : null}
                <span className="flex-1 truncate">{item.label}</span>
                {item.hint ? (
                  <span className="text-neutral-3 font-mono text-[10px] tracking-wide">
                    {item.hint}
                  </span>
                ) : null}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

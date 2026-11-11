'use client';

import { RightOutlined } from '@ant-design/icons';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

type AccordionButtonProps = {
  items?: ReactNode[];
  children?: ReactNode;
  defaultOpen?: boolean;
  maxItems?: number;
  onToggle?(open: boolean): void;
  label: ReactNode;
  className?: string;
  contentClassName?: string;
  isActive?: boolean;
};

export default function AccordionButton({
  items,
  children,
  defaultOpen = false,
  maxItems,
  onToggle,
  className,
  contentClassName,
  label,
  isActive = false,
}: AccordionButtonProps) {
  const [open, setOpen] = useState(defaultOpen);
  const btnId = useId();
  const panelId = `${btnId}-panel`;

  // SMOOTH ANIMATION WHEN OPEN
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [inlineHeight, setInlineHeight] = useState<string | number>(open ? 'auto' : 0);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;

    const target = open ? el.scrollHeight : 0;
    if (open) {
      setInlineHeight(target);
      const tid = window.setTimeout(() => setInlineHeight('auto'), 200);
      return () => window.clearTimeout(tid);
    }
    if (inlineHeight === 'auto') {
      setInlineHeight(el.scrollHeight);
      requestAnimationFrame(() => setInlineHeight(0));
    } else {
      setInlineHeight(0);
    }
  }, [open, inlineHeight]);

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      onToggle?.(next);
      return next;
    });
  };

  const rendered =
    children ??
    (Array.isArray(items)
      ? (typeof maxItems === 'number' ? items.slice(0, maxItems) : items).map((it, index) => {
          let key: React.Key = index;
          if (typeof it === 'object' && it !== null && 'key' in it) {
            key = (it as any).key;
          } else if (typeof it === 'string' || typeof it === 'number') {
            key = it;
          }
          return (
            <div key={key} className="py-1">
              {it}
            </div>
          );
        })
      : null);

  return (
    <div className={cn('w-full', className)}>
      <button
        id={btnId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className={cn(
          'group shadow-skm-l h-[60px] w-full rounded-full',
          isActive ? 'bg-primary-9 text-white' : 'bg-white',
          'flex items-center justify-between px-8 text-left',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40'
        )}
      >
        {label}

        <span
          className={cn(
            'ml-auto inline-flex h-6 w-6 items-center justify-center rounded-md',
            'transition-transform duration-200',
            open ? 'rotate-90' : 'rotate-0'
          )}
        >
          <RightOutlined className="text-current" />
        </span>
      </button>

      <div
        id={panelId}
        ref={panelRef}
        style={{ maxHeight: inlineHeight, transition: 'all 200ms ease' }}
        className={cn('overflow-hidden px-8', open ? 'mt-1 py-6' : 'mt-0', contentClassName)}
      >
        <div className="text-primary-9 flex flex-col gap-y-2 px-3 pb-2">{rendered}</div>
      </div>
    </div>
  );
}

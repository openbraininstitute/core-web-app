'use client';

import { RiCloseLine } from '@remixicon/react';
import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/utils/css-class';

interface ModalProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  onClose: () => void;
}

const SIZES = { sm: 'w-100', md: 'w-140', lg: 'w-180' } as const;

export function Modal({
  open,
  title,
  description,
  children,
  footer,
  size = 'sm',
  onClose,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative max-w-[92vw] overflow-hidden rounded-2xl bg-white shadow-2xl',
          SIZES[size]
        )}
      >
        <div className="border-neutral-2 flex items-start justify-between gap-4 border-b px-6 py-4">
          <div>
            <h2 className="text-primary-9 font-title text-lg font-bold">{title}</h2>
            {description ? (
              <p className="text-neutral-4 mt-0.5 text-sm font-light">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-neutral-3 hover:bg-neutral-1 hover:text-primary-9 -mr-2 -mt-1 rounded-md p-1.5 transition-colors"
          >
            <RiCloseLine className="size-4.5" />
          </button>
        </div>

        {children ? (
          <div className="secondary-scrollbar max-h-[70vh] overflow-auto px-6 py-5">{children}</div>
        ) : null}

        {footer ? (
          <div className="border-neutral-2 bg-neutral-1/60 flex justify-end gap-2 border-t px-6 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

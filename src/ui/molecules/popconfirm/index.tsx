'use client';

import { useState } from 'react';

import { Button } from '@/ui/molecules/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { cn } from '@/utils/css-class';

import type { ComponentProps, ReactNode } from 'react';

type PopconfirmProps = {
  title: ReactNode;
  description?: ReactNode;
  okText?: ReactNode;
  cancelText?: ReactNode;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: 'default' | 'destructive';
  children: ReactNode;
  contentClassName?: ComponentProps<'div'>['className'];
};

function Popconfirm({
  title,
  description,
  okText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  children,
  contentClassName,
}: PopconfirmProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const close = () => setOpen(false);

  const handleConfirm = async () => {
    try {
      setPending(true);
      await onConfirm?.();
      close();
    } finally {
      setPending(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    close();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        data-slot="popconfirm-content"
        className={cn('w-72 space-y-3', contentClassName)}
      >
        <div className="space-y-1">
          <div className="text-neutral-5 text-sm font-semibold">{title}</div>
          {description && <div className="text-neutral-4 text-xs">{description}</div>}
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={handleCancel}>
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            size="sm"
            disabled={pending}
            onClick={handleConfirm}
          >
            {okText}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { Popconfirm };

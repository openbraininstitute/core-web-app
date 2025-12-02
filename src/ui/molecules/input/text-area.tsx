import { ComponentProps } from 'react';

import { cn } from '@/utils/css-class';

function Textarea({
  className,
  size = 'default',
  ...props
}: ComponentProps<'textarea'> & {
  size?: 'sm' | 'default' | 'lg' | number;
}) {
  return (
    <span
      data-slot="textarea-control"
      className={cn(
        'border-input bg-background ring-ring/24 has-focus-visible:border-ring has-aria-invalid:border-destructive/36',
        'has-focus-visible:has-aria-invalid:border-destructive/64 has-focus-visible:has-aria-invalid:ring-destructive/16 dark:bg-input/32',
        'dark:has-aria-invalid:ring-destructive/24 relative inline-flex w-full rounded-lg border bg-clip-padding text-base shadow-xs',
        'transition-shadow before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)]',
        'not-has-disabled:has-not-focus-visible:not-has-aria-invalid:before:shadow-[0_1px_--theme(--color-black/4%)] has-focus-visible:ring-[3px]',
        'has-disabled:opacity-64 sm:text-sm dark:bg-clip-border dark:not-has-disabled:has-not-focus-visible:not-has-aria-invalid:before:shadow-[0_-1px_--theme(--color-white/8%)]',
        '[&:has(:disabled,:focus-visible,[aria-invalid])]:shadow-none',
        className
      )}
    >
      <textarea
        data-slot="textarea"
        className={cn(
          'field-sizing-content min-h-17.5 w-full rounded-[inherit] px-[calc(--spacing(3)-1px)] py-[calc(--spacing(1.5)-1px)] outline-none max-sm:min-h-20.5',
          size === 'sm' &&
            'min-h-16.5 px-[calc(--spacing(2.5)-1px)] py-[calc(--spacing(1)-1px)] max-sm:min-h-19.5',
          size === 'lg' && 'min-h-18.5 py-[calc(--spacing(2)-1px)] max-sm:min-h-21.5'
        )}
        {...props}
      />
    </span>
  );
}

export { Textarea };

'use client';

import type { ComponentProps } from 'react';

import { ArrowOpenRight } from '@/components/icons/buttons';
import { Card, CardTitle } from '@/ui/molecules/card';
import { cn } from '@/utils/css-class';

type Props<T> = {
  title: string;
  value: T;
  group?: string;
  active: boolean;
  disabled: boolean;
  onClick: (v: T) => void;
  className?: ComponentProps<'div'>['className'];
};

export function MenuItem<T>({
  group,
  title,
  value,
  disabled,
  active,
  className,
  onClick,
}: Props<T>) {
  return (
    <Card
      className={cn(
        'flex flex-col border-white bg-white px-4 py-2',
        'shadow-[16px_16px_30px_0px_#0000000,-12px_-8px_32px_0px_#FFFFFF52]',
        'h-full cursor-pointer select-none',
        'group hover:bg-primary-9 hover:text-white',
        {
          'pointer-events-none cursor-not-allowed border! border-gray-200 bg-gray-100/50': disabled,
        },
        { 'bg-primary-9 text-white!': active },
        className
      )}
      role="button"
      aria-disabled={disabled}
      onClick={() => onClick(value)}
    >
      <CardTitle
        className={cn(
          'text-primary-9 text-2xl font-bold group-hover:text-white',
          {
            'text-primary-9/50': disabled,
          },
          { 'text-white!': active }
        )}
      >
        {group && (
          <div className="text-neutral-3 mb-1 gap-0 text-base font-light group-hover:text-white">
            {group}
          </div>
        )}
        {title}
      </CardTitle>
      {!disabled && (
        <div
          className={cn(
            'text-neutral-3 group-hover:text-primary-9 flex items-center justify-center gap-1 self-end text-sm',
            'rounded-full px-4 py-1 group-hover:bg-white group-hover:shadow-sm',
            {
              'bg-primary-9! group-hover:border-primary-9/40 border text-white!': active,
            }
          )}
        >
          <span>Start</span>
          <ArrowOpenRight />
        </div>
      )}
    </Card>
  );
}

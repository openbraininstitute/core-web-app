import type { ComponentProps, ReactNode } from 'react';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

type Props = {
  icon?: ReactNode;
  text: string;
  shouldContactSupport?: boolean;
  cls?: {
    container?: ComponentProps<'div'>['className'];
    icon?: ComponentProps<'div'>['className'];
    text?: ComponentProps<'p'>['className'];
    contact?: ComponentProps<'div'>['className'];
  };
};

export function GenericError({ text, icon, shouldContactSupport, cls }: Props) {
  const breakpoint = useDefaultBreakpoint();
  return (
    <div className={cn('flex flex-col items-center justify-center gap-1.5', cls?.container)}>
      <div className={cn('text-warning', breakpoint === 'l' ? 'text-xl' : 'text-3xl', cls?.icon)}>
        {icon}
      </div>
      <p
        className={cn(
          'text-warning max-w-xl text-center',
          breakpoint === 'l' ? 'text-lg' : 'text-2xl',
          cls?.text
        )}
      >
        {text}
      </p>
      {shouldContactSupport && (
        <Button
          rounded
          asChild
          size={breakpoint === 'l' ? 'md' : 'lg'}
          className={cn(
            'text-warning! bg-neutral-1 border-neutral-2 hover:bg-warning/20 hover:text-bold border px-10 py-4! hover:font-black',
            cls?.contact
          )}
        >
          <a href="mailto:support@openbraininstitute.org" rel="noopener noreferrer">
            Contact Support
          </a>
        </Button>
      )}
    </div>
  );
}

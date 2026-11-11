'use client';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

export function Header() {
  const breakpoint = useDefaultBreakpoint();
  return (
    <Button
      rounded
      variant="default"
      size={breakpoint === 'l' ? 'md' : 'lg'}
      className={cn('hover:bg-primary-9 mb-4 w-96 cursor-none justify-start select-none')}
    >
      Configuration
    </Button>
  );
}

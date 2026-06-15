import { RiLoader2Line } from '@remixicon/react';

import { cn } from '@/utils/css-class';

import type { ComponentProps } from 'react';

type LoaderSize = 'sm' | 'md' | 'lg';

type LoaderProps = ComponentProps<'div'> & {
  size?: LoaderSize;
};

const sizeClass: Record<LoaderSize, string> = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-10',
};

function Loader({ size = 'lg', className, ...props }: LoaderProps) {
  return (
    <div
      data-slot="loader"
      role="status"
      aria-label="Loading"
      className={cn(
        'text-neutral-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        className
      )}
      {...props}
    >
      <RiLoader2Line className={cn('animate-spin', sizeClass[size])} />
    </div>
  );
}

export { Loader };
export default Loader;

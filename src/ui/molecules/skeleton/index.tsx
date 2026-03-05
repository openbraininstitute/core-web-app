import { cn } from '@/utils/css-class';

function Skeleton({
  className,
  active = true,
  ...props
}: React.ComponentProps<'div'> & {
  active?: boolean;
}) {
  return (
    <div
      data-slot="skeleton"
      className={cn('rounded-md bg-gray-200', className, {
        'animate-pulse': active,
      })}
      {...props}
    />
  );
}

export { Skeleton };

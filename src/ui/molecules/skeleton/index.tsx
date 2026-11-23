import { cn } from '@/utils/css-class';

function Skeleton({
  className,
  active = true,
  as: Tag = 'div',
  ...props
}: React.ComponentProps<'div'> & {
  active?: boolean;
  as?: 'div' | 'span';
}) {
  return (
    <Tag
      data-slot="skeleton"
      className={cn('rounded-md bg-gray-200', className, {
        'animate-pulse': active,
      })}
      {...props}
    />
  );
}

export { Skeleton };

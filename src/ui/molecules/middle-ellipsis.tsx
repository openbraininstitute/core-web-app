import { cn } from '@/utils/css-class';

/**
 * Text that, when its box is narrower than it, loses its middle (`Single neuro…n neuron.`) rather
 * than its end. Pure CSS, so it follows whatever width the flex parent gives it: the head
 * truncates, the last `tail` characters never do. Short text is not split.
 */
export function MiddleEllipsis({
  text,
  tail = 8,
  className,
}: {
  text: string;
  tail?: number;
  className?: string;
}) {
  const cut = text.length > tail * 2 ? text.length - tail : text.length;
  return (
    <span className={cn('flex min-w-0 whitespace-nowrap', className)}>
      <span className="min-w-0 truncate">{text.slice(0, cut)}</span>
      <span className="shrink-0 whitespace-pre">{text.slice(cut)}</span>
    </span>
  );
}

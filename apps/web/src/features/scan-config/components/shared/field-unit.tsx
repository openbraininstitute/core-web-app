import { renderMathInText } from '@/features/scan-config/components/shared/render-math-in-text';
import { cn } from '@/utils/css-class';

// set right after the label it belongs to; the caller passes the label's text size
export function FieldUnit({ unit, className }: { unit: string; className?: string }) {
  return (
    <span className={cn('ml-1.5 shrink-0 font-normal text-gray-500', className)}>
      {renderMathInText(unit)}
    </span>
  );
}

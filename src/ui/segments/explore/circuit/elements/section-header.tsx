import { type TViewVariant, ViewVariant } from '@/constants';
import { detailViewPanelBorderClass } from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';

export function Header({
  title,
  variant = ViewVariant.Light,
}: {
  title: string;
  variant?: TViewVariant;
}) {
  return (
    <div
      className={cn(
        'rounded-full border px-4 py-3 text-xl font-bold',
        variant === ViewVariant.Default
          ? cn(detailViewPanelBorderClass(variant), 'text-white')
          : 'border-neutral-2 text-primary-8'
      )}
    >
      {title}
    </div>
  );
}

import { type TViewVariant, ViewVariant } from '@/constants';
import { cn } from '@/utils/css-class';

type Props = {
  label: string;
  value?: string | number | number[];
  unit?: string;
  variant?: TViewVariant;
};

export default function ConfigItem({ label, value, unit, variant }: Props) {
  return (
    <div id={`config-item-${label}`} className="flex flex-col items-start gap-1">
      <div
        className={cn('font-medium text-gray-400 uppercase', {
          'text-gray-400': variant === ViewVariant.Default,
          'text-primary-6': variant === ViewVariant.Light,
        })}
      >
        {label}
      </div>
      <div
        className={cn('text-lg font-bold first-letter:uppercase', {
          'text-white': variant === ViewVariant.Default,
          'text-primary-8': variant === ViewVariant.Light,
        })}
      >
        {value}
        {unit && (
          <span
            className={cn('ml-2 text-sm font-light', {
              'text-white': variant === ViewVariant.Default,
              'text-primary-8': variant === ViewVariant.Light,
            })}
          >
            [{unit}]
          </span>
        )}
      </div>
    </div>
  );
}

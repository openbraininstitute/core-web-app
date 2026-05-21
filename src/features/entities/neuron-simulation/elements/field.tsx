import {
  detailViewLabelClass,
  detailViewValueClass,
  type DetailViewVariant,
} from '@/ui/segments/detail-view/variant-styles';
import { classNames } from '@/util/utils';

export function Field({
  label,
  value,
  className,
  variant = 'light',
}: {
  label: string;
  value: string;
  className?: string;
  variant?: DetailViewVariant;
}) {
  return (
    <div className={classNames('mr-10 mb-4 text-sm', detailViewValueClass(variant))}>
      <div className={detailViewLabelClass(variant)}>{label}</div>
      <div className={classNames('break-words', className)}>{value}</div>
    </div>
  );
}

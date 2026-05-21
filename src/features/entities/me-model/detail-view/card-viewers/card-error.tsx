import { InfoCircleFilled } from '@ant-design/icons';

import {
  detailViewHeadingClass,
  detailViewValueClass,
  type DetailViewVariant,
} from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';

export default function CardError({ variant = 'light' }: { variant?: DetailViewVariant }) {
  return (
    <div
      className={cn(
        'w-full rounded-[6px] border p-6',
        variant === 'onPrimary' ? 'border-white/20 bg-white/10' : 'border-red-100 bg-white'
      )}
    >
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <InfoCircleFilled className="mb-4 text-4xl text-red-500" />
        <h3 className={cn('mb-2 text-lg font-bold', detailViewHeadingClass(variant, 'xl'))}>
          Failed to load model data
        </h3>
        <p className={cn('mb-4', detailViewValueClass(variant))}>
          There was an error loading this model&apos;s details. Please try again.
        </p>
      </div>
    </div>
  );
}

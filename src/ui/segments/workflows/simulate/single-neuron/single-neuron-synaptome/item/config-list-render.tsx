import type { SelectProps } from 'antd';

import { cn } from '@/utils/css-class';

export function OptionRender({ data }: Parameters<NonNullable<SelectProps['optionRender']>>[0]) {
  return (
    <div className="border-neutral-4 flex flex-col gap-2 border-b select-none last:border-none">
      <div
        className={cn(
          'label',
          'border-neutral-2 flex w-max items-center gap-px rounded-full border px-3 py-0.5'
        )}
      >
        <div className="text-primary-8 line-clamp-1 flex items-center justify-center gap-1 text-lg font-bold">
          <div
            className="mt-1 h-2 w-2 rounded-full leading-7"
            // eslint-disable-next-line @typescript-eslint/dot-notation
            style={{
              backgroundColor: data.color,
            }}
          />
          <div>{data.label}</div>
        </div>
      </div>
      <div className={cn('data', 'grid w-full grid-cols-3 items-start justify-start gap-3')}>
        <div className={cn('target', 'flex w-full items-start gap-1')}>
          <span className="text-neutral-3 text-base font-light">Target:</span>
          <span className="text-primary-8 line-clamp-1 text-base font-bold">{data.target}</span>
        </div>
        <div className={cn('type', 'flex w-full items-start gap-1')}>
          <span className="text-neutral-3 text-base font-light">Type:</span>
          <span className="text-primary-8 line-clamp-1 text-base font-bold">{data.type}</span>
        </div>
        <div className={cn('distribution', 'line-clamp-1 flex w-full items-start gap-1')}>
          <span className="text-neutral-3 text-base font-light">Distribution:</span>
          <span className="text-primary-8 line-clamp-1 text-base font-bold">
            {data.isFormula ? <code>{data.distribution}</code> : <span>{data.distribution}</span>}
          </span>
        </div>
      </div>
    </div>
  );
}

'use client';

import { Select } from 'antd';

import { getScaleArray } from '@/ui/segments/project/activities/elements/helpers';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/elements/helpers';

type Props = {
  onScaleChange: (s: TExtendedEntitiesTypeDict) => void;
  onTypeChange: (t: TActivityValue) => void;
  onPageChange: (p: number) => void;
};

export function Header({ onScaleChange, onTypeChange, onPageChange }: Props) {
  const onScale = (s: TExtendedEntitiesTypeDict) => {
    onScaleChange(s);
    onPageChange(1);
  };
  const onType = (t: TActivityValue) => {
    onTypeChange(t);
    onPageChange(1);
  };

  return (
    <div className="flex w-full flex-col items-start justify-start gap-1.5 lg:flex-row lg:gap-5 xl:items-center xl:gap-10">
      <h1 className="min-w-max grow text-xl">Recent activities</h1>
      <div className="flex w-full flex-wrap items-center justify-start gap-3 lg:justify-end xl:justify-end">
        <div className="flex flex-col items-start justify-start gap-0.5 xl:flex-row xl:items-center xl:justify-center xl:gap-3">
          <div>Scale</div>
          <Select<TExtendedEntitiesTypeDict>
            className="[&_.ant-select-selector]:rounded-none!"
            popupClassName="rounded-none!"
            defaultValue={getScaleArray().at(0)?.value}
            style={{ width: 200 }}
            onChange={onScale}
            options={getScaleArray()}
          />
        </div>
        <div className="flex flex-col items-start justify-start gap-0.5 xl:flex-row xl:items-center xl:justify-center xl:gap-3">
          <div>Activity type</div>
          <Select
            className="[&_.ant-select-selector]:rounded-none!"
            popupClassName="rounded-none!"
            defaultValue="build"
            style={{ width: 120 }}
            onChange={onType}
            options={[
              {
                label: 'Build',
                value: 'build',
              },
              {
                label: 'Simulate',
                value: 'simulate',
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

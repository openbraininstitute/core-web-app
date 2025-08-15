'use client';

import { Select } from 'antd';

import { getScaleArray } from '@/ui/segments/project/activities/elements/helpers';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ActivityType } from '@/ui/segments/project/activities/elements/helpers';

type Props = {
  onScaleChange: (s: TExtendedEntitiesTypeDict) => void;
  onTypeChange: (t: ActivityType) => void;
  onPageChange: (p: number) => void;
};

export function Header({ onScaleChange, onTypeChange, onPageChange }: Props) {
  const onScale = (s: TExtendedEntitiesTypeDict) => {
    onScaleChange(s);
    onPageChange(1);
  };
  const onType = (t: ActivityType) => {
    onTypeChange(t);
    onPageChange(1);
  };

  return (
    <>
      <h1 className="text-xl">Recent activities</h1>
      <div className="flex items-center justify-center gap-3">
        <div className="flex items-center justify-center gap-3">
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
        <div className="flex items-center justify-center gap-3">
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
    </>
  );
}

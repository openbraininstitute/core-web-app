/* eslint-disable react/no-unstable-nested-components */
import dynamic from 'next/dynamic';
import { useState } from 'react';

import groupBy from 'es-toolkit/compat/groupBy';
import { Select } from 'antd';
import capitalize from 'es-toolkit/compat/capitalize';
import { AllowedTypes } from '@/features/model-analysis/viewer/storage';
import type { IValidationConstructedResult } from '@/features/model-analysis/explorer/context';
import type { TAllowedTypes } from '@/features/model-analysis/viewer/storage';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { IEntity } from '@/api/entitycore/types/entities/entity';
import { EntityCoreBaseAsset } from '@/api/entitycore/types/shared/global';

const Viewer = dynamic(() => import('@/features/model-analysis/viewer/viewer'), {
  ssr: false,
});

type Props = {
  validationResults: IValidationConstructedResult | null;
};

export function ViewerContainer({ validationResults }: Props) {
  const allowedValidationResults = validationResults?.filter((o) =>
    o.assets?.some((obj) => AllowedTypes.includes(obj.content_type as TAllowedTypes))
  );

  const groupedvalidationResults = groupBy(allowedValidationResults, 'name');

  const options = [
    { label: 'All', value: 'all' },
    ...Object.keys(groupedvalidationResults).map((k) => {
      return {
        label: capitalize(k.replaceAll('_', ' ')),
        value: k,
      };
    }),
  ];

  const [selected, setSelected] = useState<string>('all');

  if (!Object.keys(groupedvalidationResults).length) return <div>No validation results found</div>;

  const renderViewer = (r: (typeof groupedvalidationResults)[0][0]) => (
    <Viewer
      entity={r as IEntity & EntityCoreBaseAsset}
      key={r.id}
      entityType={ExtendedEntitiesTypeDict.ValidationResult}
    />
  );

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="text-neutral-3 ml-3 inline-block">SELECT ANALYSIS</div>
        <Select
          options={options}
          className="min-w-[200px]"
          value={selected}
          onChange={(v) => setSelected(v)}
          labelRender={(l) => <div className="text-primary-8 font-bold">{l.label}</div>}
          optionRender={(o) => <div className="text-primary-8">{o.label}</div>}
        />
      </div>

      {selected === 'all' && Object.values(groupedvalidationResults).flat().map(renderViewer)}

      {selected !== 'all' && groupedvalidationResults[selected].map(renderViewer)}
    </>
  );
}

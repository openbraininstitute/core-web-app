/* eslint-disable react/no-unstable-nested-components */
import { capitalize, groupBy } from 'es-toolkit/compat';
import { useState } from 'react';
import { Select } from 'antd';
import dynamic from 'next/dynamic';

import { customSorting } from './custom-sorting';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AllowedTypes } from '@/features/model-analysis/viewer/storage';
import type { TValidationResultNonUndefined } from '@/features/model-analysis/explorer/use-analysis';
import type { TAllowedTypes } from '@/features/model-analysis/viewer/storage';

import styles from './container.module.css';

const Viewer = dynamic(() => import('@/features/model-analysis/viewer/viewer'), {
  ssr: false,
});

type Props = {
  validationResults: TValidationResultNonUndefined | null;
};

export function ViewerContainer({ validationResults }: Props) {
  const allowedValidationResults = validationResults?.filter((o) =>
    o.assets?.some((obj) => AllowedTypes.includes(obj.content_type as TAllowedTypes))
  );

  const groupedValidationResults = groupBy(allowedValidationResults, 'name');

  const options = [
    { label: 'All', value: 'all' },
    ...Object.keys(groupedValidationResults).map((k) => {
      return {
        label: capitalize(k.replaceAll('_', ' ')),
        value: k,
      };
    }),
  ];
  const [selected, setSelected] = useState<string>('all');
  if (!Object.keys(groupedValidationResults).length) return <div>No validation results found</div>;

  const renderViewer = (r: (typeof groupedValidationResults)[0][0]) => (
    <Viewer entity={r} key={r.id} entityType={ExtendedEntitiesTypeDict.ValidationResult} />
  );
  const listToRender = (
    selected === 'all'
      ? Object.values(groupedValidationResults).flat()
      : groupedValidationResults[selected]
  ).sort(customSorting);
  const passed = listToRender.reduce((accumulator, item) => accumulator && item.passed, true);

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
        <div className={passed ? styles.passed : styles.failed}>{passed ? 'passed' : 'failed'}</div>
      </div>
      {listToRender.map(renderViewer)}
    </>
  );
}

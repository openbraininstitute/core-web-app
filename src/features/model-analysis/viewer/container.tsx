/* eslint-disable react/no-unstable-nested-components */
import { capitalize, groupBy, isNil } from 'es-toolkit/compat';
import { useState } from 'react';
import { Select, Tooltip } from 'antd';
import dynamic from 'next/dynamic';

import { customSorting } from './custom-sorting';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AllowedTypes } from '@/features/model-analysis/viewer/storage';
import type { TValidationResultNonUndefined } from '@/features/model-analysis/explorer/use-analysis';
import type { TAllowedTypes } from '@/features/model-analysis/viewer/storage';

import { Explanation } from '@/components/explanation';
import styles from './container.module.css';

const Viewer = dynamic(() => import('@/features/model-analysis/viewer/viewer'), {
  ssr: false,
});

type Props = {
  rin: number | undefined;
  validationResults: TValidationResultNonUndefined | null;
};

export function ViewerContainer({ rin, validationResults }: Props) {
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
        {!isNil(rin) && (
          <Tooltip title="Input Resistance in mega ohms">
            <div>
              Rin: <strong>{rin.toFixed(2)}</strong> MΩ
            </div>
          </Tooltip>
        )}
      </div>
      <Explanation title="ME-Model Validation" className={styles.validationDescription}>
        <p>
          ME-Model validation runs a series of validations to test the model simulation quality. We
          calculate the threshold current (rheobase, if not present) and the input resistance of the
          model (Rin). The validations include:
        </p>
        <ol>
          <li>1. Hyperpolization Validation</li>
          <li>2. Input Resistance (Rin) Validation</li>
          <li>3. Spiking Validation</li>
          <li>4. AIS (Axon Initial Segment) Spiking Validation</li>
          <li>5. Depolarization Block Validation</li>
          <li>6. IV (Current-Voltage) Curve Validation</li>
          <li>7. FI (Frequency-Current) Curve Validation</li>
          <li>8. Back-propagating Action Potential (BPAP) Validation</li>
        </ol>
        <p>
          The output figures for each validation, along with the validation protocol descriptions
          and validation conditions, are provided below. An ME-model PASSES validation if all
          individual validations pass. The ME-model validation status only represents a qualitative
          assessment of the model. Even if the ME-model FAILS validation, you can still run the
          model simulations.
        </p>
        <p>
          Note: The platform skips certain validations when a model lacks specific sections, such as
          AIS Validation when AIS is absent, and BPAP Validation when dendrites are missing in the
          model, and their figures do not appear in the list below.
        </p>
      </Explanation>
      {listToRender.map(renderViewer)}
    </>
  );
}

import React, { ChangeEvent } from 'react';
import { Button } from 'antd';

import {
  ephysControlLabelClass,
  ephysControlSubLabelClass,
  type EphysViewerVariant,
} from '@/features/ephys-viewer/label-styles';
import { classNames } from '@/util/utils';

import styles from './sweep-selector.module.css';

type TraceSelectorGroupProps = {
  selectedSweeps: string[];
  sweepOptions: { label: string; value: string }[];
  onPreviewSweep: (value?: string) => void;
  setSelectedSweeps: (sweeps: string[]) => void;
  colorMap: Map<string, string>;
  previewItem?: string;
  variant?: EphysViewerVariant;
};

function SweepSelector({
  previewItem,
  selectedSweeps,
  sweepOptions,
  onPreviewSweep,
  setSelectedSweeps,
  colorMap,
  variant = 'light',
}: TraceSelectorGroupProps) {
  const [preview, setPreview] = React.useState<string | undefined>(undefined);
  const handlePreviewSweep = (id: string | undefined) => {
    onPreviewSweep(id);
    setPreview(id);
  };
  const sweeps = sweepOptions.map(({ label, value }) => {
    const isSelected = selectedSweeps.includes(value);
    const isEmptySelection = !selectedSweeps.length;
    const isHighlight = isSelected || (isEmptySelection && !previewItem);

    const handleChange = ({ target }: ChangeEvent<HTMLInputElement>) => {
      const { value: checkboxValue, checked } = target;

      if (checked) {
        setSelectedSweeps([...selectedSweeps, checkboxValue]);
      } else {
        setSelectedSweeps(selectedSweeps.filter((sweep) => sweep !== checkboxValue));
      }

      handlePreviewSweep(undefined);
    };

    return (
      <div
        key={label}
        className={classNames(
          'px-1 pb-1 last:pr-0',
          styles.main,
          preview ? styles.previewOn : styles.previewOff,
          selectedSweeps.length > 0 ? styles.selectionOn : styles.selectionOff
        )}
        onMouseEnter={() => handlePreviewSweep(value)}
        onMouseLeave={() => handlePreviewSweep(undefined)}
      >
        <label // eslint-disable-line jsx-a11y/label-has-associated-control
          className={classNames(
            'flex h-[32px] w-[32px] cursor-pointer items-center rounded border-1 hover:opacity-75',
            isSelected && styles.selected
          )}
          style={{
            background: colorMap.get(value) ?? '#1890ff',
          }}
          key={label}
        >
          <input
            id="sweepInput"
            className="hidden"
            checked={isSelected}
            type="checkbox"
            value={value}
            onChange={handleChange}
          />
          <span style={{ display: isHighlight ? 'none' : undefined }} />
        </label>
      </div>
    );
  });

  return (
    <div className={styles.flex}>
      <div className="flex flex-col gap-3">
        <span className={ephysControlLabelClass(variant)}>
          Sweep{' '}
          <small className={ephysControlSubLabelClass(variant)}>
            ({sweepOptions.length} available)
          </small>
        </span>
        <div className="flex flex-wrap items-center">{sweeps}</div>
      </div>
      {selectedSweeps.length > 0 && (
        <Button
          onClick={() => {
            setSelectedSweeps([]);
            handlePreviewSweep(undefined);
          }}
        >
          Reset
        </Button>
      )}
    </div>
  );
}

export default SweepSelector;

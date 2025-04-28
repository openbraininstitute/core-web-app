import { ChangeEvent } from 'react';
import { classNames } from '@/util/utils';


type TraceSelectorGroupProps = {
  selectedSweeps: string[];
  sweepOptions: { label: string; value: string }[];
  handlePreviewSweep: (value?: string) => void;
  setSelectedSweeps: (sweeps: string[]) => void;
  colorMap: Map<string, string>;
  previewItem?: string;
};

function SweepSelector({
  previewItem,
  selectedSweeps,
  sweepOptions,
  handlePreviewSweep,
  setSelectedSweeps,
  colorMap,
}: TraceSelectorGroupProps) {
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
        className="px-1 pb-1 last:pr-0"
        onMouseEnter={() => handlePreviewSweep(value)}
        onMouseLeave={() => handlePreviewSweep(undefined)}
      >
        <label // eslint-disable-line jsx-a11y/label-has-associated-control
          className={classNames(
            'border-1 flex h-[32px] w-[32px] cursor-pointer items-center rounded hover:opacity-75',
            isSelected ? 'border-[#1890ff]' : 'border-[#1890ff00]'
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
    <div className="flex flex-col gap-3">
      <span className="font-bold text-dark">
        Sweep <small className="text-sm font-light">({sweepOptions.length} available)</small>
      </span>
      <div className="flex flex-wrap items-center">{sweeps}</div>
    </div>
  );
}

export default SweepSelector;

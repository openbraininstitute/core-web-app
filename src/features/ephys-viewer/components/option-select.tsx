import { useId } from 'react';

import { type TViewVariant, ViewVariant } from '@/constants';
import {
  EphysSelect,
  type TEphysSelectItem,
} from '@/features/ephys-viewer/components/ephys-select';
import {
  ephysControlLabelClass,
  ephysControlSubLabelClass,
} from '@/features/ephys-viewer/label-styles';
import { cn } from '@/utils/css-class';

export type { TEphysControlsVariant } from '@/features/ephys-viewer/components/ephys-select';

interface OptionSelectProps {
  label: {
    title: string;
    numberOfAvailable: number;
  };
  value: string;
  onChange: (value: string) => void;
  items: TEphysSelectItem[];
  hideWhenSingle?: boolean;
  variant?: TViewVariant;
  /** Fill the available width instead of sitting at the fixed control width. */
  fluid?: boolean;
}

/** A labelled {@link EphysSelect}: the title, how many choices there are, and the box. */
function OptionSelect({
  label: { numberOfAvailable, title },
  value,
  onChange: handleChange,
  items,
  hideWhenSingle = false,
  variant = ViewVariant.Light,
  fluid = false,
}: OptionSelectProps) {
  // several of these sit side by side in the control row; a shared literal id would point every
  // label at the first select
  const selectId = useId();

  if (hideWhenSingle && numberOfAvailable === 1) {
    return null;
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-2', fluid && 'w-full')}>
      <label className={ephysControlLabelClass(variant)} htmlFor={selectId}>
        {title}
        <small className={ephysControlSubLabelClass(variant)}>
          {numberOfAvailable > 1 && <>&nbsp;({numberOfAvailable} available)</>}
        </small>
      </label>

      <EphysSelect
        id={selectId}
        value={value}
        onChange={handleChange}
        items={items}
        disabled={numberOfAvailable === 1}
        variant={variant}
        className={fluid ? 'w-full' : 'w-[180px] max-w-full'}
      />
    </div>
  );
}

export default OptionSelect;

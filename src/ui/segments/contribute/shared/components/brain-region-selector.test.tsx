import { render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { BrainRegionSelector } from './brain-region-selector';

const brainRegionDropdownWithFormItemMock = vi.fn(() => null);

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({
    projectId: 'project-id',
  }),
}));

vi.mock('@/features/brain-region-hierarchy/context', () => ({
  useBrainRegionHierarchy: () => ({
    node: {
      id: 'default-brain-region-id',
      name: 'Cerebrum',
    },
  }),
}));

vi.mock('@/features/brain-region-dropdown/form-dropdown', () => ({
  BrainRegionDropdownWithFormItem: (props: unknown) => {
    brainRegionDropdownWithFormItemMock(props);
    return null;
  },
}));

describe('BrainRegionSelector', () => {
  it('forwards form control props to the dropdown component', () => {
    const onChange = vi.fn();

    render(
      createElement(
        BrainRegionSelector as unknown as React.ComponentType<Record<string, unknown>>,
        {
          value: 'selected-brain-region-id',
          onChange,
        }
      )
    );

    expect(brainRegionDropdownWithFormItemMock).toHaveBeenCalledWith(
      expect.objectContaining({
        value: 'selected-brain-region-id',
        onChange,
      })
    );
  });
});

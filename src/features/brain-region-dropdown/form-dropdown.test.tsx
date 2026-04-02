import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useAtomValueMock } = vi.hoisted(() => ({
  useAtomValueMock: vi.fn(),
}));

const HIERARCHY_TOKEN = { type: 'hierarchy' };
const LOADABLE_TOKEN = { type: 'loadable' };

vi.mock('jotai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jotai')>();

  return {
    ...actual,
    useAtomValue: useAtomValueMock,
  };
});

vi.mock('jotai/utils', () => ({
  unwrap: () => HIERARCHY_TOKEN,
  loadable: () => LOADABLE_TOKEN,
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 0,
    getVirtualItems: () => [],
    measure: vi.fn(),
  }),
}));

vi.mock('@/components/icons', () => ({
  BrainIcon: () => null,
}));

vi.mock('@/features/brain-region-hierarchy/context', () => ({
  brainRegionBasicCellGroupsRegionsExtendedHierarchyAtom: { type: 'brain-region-atom' },
}));

vi.mock('@/ui/hooks/create-break-point', () => ({
  useDefaultBreakpoint: () => 'l',
}));

vi.mock('@/ui/molecules/button', () => ({
  Button: ({ children, ...props }: React.ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/ui/molecules/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { BrainRegionDropdown } from './form-dropdown';

const CEREBRUM = {
  id: 'region-1',
  name: 'Cerebrum',
  is_volumetric_region: true,
} as const;

describe('BrainRegionDropdown', () => {
  it('updates the trigger label when the default brain region arrives after mount', () => {
    useAtomValueMock.mockImplementation((token: unknown) => {
      if (token === HIERARCHY_TOKEN) {
        return {
          options: [
            {
              value: CEREBRUM.id,
              label: CEREBRUM.name,
              data: CEREBRUM,
            },
          ],
        };
      }

      if (token === LOADABLE_TOKEN) {
        return { state: 'hasData' };
      }

      return null;
    });

    const { rerender } = render(<BrainRegionDropdown showIcon={false} />);

    expect(screen.getByText('Select brain region...')).toBeInTheDocument();

    rerender(<BrainRegionDropdown defaultBrainRegion={CEREBRUM} showIcon={false} />);

    expect(screen.getByText('Cerebrum')).toBeInTheDocument();
  });
});

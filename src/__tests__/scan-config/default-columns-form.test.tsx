import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { useFormRevealed } from '@/features/scan-config/template/use-form-revealed';

import type { ScanConfigTemplateProps } from '@/features/scan-config/template/types';
import type { ScanConfigTemplateState } from '@/features/scan-config/template/use-scan-config-template';

vi.mock('@/features/scan-config/components/ui-columns', () => ({ Right: () => null }));
vi.mock('@/features/scan-config/template/columns', () => ({
  LeftColumn: ({ state, formShown }: { state: ScanConfigTemplateState; formShown: boolean }) => (
    <button type="button" onClick={() => state.setSelectedRootElement('emodel')}>
      {formShown ? 'form shown' : 'form folded'}
    </button>
  ),
  MiddleColumn: ({ onClose }: { onClose: () => void }) => (
    <button type="button" onClick={onClose}>
      close
    </button>
  ),
}));

const { DefaultConfigColumns } = await import('@/features/scan-config/template/default-columns');

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

let select: (root: string) => void = () => {};

/** The template's layout switch: the e-model block has a layout of its own. */
function Page() {
  const [root, setRoot] = useState('info');
  const [formRevealed, setFormRevealed] = useFormRevealed(root, '');
  select = setRoot;
  if (root === 'emodel') return <div>e-model layout</div>;
  const state = {
    selectedRootElement: root,
    setSelectedRootElement: setRoot,
    selectedEntry: '',
    setSelectedEntry: () => {},
    editing: true,
    formRevealed,
    setFormRevealed,
  } as unknown as ScanConfigTemplateState;
  return <DefaultConfigColumns props={{} as ScanConfigTemplateProps} state={state} />;
}

describe('DefaultConfigColumns', () => {
  it('opens with the form folded, shows it for a block picked, and folds it by its \u00d7', () => {
    render(<Page />);
    expect(screen.getByText('form folded')).toBeInTheDocument();
    act(() => select('initialize'));
    expect(screen.getByText('form shown')).toBeInTheDocument();
    fireEvent.click(screen.getByText('close'));
    expect(screen.getByText('form folded')).toBeInTheDocument();
  });

  it('shows the form of a block picked from the e-model layout', () => {
    render(<Page />);
    fireEvent.click(screen.getByText('form folded'));
    expect(screen.getByText('e-model layout')).toBeInTheDocument();
    act(() => select('info'));
    expect(screen.getByText('form shown')).toBeInTheDocument();
  });
});

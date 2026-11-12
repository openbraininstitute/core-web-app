import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AgCellHost } from '@/features/data-grid/renderers/aggrid/cell-host';

import type { CustomCellRendererProps } from 'ag-grid-react';

describe('a fitted cell', () => {
  it('is watched once, however often it renders', () => {
    const unwatch = vi.fn();
    const watchFittedCell = vi.fn(() => unwatch);
    const props = {
      context: { cellRenderers: new Map([['name', () => <b>run</b>]]), watchFittedCell },
      colDef: { cellRendererParams: { rendererKey: 'name', fitted: true } },
      data: {},
      value: 'run',
    } as unknown as CustomCellRendererProps;

    const { rerender, unmount } = render(<AgCellHost {...props} />);
    rerender(<AgCellHost {...props} />);
    rerender(<AgCellHost {...props} />);

    expect(watchFittedCell).toHaveBeenCalledTimes(1);
    expect(unwatch).not.toHaveBeenCalled();
    unmount();
    expect(unwatch).toHaveBeenCalledTimes(1);
  });
});

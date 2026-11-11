import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RELATED_CIRCUIT_COLUMNS } from '@/ui/segments/explore/circuit/elements/related-circuits/columns';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

const circuit = { id: 'c1', name: 'Circuit 1' } as unknown as ICircuit;

describe('related-circuits download action geometry', () => {
  it('renders a fixed, non-shrinkable round button', () => {
    const download = RELATED_CIRCUIT_COLUMNS[0];
    expect(download.id).toBe('__download');

    const { getByRole } = render(download.renderCell?.(circuit));
    const button = getByRole('button', { name: 'Download circuit' });

    // equal width/height + fully round + immune to the flex cell squashing it
    expect(button.className).toContain('size-7');
    expect(button.className).toContain('rounded-full');
    expect(button.className).toContain('shrink-0');
  });

  it('keeps the glyph from squashing (the raw <button> has no Button-molecule svg rule)', () => {
    const download = RELATED_CIRCUIT_COLUMNS[0];
    const { container } = render(download.renderCell?.(circuit));
    const svg = container.querySelector('svg');
    if (!svg) throw new Error('expected the download glyph');

    expect(svg.getAttribute('class')).toContain('shrink-0');
  });

  it('reserves a column wide enough for the 28px circle plus the cell padding', () => {
    const download = RELATED_CIRCUIT_COLUMNS[0];
    // 28 (size-7) + 2 x 16 (theme cellHorizontalPadding) = 60px minimum
    expect(download.width?.minWidth).toBeGreaterThanOrEqual(60);
    expect(download.width?.width).toBeGreaterThanOrEqual(60);
  });
});

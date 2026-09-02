import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { executionStatusIconMap } from '@/components/icons/activity-execution';

import type { ReactNode } from 'react';

/** The `d` of every path an icon draws, joined — its shape, independent of size/colour. */
function pathsOf(icon: ReactNode): string {
  const { container } = render(<span>{icon}</span>);
  return Array.from(container.querySelectorAll('path, circle'))
    .map((node) => node.getAttribute('d') ?? node.outerHTML)
    .join('|');
}

describe('executionStatusIconMap', () => {
  it('gives every status its own glyph', () => {
    // CANCELLED once shipped as a byte-for-byte copy of CREATED, which made the two
    // indistinguishable anywhere the label is dropped (e.g. the mixed-campaign counts pill).
    const shapes = Object.values(ActivityStatus).map((status) => [
      status,
      pathsOf(executionStatusIconMap[status]),
    ]);

    for (const [status, shape] of shapes) {
      expect(shape, `${status} draws nothing`).not.toBe('');
    }
    expect(new Set(shapes.map(([, shape]) => shape)).size).toBe(shapes.length);
  });
});

import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FloatInput } from '@/features/scan-config/components/ui-elements/float-input';
import { FloatOptional } from '@/features/scan-config/components/ui-elements/float-optional';
import ParameterSweep from '@/features/scan-config/components/ui-elements/parameter-sweep';

const BOUNDS = { min: undefined, max: undefined, exclusiveMin: undefined, exclusiveMax: undefined };

/**
 * antd's `width: 90px` and Tailwind's `w-full` tie on specificity, so the field
 * was narrow whenever antd's styles happened to load last. Only an inline width
 * wins whatever the order.
 */
describe('scan-config numeric inputs', () => {
  it.each([
    [
      'float input',
      <FloatInput key="float" value={1} onChange={vi.fn()} disabled={false} {...BOUNDS} />,
    ],
    [
      'optional float',
      <FloatOptional key="optional" value={1} onChange={vi.fn()} disabled={false} {...BOUNDS} />,
    ],
    [
      'single sweep value',
      <ParameterSweep
        key="sweep"
        k="sweep"
        value={1}
        onChange={vi.fn()}
        disabled={false}
        {...BOUNDS}
      />,
    ],
  ])('stretches the %s across its field inline', (_, element) => {
    const { container } = render(element);

    const input = container.querySelector<HTMLElement>('.ant-input-number');
    expect(input?.style.width).toBe('100%');
  });
});

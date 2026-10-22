import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MiddleEllipsis } from '@/ui/molecules/middle-ellipsis';

describe('MiddleEllipsis', () => {
  it('splits long text into a truncating head and a fixed tail that rejoin to the text', () => {
    const text = 'Single neuron simulation - empty template. Rat L4 excitatory pyramidal neuron.';
    const { container } = render(<MiddleEllipsis text={text} />);
    const [head, tail] = container.querySelectorAll('span > span');
    expect(head).toHaveClass('truncate');
    expect(tail).toHaveClass('shrink-0');
    expect(tail.textContent).toHaveLength(8);
    expect(head.textContent + tail.textContent).toBe(text);
  });

  it('does not split short text', () => {
    const { container } = render(<MiddleEllipsis text="1131" />);
    const [head, tail] = container.querySelectorAll('span > span');
    expect(head.textContent).toBe('1131');
    expect(tail.textContent).toBe('');
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CodeBlock } from '@/ui/molecules/code-blocks';

vi.mock('shiki', () => ({
  codeToHtml: () => Promise.reject(new Error('chunk load failed')),
}));

describe('CodeBlock', () => {
  it('shows the raw code when highlighting fails', async () => {
    render(<CodeBlock code="print('hi')" language="python" />);

    expect(await screen.findByText("print('hi')")).toBeDefined();
  });
});

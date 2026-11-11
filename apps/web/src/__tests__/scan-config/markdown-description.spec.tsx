import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MarkdownDescription } from '@/ui/molecules/markdown-description';

describe('MarkdownDescription', () => {
  it('renders legacy plain text unchanged', () => {
    render(<MarkdownDescription>A simple block description.</MarkdownDescription>);
    expect(screen.getByText('A simple block description.')).toBeInTheDocument();
  });

  it('preserves single line breaks in legacy text', () => {
    const { container } = render(
      <MarkdownDescription>{'first line\nsecond line'}</MarkdownDescription>
    );
    expect(container.querySelector('br')).not.toBeNull();
  });

  it('auto-links bare URLs like the legacy renderer did', () => {
    render(<MarkdownDescription>See https://example.com/docs for details.</MarkdownDescription>);
    const link = screen.getByRole('link', { name: 'https://example.com/docs' });
    expect(link).toHaveAttribute('href', 'https://example.com/docs');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders markdown formatting (bold, lists, inline code)', () => {
    const { container } = render(
      <MarkdownDescription>
        {'**Important** parameters:\n\n- `frequency`\n- amplitude'}
      </MarkdownDescription>
    );
    expect(container.querySelector('strong')?.textContent).toBe('Important');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('code')?.textContent).toBe('frequency');
  });

  it('renders inline and block math with KaTeX', () => {
    const { container } = render(
      <MarkdownDescription>
        {'Inline $E = mc^2$ and block:\n\n$$\n\\frac{dV}{dt} = -\\frac{V}{\\tau}\n$$'}
      </MarkdownDescription>
    );
    expect(container.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('.katex-display')).not.toBeNull();
  });

  it('does not execute raw HTML', () => {
    const { container } = render(
      <MarkdownDescription>
        {'text with <script>window.hacked=true</script> tag'}
      </MarkdownDescription>
    );
    expect(container.querySelector('script')).toBeNull();
  });

  it('renders nothing for empty or missing descriptions', () => {
    const { container } = render(<MarkdownDescription>{undefined}</MarkdownDescription>);
    expect(container).toBeEmptyDOMElement();
  });
});

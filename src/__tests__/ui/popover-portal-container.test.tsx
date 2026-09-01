import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';

/**
 * An open popover, plus the root React Testing Library rendered it under. The
 * panel is expected to have left that root for a portal.
 */
function renderOpen(container?: HTMLElement) {
  const { container: root } = render(
    <Popover open>
      <PopoverTrigger>Open</PopoverTrigger>
      <PopoverContent container={container} data-testid="panel">
        panel
      </PopoverContent>
    </Popover>
  );
  return { panel: screen.getByTestId('panel'), root };
}

describe('PopoverContent', () => {
  it('portals into the element the caller named', () => {
    // Standing in for the fullscreen element. A panel portalled to
    // `document.body` sits outside the fullscreen subtree, where the browser
    // does not paint it, which is what the caller passes a container to avoid.
    const fullscreen = document.body.appendChild(document.createElement('div'));

    const { panel } = renderOpen(fullscreen);

    expect(fullscreen.contains(panel)).toBe(true);
  });

  it('portals to the browser default when the caller names none', () => {
    const { panel, root } = renderOpen();

    expect(panel.isConnected).toBe(true);
    expect(root.contains(panel)).toBe(false);
  });
});

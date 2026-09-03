import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';

/**
 * A panel portalled to the body while a viewer is fullscreen sits outside the
 * fullscreen subtree, and the browser draws none of it. jsdom has no fullscreen
 * API, so the element is stubbed onto the document the store reads it from.
 */
function setFullscreenElement(element: Element | null) {
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    value: element,
  });
}

afterEach(() => setFullscreenElement(null));

function renderPopover(container?: HTMLElement) {
  render(
    <Popover open>
      <PopoverTrigger>open</PopoverTrigger>
      <PopoverContent container={container}>panel</PopoverContent>
    </Popover>
  );
  return screen.getByText('panel');
}

describe('portalled panels in fullscreen', () => {
  it('lands in the body when nothing is fullscreen', () => {
    expect(document.body).toContainElement(renderPopover());
  });

  it('follows the element into fullscreen', () => {
    const fullscreen = document.body.appendChild(document.createElement('div'));
    setFullscreenElement(fullscreen);

    expect(fullscreen).toContainElement(renderPopover());
  });

  it('lets a host name a mount node of its own', () => {
    const fullscreen = document.body.appendChild(document.createElement('div'));
    const chosen = document.body.appendChild(document.createElement('div'));
    setFullscreenElement(fullscreen);

    const panel = renderPopover(chosen);
    expect(chosen).toContainElement(panel);
    expect(fullscreen).not.toContainElement(panel);
  });
});

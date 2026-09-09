import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { FullscreenPortalScope } from '@/utils/fullscreen';

import type { ReactNode } from 'react';

/** jsdom has no fullscreen API, so stub the property the store reads. */
function setFullscreenElement(element: Element | null) {
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    value: element,
  });
}

afterEach(() => setFullscreenElement(null));

/** A viewer host, publishing its own root the way the two real ones do. */
function Viewer({ children }: { children: ReactNode }) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);

  return (
    <div ref={setRoot} data-testid="viewer">
      <FullscreenPortalScope root={root}>{children}</FullscreenPortalScope>
    </div>
  );
}

const panel = (
  <Popover open>
    <PopoverTrigger>open</PopoverTrigger>
    <PopoverContent>panel</PopoverContent>
  </Popover>
);

describe('portalled panels in fullscreen', () => {
  it('lands in the body when nothing is fullscreen', () => {
    render(<Viewer>{panel}</Viewer>);

    expect(document.body).toContainElement(screen.getByText('panel'));
  });

  it('follows its own viewer into fullscreen', () => {
    const fullscreen = document.body.appendChild(document.createElement('div'));
    const host = fullscreen.appendChild(document.createElement('div'));
    setFullscreenElement(fullscreen);

    render(<Viewer>{panel}</Viewer>, { container: host });

    expect(fullscreen).toContainElement(screen.getByText('panel'));
    expect(host).not.toContainElement(screen.getByText('panel'));
  });

  // Moving this panel into the viewer would strand it over something its own
  // trigger has nothing to do with.
  it('leaves a panel outside any viewer in the body', () => {
    const fullscreen = document.body.appendChild(document.createElement('div'));
    setFullscreenElement(fullscreen);

    render(panel);

    expect(fullscreen).not.toContainElement(screen.getByText('panel'));
    expect(document.body).toContainElement(screen.getByText('panel'));
  });

  it('leaves a second viewer alone while the first one is fullscreen', () => {
    const fullscreen = document.body.appendChild(document.createElement('div'));
    setFullscreenElement(fullscreen);

    render(<Viewer>{panel}</Viewer>);

    expect(fullscreen).not.toContainElement(screen.getByText('panel'));
  });
});

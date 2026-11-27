import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import SectionRail from './section-rail';

const intersections: { observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] =
  [];
let changed: () => void;
let mutationDisconnected: ReturnType<typeof vi.fn>;

beforeEach(() => {
  intersections.length = 0;
  mutationDisconnected = vi.fn();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe = vi.fn();
      disconnect = vi.fn();
      constructor() {
        intersections.push(this);
      }
    }
  );
  vi.stubGlobal(
    'MutationObserver',
    class {
      constructor(callback: () => void) {
        changed = callback;
      }
      observe() {}
      disconnect = mutationDisconnected;
    }
  );
});
afterEach(() => {
  cleanup();
  document.querySelectorAll('[data-page-section]').forEach((section) => section.remove());
  vi.unstubAllGlobals();
});

const addSection = (title: string) => {
  const section = document.createElement('section');
  section.dataset.pageSection = '';
  const heading = document.createElement('h2');
  heading.textContent = title;
  section.append(heading);
  section.scrollIntoView = vi.fn();
  document.body.append(section);
  return section;
};

it('updates navigation when sections are added, and scrolls to the selected section', () => {
  addSection('Overview');
  render(<SectionRail />);
  expect(screen.getByRole('button', { name: 'Go to Overview' })).toBeInTheDocument();
  const details = addSection('Details');
  act(() => changed());
  fireEvent.click(screen.getByRole('button', { name: 'Go to Details' }));
  expect(details.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
});

it('disconnects every observer when sections change and the rail unmounts', () => {
  addSection('Overview');
  const view = render(<SectionRail />);
  addSection('Details');
  act(() => changed());
  view.unmount();
  expect(mutationDisconnected).toHaveBeenCalledTimes(1);
  expect(intersections.length).toBeGreaterThan(1);
  for (const observer of intersections) expect(observer.disconnect).toHaveBeenCalledTimes(1);
});

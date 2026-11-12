import { fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useHeaderContrast } from './use-header-contrast';

const originalHitTest = Object.getOwnPropertyDescriptor(document, 'elementsFromPoint');

function Menu() {
  const ref = useRef<HTMLButtonElement>(null);
  const light = useHeaderContrast(ref);
  return (
    <button ref={ref} type="button" data-tone={light ? 'white' : 'navy'}>
      Find out more
    </button>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  if (originalHitTest) Object.defineProperty(document, 'elementsFromPoint', originalHitTest);
  else Reflect.deleteProperty(document, 'elementsFromPoint');
  document.querySelector('[data-header-media]')?.remove();
});

describe('menu contrast', () => {
  it('uses white on dark media, navy on light media, and navy after scrolling off the visual', () => {
    const visual = document.createElement('div');
    visual.dataset.headerMedia = '';
    const image = document.createElement('img');
    Object.defineProperties(image, {
      naturalWidth: { value: 1280 },
      naturalHeight: { value: 720 },
      complete: { value: true },
    });
    image.style.opacity = '1';
    visual.append(image);
    document.body.append(visual);
    const elements = vi.fn(() => [image]);
    Object.defineProperty(document, 'elementsFromPoint', { value: elements, configurable: true });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 1280,
      height: 720,
      right: 1280,
      bottom: 720,
      x: 0,
      y: 0,
      toJSON() {},
    });
    let channel = 0;
    const context = {
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      getImageData: () => ({
        data: new Uint8ClampedArray(
          Array.from({ length: 12 * 6 * 4 }, (_, i) => (i % 4 === 3 ? 255 : channel))
        ),
      }),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D
    );
    render(<Menu />);
    const button = screen.getByRole('button', { name: 'Find out more' });
    expect(button).toHaveAttribute('data-tone', 'white');
    channel = 255;
    fireEvent.scroll(window);
    expect(button).toHaveAttribute('data-tone', 'navy');
    channel = 0;
    fireEvent.scroll(window);
    expect(button).toHaveAttribute('data-tone', 'white');
    elements.mockReturnValue([]);
    fireEvent.scroll(window);
    expect(button).toHaveAttribute('data-tone', 'navy');
  });
});

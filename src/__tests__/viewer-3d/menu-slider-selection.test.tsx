import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { MenuSlider } from '@/features/scan-config/components/color-by/chrome-menu';

function renderSlider(disabled?: boolean) {
  const { container } = render(
    <MenuSlider
      label="Soma size"
      min={0}
      max={1}
      step={0.1}
      value={0.5}
      onChange={() => {}}
      disabled={disabled}
    />
  );
  const handle = container.querySelector('.ant-slider-handle');
  if (!handle) throw new Error('no slider handle');
  return handle;
}

describe('MenuSlider drag', () => {
  afterEach(() => {
    fireEvent.pointerUp(window);
    document.body.style.removeProperty('user-select');
  });

  it('holds the page from selecting text until the pointer is released', () => {
    const handle = renderSlider();

    fireEvent.pointerDown(handle);
    expect(document.body.style.getPropertyValue('user-select')).toBe('none');

    fireEvent.pointerUp(window);
    expect(document.body.style.getPropertyValue('user-select')).toBe('');
  });

  it('releases the page on a cancelled pointer', () => {
    fireEvent.pointerDown(renderSlider());
    fireEvent.pointerCancel(window);
    expect(document.body.style.getPropertyValue('user-select')).toBe('');
  });

  it('leaves the page alone when disabled', () => {
    fireEvent.pointerDown(renderSlider(true));
    expect(document.body.style.getPropertyValue('user-select')).toBe('');
  });
});

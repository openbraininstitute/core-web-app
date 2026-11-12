import { describe, expect, it } from 'vitest';

import { InteractionManager } from '@/features/spike-viewer/renderer/interaction';

describe('a press on the raster', () => {
  it('is left to the page, whose open menus shut on the mousedown after it', () => {
    const element = document.createElement('div');
    element.setPointerCapture = () => {};
    element.getBoundingClientRect = () => new DOMRect(0, 0, 400, 300);
    const interaction = new InteractionManager(element);
    interaction.setPlotRect({ x: 50, y: 10, width: 300, height: 200 });

    const press = new MouseEvent('pointerdown', {
      button: 0,
      clientX: 100,
      clientY: 100,
      cancelable: true,
    });
    element.dispatchEvent(press);

    expect(press.defaultPrevented).toBe(false);
    expect(element.style.userSelect).toBe('none');
    interaction.destroy();
  });
});

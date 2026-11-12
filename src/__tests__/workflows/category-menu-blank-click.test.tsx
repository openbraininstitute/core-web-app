import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CategoryMenu } from '@/ui/segments/workflows/elements/category-menu';

vi.mock('@/features/feature-flags', () => ({ useFlags: () => ({}) }));

// What the carousel watches its slides with, which jsdom has none of.
class NoObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('IntersectionObserver', NoObserver);
vi.stubGlobal('ResizeObserver', NoObserver);

function menu() {
  const onBlankClick = vi.fn();
  const onItemClick = vi.fn();
  render(<CategoryMenu current={null} onItemClick={onItemClick} onBlankClick={onBlankClick} />);
  const root = screen.getByTestId('workflow-category-menu');
  const heading = screen.getByRole('heading', { name: 'Category' });
  return { onBlankClick, onItemClick, root, heading };
}

describe('a click on the category menu', () => {
  it('is a blank one on the menu itself, its heading’s row, and between its cards', () => {
    const { onBlankClick, root, heading } = menu();
    const row = heading.parentElement as HTMLElement;
    const slides = root.querySelector('[data-slot="carousel-content-wrapper"]') as HTMLElement;
    const slide = root.querySelector('[data-slot="carousel-item"]') as HTMLElement;

    for (const surface of [root, row, slides, slide]) fireEvent.click(surface);

    expect(onBlankClick).toHaveBeenCalledTimes(4);
  });

  it('is none on the heading’s text or a card, which takes its own', () => {
    const { onBlankClick, onItemClick, root, heading } = menu();
    const card = root.querySelector('[data-slot="card"]:not([aria-disabled="true"])');

    fireEvent.click(heading);
    fireEvent.doubleClick(heading);
    fireEvent.click(card as HTMLElement);

    expect(onBlankClick).not.toHaveBeenCalled();
    expect(onItemClick).toHaveBeenCalledOnce();
  });
});

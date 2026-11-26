import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import { InformationDescription, InformationTitle } from './information-text';
import { randomTileImageOrder } from './tile-image-order';

it('preserves a long page title and its accessible name across image flips', () => {
  const title = 'The Real Digital Brain Story';
  const view = render(
    <h1 aria-label={title}>
      <InformationTitle text={title} />
    </h1>
  );
  const original = view.container.querySelector('[data-information-title]');
  expect(screen.getByRole('heading', { name: title })).toHaveTextContent(title);
  expect(original?.textContent).toBe(title);
  view.rerender(
    <h1 aria-label={title}>
      <InformationTitle text={title} />
    </h1>
  );
  const replayed = view.container.querySelector('[data-information-title]');
  expect(replayed).toBe(original);
  expect(replayed?.textContent).toBe(title);
  expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
});

it('keeps the introduction mounted so unrelated rerenders do not replay its animation', () => {
  const text = 'Our original page introduction stays exactly the same.';
  const view = render(<InformationDescription text={text} />);
  const original = view.container.firstChild;
  view.rerender(<InformationDescription text={text} />);
  expect(view.container.firstChild).toBe(original);
  expect(view.container.textContent).toBe(text);
});

it('keeps every image once while avoiding the last page opening image', () => {
  for (const previous of [0, 1, 2]) {
    for (const random of [() => 0, () => 0.5, () => 0.999]) {
      const order = randomTileImageOrder(previous, random);
      expect([...order].sort()).toEqual([0, 1, 2]);
      expect(order[0]).not.toBe(previous);
    }
  }
});

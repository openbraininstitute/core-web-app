import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Homepage from './homepage';

describe('public homepage', () => {
  it('keeps the original logo and routes every account action through the existing platform entry', () => {
    render(<Homepage year={2026} />);

    const header = screen.getByTestId('site-header');
    expect(within(header).getByRole('img', { name: 'Open Brain Institute' })).toHaveAttribute(
      'src',
      '/images/obi_logo.svg'
    );
    expect(screen.getByRole('link', { name: 'Log in ↗' })).toHaveAttribute(
      'href',
      '/app/virtual-lab'
    );
    for (const name of [
      'Start free ↗',
      'Start your research for free ↗',
      'Create your free account ↗',
    ]) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', '/app/virtual-lab/sync');
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the mobile menu and closes it with Escape or a section link', () => {
    render(<Homepage year={2026} />);
    const toggle = screen.getByRole('button', { name: 'Open navigation' });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(screen.getByRole('navigation'), { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('link', { name: 'What you can do' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('starts with voltage traces and keeps the EM animation available', () => {
    render(<Homepage year={2026} />);
    expect(
      screen.getByRole('img', { name: /Close-up of membrane voltage traces/ })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show cells detail' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show em mesh detail' }));
    expect(
      screen.getByRole('img', { name: /Animated electron microscopy cell mesh/ })
    ).toHaveAttribute('src', '/images/homepage/em-cell-mesh.webp');
    expect(screen.queryByRole('button', { name: 'Show circuit detail' })).not.toBeInTheDocument();
    expect(document.querySelector('video')).not.toBeInTheDocument();
    const tour = screen.getByRole('region', { name: 'Inside Virtual Labs: platform tour' });
    expect(within(tour).queryByText('Take a closer look')).not.toBeInTheDocument();
    expect(within(tour).queryByRole('link')).not.toBeInTheDocument();
    expect(
      within(tour).queryByRole('button', { name: /Play platform tour|Pause platform tour/ })
    ).not.toBeInTheDocument();
  });
});

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
    const headerEntry = within(header).getByRole('link', { name: 'Sign up' });
    expect(headerEntry).toHaveAttribute('href', '/app/virtual-lab/sync');
    expect(headerEntry).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByText('Sign in or create a free account')).not.toBeInTheDocument();
    expect(within(header).queryByRole('link', { name: 'Log in ↗' })).not.toBeInTheDocument();
    expect(
      within(header).queryByRole('link', { name: 'Create free account ↗' })
    ).not.toBeInTheDocument();
    const accountActions = screen.getAllByRole('link', { name: 'Try it out' });
    expect(accountActions).toHaveLength(2);
    for (const action of accountActions) {
      expect(action).toHaveAttribute('href', '/app/virtual-lab/sync');
    }
    expect(
      screen.queryByRole('link', { name: /^Open Virtual Labs(?: ↗)?$/ })
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('virtual-labs-link')).toHaveTextContent('Try it out');
    expect(screen.queryByText('Free account')).not.toBeInTheDocument();
    expect(screen.getByText(/100 initial credits included/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('takes signed-in users back to Virtual Labs without prompting them to register or log in', () => {
    const { rerender } = render(<Homepage year={2026} isAuthenticated />);
    const accountActions = screen.getAllByRole('link', { name: /^Open Virtual Labs(?: ↗)?$/ });
    expect(accountActions).toHaveLength(3);
    for (const action of accountActions) {
      expect(action).toHaveAttribute('href', '/app/virtual-lab/sync');
    }
    expect(screen.queryByRole('link', { name: 'Log in ↗' })).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('site-header')).getByTestId('header-desktop-link-app-virtual-lab')
    ).toHaveAttribute('href', '/app/virtual-lab/sync');
    expect(screen.queryByRole('link', { name: 'Sign up' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Try it out' })).not.toBeInTheDocument();
    expect(screen.queryByText('Sign in or create a free account')).not.toBeInTheDocument();
    expect(screen.queryByText(/100 initial credits included/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Open your Virtual Lab' })).toBeInTheDocument();
    expect(screen.getByText('Welcome back. Continue your research.')).toBeInTheDocument();

    rerender(<Homepage year={2026} isAuthenticated={false} />);
    expect(screen.getAllByRole('link', { name: 'Try it out' })).toHaveLength(2);
    expect(
      screen.queryByRole('link', { name: /^Open Virtual Labs(?: ↗)?$/ })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute(
      'href',
      '/app/virtual-lab/sync'
    );
    expect(screen.queryByText('Sign in or create a free account')).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('link', { name: 'Features' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('starts with Models and replaces the main headline as the carousel advances', () => {
    render(<Homepage year={2026} />);
    const models = screen.getByLabelText(/Animated overview of brain models/);
    expect(models.tagName).toBe('VIDEO');
    expect(models).toHaveAttribute('src', '/images/homepage/models-overview.mp4');
    expect(models).toHaveAttribute('autoplay');
    expect(models).toHaveAttribute('playsinline');
    expect(models).not.toHaveAttribute('controls');
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Explore brain data. Build models. Run simulations.',
      })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show cells detail' })).not.toBeInTheDocument();
    for (let count = 0; count < 4; count += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Next detail' }));
    }
    expect(
      screen.getByRole('img', { name: /Animated electron microscopy cell mesh/ })
    ).toHaveAttribute('src', '/images/homepage/em-cell-mesh.webp');
    expect(screen.queryByRole('button', { name: 'Show circuit detail' })).not.toBeInTheDocument();
    expect(document.querySelector('video')).not.toBeInTheDocument();
    const tour = screen.getByRole('region', { name: 'Inside Virtual Labs: platform tour' });
    expect(within(tour).queryByText('Take a closer look')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Try it out' })).toHaveLength(2);
    expect(within(tour).queryByRole('heading')).not.toBeInTheDocument();
    const caption = document.getElementById('tour-caption');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Skeletonize electron microscopy data.' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Explore brain data. Build models. Run simulations.' })
    ).not.toBeInTheDocument();
    expect(
      within(caption!).getByText(
        'Turn detailed cell meshes into neuronal skeletons for analysis and modeling.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/Bring your next neuroscience question/)).not.toBeInTheDocument();
    expect(
      within(tour).queryByRole('button', { name: /Play platform tour|Pause platform tour/ })
    ).not.toBeInTheDocument();
  });
});

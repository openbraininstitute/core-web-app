import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Homepage from './homepage';

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('public homepage', () => {
  it('docks after the hero leaves the screen and floats again when it returns', () => {
    let heroBottom = 720;
    const callbacks = new Map<Element, IntersectionObserverCallback>();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({ bottom: heroBottom }) as DOMRect
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(private callback: IntersectionObserverCallback) {}
        observe(target: Element) {
          callbacks.set(target, this.callback);
        }
        disconnect() {}
      }
    );
    render(<Homepage year={2026} />);
    const header = screen.getByTestId('site-header');
    const hero = document.querySelector('main > div')!;
    expect(header).toHaveAttribute('data-docked', 'false');

    heroBottom = -1;
    act(() => callbacks.get(hero)?.([], {} as IntersectionObserver));
    expect(header).toHaveAttribute('data-docked', 'true');

    heroBottom = 300;
    act(() => callbacks.get(hero)?.([], {} as IntersectionObserver));
    expect(header).toHaveAttribute('data-docked', 'false');
  });

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
    const accountActions = screen.getAllByRole('link', { name: 'Try it now' });
    expect(accountActions).toHaveLength(2);
    for (const action of accountActions) {
      expect(action).toHaveAttribute('href', '/app/virtual-lab/sync');
    }
    expect(
      screen.queryByRole('link', { name: /^Open Virtual Labs(?: ↗)?$/ })
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('virtual-labs-link')).toHaveTextContent('Try it now');
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
    expect(screen.queryByRole('link', { name: 'Try it now' })).not.toBeInTheDocument();
    expect(screen.queryByText('Sign in or create a free account')).not.toBeInTheDocument();
    expect(screen.queryByText(/100 initial credits included/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Open your Virtual Lab' })).toBeInTheDocument();
    expect(screen.getByText('Welcome back. Continue your research.')).toBeInTheDocument();
    expect(screen.getByText('Neuroscience at the speed of thought')).toBeInTheDocument();

    rerender(<Homepage year={2026} isAuthenticated={false} />);
    expect(screen.getAllByRole('link', { name: 'Try it now' })).toHaveLength(2);
    expect(
      screen.queryByRole('link', { name: /^Open Virtual Labs(?: ↗)?$/ })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute(
      'href',
      '/app/virtual-lab/sync'
    );
    expect(screen.queryByText('Sign in or create a free account')).not.toBeInTheDocument();
    expect(screen.getByText('Neuroscience at the speed of thought')).toBeInTheDocument();
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

  it('keeps the tagline prominent and uses feature headlines with one hero account action', () => {
    render(<Homepage year={2026} />);
    const heading = screen.getByTestId('home-hero-heading');
    expect(heading).toHaveAttribute('aria-label', 'Explore data. Build models. Run simulations.');
    expect(screen.getByLabelText(/Animated overview of brain models/)).toHaveAttribute(
      'src',
      '/images/homepage/models-overview.mp4'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Build & simulate' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute(
      'aria-label',
      'Bring your models into Virtual Labs.'
    );
    expect(screen.getByText('Neuroscience at the speed of thought')).toBeInTheDocument();
    expect(
      screen.getByText('Bring published or your own models into the platform.')
    ).toBeInTheDocument();
    const tour = screen.getByRole('region', { name: 'Inside Virtual Labs: platform tour' });
    expect(within(tour).getAllByRole('link', { name: 'Try it now' })).toHaveLength(1);
    expect(within(tour).queryByRole('link', { name: /Discover/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Your virtual lab for neuroscience.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Explore' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute(
      'aria-label',
      'Explore data. Build models. Run simulations.'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Skeletonize' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute(
      'aria-label',
      'Turn EM meshes into neuronal skeletons.'
    );
  });
});

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ID_MENU } from '@/ui/segments/landing/constants';
import { EnumSection } from '@/ui/segments/landing/sections/sections';

import Menu from './menu';

afterEach(() => vi.restoreAllMocks());

const sections = [
  ['Features', EnumSection.Features, '/features'],
  ['Pricing', EnumSection.Pricing, '/pricing'],
  ['News', EnumSection.News, '/news'],
  ['About', EnumSection.About, '/about'],
  ['Contact', EnumSection.Contact, '/contact'],
] as const;

describe('shared public navigation', () => {
  it.each(
    sections
  )('keeps the same links on %s and identifies the current page', (name, section, href) => {
    render(<Menu section={section} />);
    const header = screen.getByTestId('site-header');
    expect(header).toHaveAttribute('id', ID_MENU);
    const nav = within(header).getByRole('navigation', { name: 'Main navigation' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent)
    ).toEqual(['Features', 'Pricing', 'News', 'About', 'Contact', 'Sign up']);
    expect(within(nav).getByRole('link', { name })).toHaveAttribute('href', href);
    expect(within(nav).getByRole('link', { current: 'page' })).toHaveTextContent(name);
    expect(within(header).getByRole('img', { name: 'Open Brain Institute' })).toHaveAttribute(
      'src',
      '/images/obi_logo.svg'
    );
    expect(within(nav).getByRole('link', { name: 'Sign up' })).toHaveAttribute(
      'href',
      '/app/virtual-lab/sync'
    );
  });

  it('keeps the returning-user entry and mobile interactions on inner pages', () => {
    render(<Menu section={EnumSection.Pricing} isAuthenticated />);
    expect(screen.getByRole('link', { name: 'Open Virtual Labs' })).toHaveAttribute(
      'href',
      '/app/virtual-lab/sync'
    );
    expect(screen.queryByRole('link', { name: 'Sign up' })).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Open navigation' });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(screen.getByRole('navigation'), { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('link', { name: 'Pricing' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('docks on scrolling inner pages and stays visible while scrolling down', () => {
    const scroll = vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0);
    render(<Menu section={EnumSection.News} />);
    const header = screen.getByTestId('site-header');
    expect(header).toHaveAttribute('data-docked', 'false');
    scroll.mockReturnValue(100);
    act(() => fireEvent.scroll(window));
    expect(header).toHaveAttribute('data-docked', 'true');
    expect(header).not.toHaveStyle({ transform: 'translateY(-100%)' });
    scroll.mockReturnValue(0);
    act(() => fireEvent.scroll(window));
    expect(header).toHaveAttribute('data-docked', 'false');
  });
});

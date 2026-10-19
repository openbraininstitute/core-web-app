import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// next/link needs the app-router context in isolation; render a plain anchor instead.
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { BreadcrumbChip, BreadcrumbTrail } from '@/ui/molecules/breadcrumb';

describe('BreadcrumbTrail', () => {
  it('renders an accessible nav > ol > li trail with the last item as the current page', () => {
    const onBack = vi.fn();
    render(
      <BreadcrumbChip>
        <BreadcrumbTrail
          items={[
            { key: 'a', label: 'Home', href: '/home' },
            { key: 'b', label: 'Back', onClick: onBack },
            { key: 'c', label: 'Here' },
          ]}
        />
        <button type="button">action</button>
      </BreadcrumbChip>
    );

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const list = within(nav).getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/home');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledOnce();

    const current = nav.querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('Here');

    // separators are decorative, and trailing actions sit after the trail in the chip
    expect(
      nav.querySelectorAll('[data-slot="breadcrumb-separator"][aria-hidden="true"]')
    ).toHaveLength(2);
    expect(nav.nextElementSibling).toBe(screen.getByRole('button', { name: 'action' }));
  });

  it('does not mark a plain non-current item as the current page', () => {
    render(
      <BreadcrumbTrail
        items={[
          { key: 'a', label: 'Plain' },
          { key: 'b', label: 'Last' },
        ]}
      />
    );
    expect(screen.getByText('Plain')).not.toHaveAttribute('aria-current');
    expect(screen.getByText('Last')).toHaveAttribute('aria-current', 'page');
  });

  it('puts a copy button next to a single entity and a per-entity menu on a multiple one', () => {
    const { rerender } = render(
      <BreadcrumbTrail
        items={[
          { key: 'a', label: 'Simulate', href: '/s' },
          { key: 'b', label: 'Me', copy: { value: 'id-1', label: 'Copy Me ID' } },
        ]}
      />
    );
    expect(screen.getByRole('button', { name: 'Copy Me ID' })).toBeInTheDocument();

    rerender(
      <BreadcrumbTrail
        items={[
          { key: 'a', label: 'Simulate', href: '/s' },
          {
            key: 'b',
            label: 'Multiple entities (2)',
            menu: [
              { key: '1', label: 'One', copy: { value: 'id-1', label: 'Copy One ID' } },
              { key: '2', label: 'Two', copy: { value: 'id-2', label: 'Copy Two ID' } },
            ],
          },
        ]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Multiple entities \(2\)/ }));
    expect(screen.getByRole('button', { name: 'Copy One ID' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy Two ID' })).toBeInTheDocument();
  });

  it('keeps a linked last item navigable while marking it current', () => {
    render(
      <BreadcrumbTrail
        items={[
          { key: 'a', label: 'Data' },
          { key: 'b', label: 'Type', href: '/t' },
        ]}
      />
    );
    expect(screen.getByRole('link', { name: 'Type' })).toHaveAttribute('aria-current', 'page');
  });
});

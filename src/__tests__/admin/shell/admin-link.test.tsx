import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminLink, adminHref } from '@/admin/shell/admin-link';

describe('adminHref', () => {
  it.each([
    ['vlab', '/app/admin/virtual-labs/a%2Fb'],
    ['project', '/app/admin/projects/a%2Fb'],
    ['user', '/app/admin/users/a%2Fb'],
  ] as const)('routes a %s and encodes its id', (kind, href) => {
    expect(adminHref(kind, 'a/b')).toBe(href);
  });
});

describe('AdminLink', () => {
  it('shortens an id with no label and keeps the whole id on hover', () => {
    render(<AdminLink kind="user" id="0123456789abcdef" />);
    const link = screen.getByRole('link', { name: '01234567…' });
    expect(link.getAttribute('title')).toBe('0123456789abcdef');
  });

  it('renders a dash rather than a dead link when there is no id', () => {
    render(<AdminLink kind="vlab" id={null} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('—')).toBeTruthy();
  });
});

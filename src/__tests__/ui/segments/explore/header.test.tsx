import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DataHeader } from '@/ui/segments/explore/header';

const route = vi.hoisted(() => ({ params: {} as { type?: string } }));

vi.mock('next/navigation', () => ({
  useParams: () => route.params,
  usePathname: () => '/app/virtual-lab/vl/pr/data',
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/ui/hooks/use-scope', () => ({
  useScope: () => ({ scope: 'public', changeScope: vi.fn() }),
}));
vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl', projectId: 'pr' }),
}));
vi.mock('@/ui/hooks/create-break-point', () => ({ useDefaultBreakpoint: () => 'xl' }));
vi.mock('@/ui/segments/mini-detail-view/event', () => ({
  makeSelectEntityClickEvent: vi.fn(),
  useMiniDetailView: () => ({ setMdv: vi.fn() }),
}));
vi.mock('@/ui/segments/shared/scope-selector', () => ({
  TabsSelector: () => <div data-testid="scope-tabs" />,
}));

afterEach(() => {
  route.params = {};
});

describe('DataHeader', () => {
  it.each([
    ['before an entity type is picked', {}],
    ['on a Data table', { type: 'cell-morphology' }],
  ])('shows Upload and no Public / Project tabs %s', (_, params) => {
    route.params = params;
    render(<DataHeader />);
    expect(screen.queryByTestId('scope-tabs')).toBeNull();
    expect(screen.getByTestId('upload-data-selector')).toBeTruthy();
  });
});

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DataViewNotFound from '@/app/app/virtual-lab/[virtualLabId]/[projectId]/data/view/not-found';
import WorkflowViewNotFound from '@/app/app/virtual-lab/[virtualLabId]/[projectId]/workflows/(data)/view/not-found';

const VLAB = '11111111-1111-1111-1111-111111111111';
const PROJECT = '22222222-2222-2222-2222-222222222222';
const base = `/app/virtual-lab/${VLAB}/${PROJECT}`;

const replace = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useParams: () => ({ virtualLabId: VLAB, projectId: PROJECT }),
  useRouter: () => ({ replace }),
}));

beforeEach(() => {
  replace.mockClear();
});

describe('data view not-found boundary', () => {
  it('shows the notice and redirects to the data listing of the current workspace', () => {
    render(<DataViewNotFound />);

    expect(screen.getByTestId('workspace-not-found-redirect')).toHaveTextContent(
      'Taking you back to Data'
    );
    expect(replace).toHaveBeenCalledWith(`${base}/data`);
  });
});

describe('workflow view not-found boundary', () => {
  it('shows the notice and redirects to the workflows home of the current workspace', () => {
    render(<WorkflowViewNotFound />);

    expect(screen.getByTestId('workspace-not-found-redirect')).toHaveTextContent(
      'Taking you back to Workflows'
    );
    expect(replace).toHaveBeenCalledWith(`${base}/workflows`);
  });
});

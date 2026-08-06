import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GoToProjectLink } from '@/ui/segments/workspaces/space-manager/go-to-project-link';

const SOURCE_VLAB = '11111111-1111-1111-1111-111111111111';
const SOURCE_PROJECT = '22222222-2222-2222-2222-222222222222';
const TARGET_VLAB = '33333333-3333-3333-3333-333333333333';
const TARGET_PROJECT = '44444444-4444-4444-4444-444444444444';

const sourceBase = `/app/virtual-lab/${SOURCE_VLAB}/${SOURCE_PROJECT}`;
const targetBase = `/app/virtual-lab/${TARGET_VLAB}/${TARGET_PROJECT}`;

const navigation = vi.hoisted(() => ({
  pathname: '',
  search: '',
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

/** Simulates the user being on a given page of the source workspace. */
function visit(pathAfterWorkspace: string, search = '') {
  navigation.pathname = `${sourceBase}${pathAfterWorkspace}`;
  navigation.search = search;
}

function renderLink(onNavigate?: () => void) {
  render(
    <GoToProjectLink
      targetVirtualLabId={TARGET_VLAB}
      targetProjectId={TARGET_PROJECT}
      onNavigate={onNavigate}
    />
  );
  return screen.getByTestId('workspace-manager-go-to-project-link');
}

beforeEach(() => {
  visit('');
});

describe('GoToProjectLink / data pages', () => {
  it('keeps the user on the same browse listing with species and scope selection', () => {
    visit('/data/browse/entity/circuit', 'scope=project&group=model&s=focused&h_id=hier-1');

    expect(renderLink()).toHaveAttribute(
      'href',
      `${targetBase}/data/browse/entity/circuit?scope=project&group=model&s=focused&h_id=hier-1`
    );
  });

  it('sends a detail view to the browse listing of the same type', () => {
    visit('/data/view/circuit/abc-123/overview', 'scope=project');

    expect(renderLink()).toHaveAttribute(
      'href',
      `${targetBase}/data/browse/entity/circuit?scope=project`
    );
  });
});

describe('GoToProjectLink / notebooks pages', () => {
  it.each(['public', 'private'])('keeps the user on the %s notebooks tab', (scope) => {
    visit(`/notebooks/${scope}`);

    expect(renderLink()).toHaveAttribute('href', `${targetBase}/notebooks/${scope}`);
  });

  it('does not carry the upload trigger over', () => {
    visit('/notebooks/private', 'upload=true');

    expect(renderLink()).toHaveAttribute('href', `${targetBase}/notebooks/private`);
  });

  it('keeps nested notebook detail pages', () => {
    visit('/notebooks/public/some-notebook-id');

    expect(renderLink()).toHaveAttribute('href', `${targetBase}/notebooks/public/some-notebook-id`);
  });
});

describe('GoToProjectLink / reports pages', () => {
  it('keeps the reports section', () => {
    visit('/reports', 'section=summaries');

    expect(renderLink()).toHaveAttribute('href', `${targetBase}/reports?section=summaries`);
  });

  it('keeps an obi-showcase detail page', () => {
    visit('/reports/obi-showcase/my-slug', 'section=artifacts');

    expect(renderLink()).toHaveAttribute(
      'href',
      `${targetBase}/reports/obi-showcase/my-slug?section=artifacts`
    );
  });
});

describe('GoToProjectLink / workflows pages', () => {
  it('keeps the workflows home selection', () => {
    visit('/workflows', 'activity=simulate&type=memodel');

    expect(renderLink()).toHaveAttribute(
      'href',
      `${targetBase}/workflows?activity=simulate&type=memodel`
    );
  });

  it.each([
    'build',
    'simulate',
    'extract',
    'process',
  ])('keeps the %s /new selection page with its scope tab', (activity) => {
    visit(`/workflows/${activity}/new/circuit`, 'scope=project');

    expect(renderLink()).toHaveAttribute(
      'href',
      `${targetBase}/workflows/${activity}/new/circuit?scope=project`
    );
  });

  it('restarts a session-based configure page at its /new page', () => {
    visit('/workflows/build/configure/memodel/wf_abc1234567', 'scope=public');

    expect(renderLink()).toHaveAttribute(
      'href',
      `${targetBase}/workflows/build/new/memodel?scope=public`
    );
  });

  it('restarts a legacy configure page at its /new page without the session param', () => {
    visit('/workflows/process/configure/circuit/abc-entity-id', 'session=wf_abc1234567');

    expect(renderLink()).toHaveAttribute('href', `${targetBase}/workflows/process/new/circuit`);
  });

  it('restarts a static configure page at its /new page', () => {
    visit('/workflows/simulate/configure/ion-channel-model-simulation', 'session=wf_abc1234567');

    expect(renderLink()).toHaveAttribute(
      'href',
      `${targetBase}/workflows/simulate/new/ion-channel-model-simulation`
    );
  });

  it('sends a run view back to the workflows home', () => {
    visit('/workflows/view/simulation-campaign/run-uuid/results');

    expect(renderLink()).toHaveAttribute('href', `${targetBase}/workflows`);
  });
});

describe('GoToProjectLink / other pages', () => {
  it.each(['', '/team', '/help'])('sends "%s" to the target project home', (path) => {
    visit(path);

    expect(renderLink()).toHaveAttribute('href', targetBase);
  });

  it('notifies onNavigate when the link is clicked (recent-workspace tracking)', () => {
    visit('/data/browse/entity/circuit', 'scope=public');
    const onNavigate = vi.fn();

    const link = renderLink(onNavigate);
    fireEvent.click(link);

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});

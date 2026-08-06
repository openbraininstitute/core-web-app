import { describe, expect, it } from 'vitest';

import { buildWorkspaceSwitchUrl } from '@/utils/workspace-switch-url';

const SOURCE_VLAB = '11111111-1111-1111-1111-111111111111';
const SOURCE_PROJECT = '22222222-2222-2222-2222-222222222222';
const TARGET_VLAB = '33333333-3333-3333-3333-333333333333';
const TARGET_PROJECT = '44444444-4444-4444-4444-444444444444';

const sourceBase = `/app/virtual-lab/${SOURCE_VLAB}/${SOURCE_PROJECT}`;
const targetBase = `/app/virtual-lab/${TARGET_VLAB}/${TARGET_PROJECT}`;

function build(pathAfterWorkspace: string, search = '') {
  return buildWorkspaceSwitchUrl({
    pathname: `${sourceBase}${pathAfterWorkspace}`,
    searchParams: search,
    targetVirtualLabId: TARGET_VLAB,
    targetProjectId: TARGET_PROJECT,
  });
}

describe('buildWorkspaceSwitchUrl / data', () => {
  it('preserves the browse listing with scope, group and species selection', () => {
    expect(
      build(
        '/data/browse/entity/circuit',
        'scope=project&group=model&s=focused&h_id=hier-1&br_id=region-9'
      )
    ).toBe(
      `${targetBase}/data/browse/entity/circuit?scope=project&group=model&s=focused&h_id=hier-1&br_id=region-9`
    );
  });

  it('strips query params outside the data allowlist', () => {
    expect(build('/data/browse/entity/cell-morphology', 'scope=public&foo=1&page=3')).toBe(
      `${targetBase}/data/browse/entity/cell-morphology?scope=public`
    );
  });

  it('collapses a detail view to the browse listing of the same type', () => {
    expect(build('/data/view/circuit/abc-123/overview', 'scope=project')).toBe(
      `${targetBase}/data/browse/entity/circuit?scope=project`
    );
  });

  it('preserves the bare data page', () => {
    expect(build('/data')).toBe(`${targetBase}/data`);
  });

  it('collapses a type-less view path to the data root', () => {
    expect(build('/data/view', 'scope=public')).toBe(`${targetBase}/data?scope=public`);
  });
});

describe('buildWorkspaceSwitchUrl / notebooks', () => {
  it('preserves the notebooks scope segment', () => {
    expect(build('/notebooks/private')).toBe(`${targetBase}/notebooks/private`);
    expect(build('/notebooks/public')).toBe(`${targetBase}/notebooks/public`);
  });

  it('strips the upload trigger param', () => {
    expect(build('/notebooks/private', 'upload=true')).toBe(`${targetBase}/notebooks/private`);
  });

  it('preserves nested notebook detail paths generically', () => {
    expect(build('/notebooks/public/some-notebook-id', 'scope=public')).toBe(
      `${targetBase}/notebooks/public/some-notebook-id?scope=public`
    );
  });
});

describe('buildWorkspaceSwitchUrl / reports', () => {
  it('preserves the reports page with its section param', () => {
    expect(build('/reports', 'section=summaries')).toBe(`${targetBase}/reports?section=summaries`);
  });

  it('preserves an obi-showcase detail page', () => {
    expect(build('/reports/obi-showcase/my-slug', 'section=artifacts')).toBe(
      `${targetBase}/reports/obi-showcase/my-slug?section=artifacts`
    );
  });
});

describe('buildWorkspaceSwitchUrl / workflows', () => {
  it('preserves the workflows home with activity/type selection', () => {
    expect(build('/workflows', 'activity=simulate&type=memodel&extra=x')).toBe(
      `${targetBase}/workflows?activity=simulate&type=memodel`
    );
  });

  it('preserves a /new selection page keeping only the scope', () => {
    expect(build('/workflows/simulate/new/circuit', 'scope=project&panel=details')).toBe(
      `${targetBase}/workflows/simulate/new/circuit?scope=project`
    );
  });

  it('remaps a session-based configure page to its /new page', () => {
    expect(build('/workflows/build/configure/memodel/wf_abc1234567', 'scope=public')).toBe(
      `${targetBase}/workflows/build/new/memodel?scope=public`
    );
  });

  it('remaps a legacy entity-id configure page to its /new page dropping the session param', () => {
    expect(
      build('/workflows/process/configure/circuit/abc-entity-id', 'session=wf_abc1234567')
    ).toBe(`${targetBase}/workflows/process/new/circuit`);
  });

  it('remaps a static configure page (no id segment) to its /new page', () => {
    expect(
      build('/workflows/simulate/configure/ion-channel-model-simulation', 'session=wf_abc1234567')
    ).toBe(`${targetBase}/workflows/simulate/new/ion-channel-model-simulation`);
  });

  it('sends run/detail views back to the workflows home', () => {
    expect(build('/workflows/view/simulation-campaign/run-uuid/results')).toBe(
      `${targetBase}/workflows`
    );
  });

  it('sends unrecognized workflow paths back to the workflows home', () => {
    expect(build('/workflows/simulate/unknown', 'scope=project')).toBe(`${targetBase}/workflows`);
  });
});

describe('buildWorkspaceSwitchUrl / fallbacks', () => {
  it.each(['', '/team', '/help'])('sends "%s" to the target project home', (path) => {
    expect(build(path)).toBe(targetBase);
  });

  it.each([
    '/app/virtual-lab',
    // not anchored at the workspace root: must not be mistaken for a workspace path
    `/app/entity/some-id`,
    `/foo/app/virtual-lab/${SOURCE_VLAB}/${SOURCE_PROJECT}/data`,
  ])('sends the non-workspace path "%s" to the target project home', (pathname) => {
    expect(
      buildWorkspaceSwitchUrl({
        pathname,
        searchParams: '',
        targetVirtualLabId: TARGET_VLAB,
        targetProjectId: TARGET_PROJECT,
      })
    ).toBe(targetBase);
  });

  it('handles trailing slashes', () => {
    expect(build('/data/browse/entity/circuit/', 'scope=public')).toBe(
      `${targetBase}/data/browse/entity/circuit?scope=public`
    );
  });

  it('accepts URLSearchParams and "?"-prefixed strings', () => {
    expect(
      buildWorkspaceSwitchUrl({
        pathname: `${sourceBase}/notebooks/private`,
        searchParams: new URLSearchParams({ scope: 'project' }),
        targetVirtualLabId: TARGET_VLAB,
        targetProjectId: TARGET_PROJECT,
      })
    ).toBe(`${targetBase}/notebooks/private?scope=project`);

    expect(build('/reports', '?section=summaries')).toBe(`${targetBase}/reports?section=summaries`);
  });
});

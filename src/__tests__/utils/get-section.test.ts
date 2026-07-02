import { describe, expect, it } from 'vitest';

import { WorkspaceMainPages } from '@/constants';
import { getActiveSection, getPreservedProjectSection } from '@/utils/get-section';

const VLAB = '11111111-1111-1111-1111-111111111111';
const PROJECT = '22222222-2222-2222-2222-222222222222';
const base = `/app/virtual-lab/${VLAB}/${PROJECT}`;

describe('getActiveSection', () => {
  it('returns the first segment after the workspace ids', () => {
    expect(getActiveSection(`${base}/data/morphology/123`)).toBe('data');
    expect(getActiveSection(`${base}/workflows`)).toBe('workflows');
  });

  it('returns an empty string on the project home', () => {
    expect(getActiveSection(base)).toBe('');
  });
});

describe('getPreservedProjectSection', () => {
  it.each(Object.values(WorkspaceMainPages))('preserves the %s main page', (section) => {
    expect(getPreservedProjectSection(`${base}/${section}`)).toBe(section);
  });

  it('collapses nested paths to their parent page', () => {
    expect(getPreservedProjectSection(`${base}/data/morphology/123`)).toBe('data');
    expect(getPreservedProjectSection(`${base}/notebooks/project/my-notebook`)).toBe('notebooks');
  });

  it('returns null for the project home and non-persistent sections', () => {
    expect(getPreservedProjectSection(base)).toBeNull();
    expect(getPreservedProjectSection(`${base}/team`)).toBeNull();
    expect(getPreservedProjectSection(`${base}/help`)).toBeNull();
  });

  it('returns null outside a workspace route', () => {
    expect(getPreservedProjectSection('/app/virtual-lab')).toBeNull();
  });
});

import { describe, expect, it, vi } from 'vitest';

import {
  isTargetableSectionType,
  sectionTypeLabel,
} from '@/features/scan-config/components/circuit-viz/section-type-label';
import { MorphoViewerTreeItemType } from '@/features/scan-config/types';

// The viewer barrel pulls in tgd, which touches `document` at module scope.
vi.mock('@/morpho-viewer', async () => ({
  MorphoViewerTreeItemType: (await import('@/features/scan-config/types')).MorphoViewerTreeItemType,
}));

describe('isTargetableSectionType', () => {
  it('accepts the dendrite types a location may sit on', () => {
    expect(isTargetableSectionType(MorphoViewerTreeItemType.BasalDendrite)).toBe(true);
    expect(isTargetableSectionType(MorphoViewerTreeItemType.ApicalDendrite)).toBe(true);
    expect(isTargetableSectionType(MorphoViewerTreeItemType.Dendrite)).toBe(true);
  });

  it('rejects the types picking does not support yet', () => {
    // The hover popover gates its "Click to add" prompt on this, so a type accepted here but
    // refused by `onPick` would promise a click that silently does nothing.
    expect(isTargetableSectionType(MorphoViewerTreeItemType.Soma)).toBe(false);
    expect(isTargetableSectionType(MorphoViewerTreeItemType.Axon)).toBe(false);
    expect(isTargetableSectionType(MorphoViewerTreeItemType.Myelin)).toBe(false);
  });

  it('rejects a section whose type the viewer did not report', () => {
    expect(isTargetableSectionType(undefined)).toBe(false);
  });
});

describe('sectionTypeLabel', () => {
  it('names the types it knows', () => {
    expect(sectionTypeLabel(MorphoViewerTreeItemType.Axon)).toBe('Axon');
    expect(sectionTypeLabel(MorphoViewerTreeItemType.BasalDendrite)).toBe('Basal dendrite');
  });

  it('omits a label rather than saying "Unknown"', () => {
    expect(sectionTypeLabel(MorphoViewerTreeItemType.Unknown)).toBeUndefined();
    expect(sectionTypeLabel(undefined)).toBeUndefined();
  });
});

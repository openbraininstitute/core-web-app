import { describe, expect, it } from 'vitest';

import { SectionType } from '@/features/circuit-viewer/section-type';
import {
  isTargetableSectionType,
  sectionTypeLabel,
} from '@/features/scan-config/components/circuit-viz/section-type-label';

describe('isTargetableSectionType', () => {
  it('accepts the dendrite types a location may sit on', () => {
    expect(isTargetableSectionType(SectionType.BasalDendrite)).toBe(true);
    expect(isTargetableSectionType(SectionType.ApicalDendrite)).toBe(true);
    expect(isTargetableSectionType(SectionType.Dendrite)).toBe(true);
  });

  it('rejects the types picking does not support yet', () => {
    // The hover popover gates its "Click to add" prompt on this, so a type accepted here but
    // refused by `onPick` would promise a click that silently does nothing.
    expect(isTargetableSectionType(SectionType.Soma)).toBe(false);
    expect(isTargetableSectionType(SectionType.Axon)).toBe(false);
    expect(isTargetableSectionType(SectionType.Myelin)).toBe(false);
  });

  it('rejects a section whose type the viewer did not report', () => {
    expect(isTargetableSectionType(undefined)).toBe(false);
  });
});

describe('sectionTypeLabel', () => {
  it('names the types it knows', () => {
    expect(sectionTypeLabel(SectionType.Axon)).toBe('Axon');
    expect(sectionTypeLabel(SectionType.BasalDendrite)).toBe('Basal dendrite');
  });

  it('omits a label rather than saying "Unknown"', () => {
    expect(sectionTypeLabel(SectionType.Unknown)).toBeUndefined();
    expect(sectionTypeLabel(undefined)).toBeUndefined();
  });
});

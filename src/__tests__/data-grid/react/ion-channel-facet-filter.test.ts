import { describe, expect, it } from 'vitest';

import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';
import { ionChannelRecordingSchema } from '@/features/data-grid/bindings/entitycore/schemas/ion-channel-recording';
import {
  FilterOptionsKind,
  FilterValueKind,
  OperatorId,
  resolveFilterTargets,
} from '@/features/data-grid/core';
import { stripHtmlTags } from '@/utils/safe-html-markup';

import type { IFacetBucket, IGridQuery, TFilterModel } from '@/features/data-grid/core';

/**
 * `ion_channel` facet buckets label themselves with IUPHAR markup (`K<SUB>v</SUB>10.1`)
 * while the filterable `ion_channel__name` holds the plain form (`Kv10.1`).
 */
const BUCKETS: IFacetBucket[] = [
  { id: 'dbbb1419-ac50-4832-8524-21b2ac3188ee', label: 'K<SUB>v</SUB>10.1', count: 42 },
  { id: '1c944eec-aa07-4b3e-bc63-a7e91c5f0fa4', label: 'K<SUB>v</SUB>1.1', count: 191 },
];

describe('ion channel facet filter', () => {
  const column = ionChannelRecordingSchema.columns.find((c) => c.id === 'ionChannel');

  it('filters on ion_channel__name from the ion_channel facet bucket', () => {
    const [target] = resolveFilterTargets(column!);
    expect(target?.field).toBe('ion_channel__name');
    expect(target?.facetKey).toBe('ion_channel');
    expect(target?.options).toEqual({ kind: FilterOptionsKind.Facets });
    expect(target?.operators[0]).toBe(OperatorId.In);
  });

  it('serializes the picked channels to ion_channel__name__in', () => {
    const filters: TFilterModel = {
      ionChannel: {
        columnId: 'ionChannel',
        operator: OperatorId.In,
        value: {
          kind: FilterValueKind.Set,
          values: BUCKETS.map((b) => stripHtmlTags(b.label)),
        },
      },
    };
    const q: IGridQuery = { page: 1, pageSize: 10, sort: [], filters };
    expect(serializeQuery(q, ionChannelRecordingSchema).ion_channel__name__in).toEqual([
      'Kv10.1',
      'Kv1.1',
    ]);
  });

  it('renders the markup label but keeps the stripped name as the wire value', () => {
    expect(BUCKETS.map((b) => stripHtmlTags(b.label))).toEqual(['Kv10.1', 'Kv1.1']);
    expect(BUCKETS[0].label).toContain('<SUB>');
  });
});

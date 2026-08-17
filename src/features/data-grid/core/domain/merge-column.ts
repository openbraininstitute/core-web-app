import { mergeContextual } from '@/features/data-grid/core/domain/contextual';

import type {
  IColumnFilter,
  IColumnModel,
  IWidthSpec,
} from '@/features/data-grid/core/domain/column-model';

/**
 * A partial override applied on top of a reusable column factory's defaults.
 * Nested `width` and `filter` are themselves partial and deep-merge with the base.
 */
export type TColumnOverride<Row> = Omit<Partial<IColumnModel<Row>>, 'filter' | 'width'> & {
  filter?: Partial<IColumnFilter>;
  width?: Partial<IWidthSpec>;
};

/**
 * Deep-merge a base column definition with per-use overrides. Nested `width`,
 * `filter` and `cellRendererParams` are merged rather than clobbered, and the
 * contextual facets (`available`, `order`, `hiddenByDefault`) compose via
 * {@link mergeContextual} so a schema layers rules onto a catalog default.
 */
export function mergeColumnDef<Row>(
  base: IColumnModel<Row>,
  overrides?: TColumnOverride<Row>
): IColumnModel<Row> {
  if (!overrides) return base;

  const merged: IColumnModel<Row> = {
    ...base,
    ...overrides,
    filter: base.filter,
    width: base.width,
    available: mergeContextual(base.available, overrides.available),
    order: mergeContextual(base.order, overrides.order),
    hiddenByDefault: mergeContextual(base.hiddenByDefault, overrides.hiddenByDefault),
  };

  if (base.width || overrides.width) {
    merged.width = { ...base.width, ...overrides.width };
  }
  if (base.filter || overrides.filter) {
    merged.filter = { ...base.filter, ...overrides.filter } as IColumnFilter;
  }
  if (base.cellRendererParams || overrides.cellRendererParams) {
    merged.cellRendererParams = { ...base.cellRendererParams, ...overrides.cellRendererParams };
  }

  return merged;
}

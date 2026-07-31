import { mergeContextual } from './contextual';

import type { IColumnFilter, IColumnModel, IWidthSpec } from './column-model';

/**
 * A partial override applied on top of a reusable column factory's defaults.
 * Nested `width` and `filter` are themselves partial — they deep-merge with the
 * base. (A partial `filter` on a base without one only makes sense when it carries
 * `operators`; the catalog's factories always declare a full base filter.)
 */
export type TColumnOverride<Row> = Omit<Partial<IColumnModel<Row>>, 'filter' | 'width'> & {
  filter?: Partial<IColumnFilter>;
  width?: Partial<IWidthSpec>;
};

/**
 * Deep-merge a base column definition with per-use overrides. Nested `width`,
 * `filter` and `cellRendererParams` are merged (not clobbered) so a schema can tweak
 * a single facet (e.g. just `width.flex`, or swap a filter's operators) without
 * re-stating the whole column. The contextual facets (`available`, `order`,
 * `hiddenByDefault`) COMPOSE via {@link mergeContextual}: a catalog factory can ship
 * a default rule set that a specific schema layers extra rules onto (its rules win),
 * rather than replacing it wholesale. This is what makes the shared column catalog
 * both reusable and customizable.
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

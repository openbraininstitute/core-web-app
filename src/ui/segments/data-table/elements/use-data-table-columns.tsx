'use client';

import { isString } from 'es-toolkit/compat';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import { fieldsDefinitionRegistry, getFieldDefinition } from '@/entity-configuration/definitions';
import type { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  type OrderShape,
  SortOrder,
  type TSortOrder,
  type TSortState,
} from '@/entity-configuration/definitions/types';
import { ViewsDefinitionRegistry } from '@/entity-configuration/definitions/view-defs';
import { classNames, fieldTitleSentenceCase } from '@/util/utils';

import type { ColumnProps } from 'antd/lib/table';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

import styles from '@/ui/segments/data-table/elements/table.module.css';

type ResizeInit = {
  key: string | null;
  start: number | null;
  startWidth: number | null;
};

const COL_SIZING = {
  min: 75,
  default: 125,
};

/**
 * This fn will get the exact width that the column title must take in the table
 * the returned width will be the Max between the default width and the
 * the width of the sum of the title, the sorting arrows and the unit (if present)
 * @param title string
 * @param unit string
 * @returns number
 */
function getProvisionedWidth(title: ReactNode, unit?: ReactNode) {
  const titleSpan = document.createElement('span');
  titleSpan.textContent = isString(title) ? `${title} ${unit ?? ''}` : '';
  // font-{size/weight} must be the same as the column style
  titleSpan.style.setProperty('font-size', '1rem');
  document.body.appendChild(titleSpan);
  // 56= x-padding (32px) + (sorter icon) 24
  const width = titleSpan.getBoundingClientRect().width + 56;
  document.body.removeChild(titleSpan);
  return width;
}

function isOrderObject(order: OrderShape): order is { property: string; value: string } {
  return !Array.isArray(order);
}

/**
 * Retrieves the order value from the provided order object or array, optionally filtered by data type.
 *
 * @param order - The order information, which can be an `OrderShape` object, an array of order objects, or `undefined`.
 * @param dataType - (Optional) The data type to filter the order by when `order` is an array.
 * @returns The order value as a string if found; otherwise, `undefined`.
 */
export function getOrderValue(
  order: OrderShape | undefined,
  dataType?: TExtendedEntitiesTypeDict
): string | undefined {
  if (!order) return undefined;

  if (isOrderObject(order)) {
    return order.value;
  }

  if (Array.isArray(order)) {
    if (!dataType) return undefined;

    const orderForType = order.find((o) => o.types.includes(dataType));

    if (orderForType) {
      return orderForType.value;
    }
  }
  return undefined;
}

export function useDataTableColumns<T>({
  dataType,
  sortState,
  setSortState,
  initialColumns = [],
}: {
  dataType: TExtendedEntitiesTypeDict;
  setSortState?: (sortState: TSortState) => void;
  sortState?: TSortState;
  initialColumns?: ColumnProps<T>[];
}): ColumnProps<T>[] {
  const keys = useMemo(() => Object.keys(fieldsDefinitionRegistry), []);

  const [columnWidths, setColumnWidths] = useState<{ key: string; width: number }[]>(() =>
    [...keys].map((key) => {
      const field = getFieldDefinition(key as EntityCoreFields);
      return {
        key,
        width: field?.style?.width ?? COL_SIZING.default,
      };
    })
  );

  useEffect(() => {
    const totalKeys = [...keys];
    setColumnWidths(
      totalKeys.map((key) => {
        const field = getFieldDefinition(key as EntityCoreFields);
        return {
          key,
          width: field?.style?.width ?? getProvisionedWidth(field?.title, field?.unit),
        };
      })
    );
  }, [keys]);

  const columnOrderBy = useCallback(
    (field: EntityCoreFields, backendField: EntityCoreFields) => {
      let order: TSortOrder | null = SortOrder.ASC;

      if (sortState?.order && field === sortState.field) {
        order = sortState.order === SortOrder.DESC ? SortOrder.ASC : SortOrder.DESC;
      }

      setSortState?.({
        backendField,
        field,
        order,
      });
    },
    [setSortState, sortState]
  );

  const updateColumnWidths = useCallback((resizeInit: ResizeInit, clientX: number) => {
    const { key, start, startWidth } = resizeInit;

    if (!key || start === null || startWidth === null) return;

    const delta = clientX - start;
    const newWidth = Math.max(startWidth + delta, COL_SIZING.min);

    setColumnWidths((prev) => {
      const colWidthIndex = prev.findIndex(({ key: colKey }) => colKey === key);
      if (colWidthIndex === -1) return prev;

      return [
        ...prev.slice(0, colWidthIndex),
        { key, width: newWidth },
        ...prev.slice(colWidthIndex + 1),
      ];
    });
  }, []);

  const onMouseDown = useCallback(
    (mouseDownEvent: React.MouseEvent<HTMLElement>, key: string) => {
      const { clientX: startX } = mouseDownEvent;

      const th = (mouseDownEvent.target as HTMLElement).closest('th');
      const tableWrapper = th?.closest('.ant-table-wrapper');
      const colIndex = th ? Array.from(th.parentElement?.children || []).indexOf(th) : -1;
      const headerCol = tableWrapper?.querySelector(
        `.ant-table-header colgroup col:nth-child(${colIndex + 1})`
      ) as HTMLElement | null;
      const bodyCol = tableWrapper?.querySelector(
        `.ant-table-body colgroup col:nth-child(${colIndex + 1})`
      ) as HTMLElement | null;

      const currentWidth = th?.getBoundingClientRect().width ?? COL_SIZING.default;

      let finalWidth = currentWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        finalWidth = Math.max(currentWidth + delta, COL_SIZING.min);
        if (headerCol) {
          headerCol.style.width = `${finalWidth}px`;
          headerCol.style.minWidth = `${finalWidth}px`;
        }
        if (bodyCol) {
          bodyCol.style.width = `${finalWidth}px`;
          bodyCol.style.minWidth = `${finalWidth}px`;
        }
        if (th) {
          th.style.width = `${finalWidth}px`;
          th.style.minWidth = `${finalWidth}px`;
        }
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        updateColumnWidths(
          { key, start: startX, startWidth: currentWidth },
          startX + (finalWidth - currentWidth)
        );
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp, { once: true });
    },
    [updateColumnWidths]
  );

  const getOrderDirection = useCallback(
    (key: string) => {
      switch (sortState?.order) {
        case SortOrder.ASC:
          return sortState?.field === key ? 'ascend' : undefined;
        case SortOrder.DESC:
          return sortState?.field === key ? 'descend' : undefined;
        default:
          return undefined;
      }
    },
    [sortState?.field, sortState?.order]
  );

  const columns: ColumnProps<T>[] = useMemo(
    () =>
      keys.reduce((acc, key) => {
        const term = getFieldDefinition(key as EntityCoreFields);
        const isSortable = term?.isSortable && !!getOrderValue(term?.order, dataType);

        acc.push({
          key,
          title: (
            <div className="flex flex-col text-left" style={{ marginTop: '-2px' }}>
              <div className={styles.columnTitle}>{fieldTitleSentenceCase(term?.title!)}</div>
              {term?.unit &&
                dataType !== ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection && (
                  <span className={styles.tableHeaderUnits}>[{term?.unit}]</span>
                )}
            </div>
          ),
          className: classNames(
            'text-primary-7 cursor-pointer before:!content-none',
            term?.className
          ),
          sorter: isSortable,
          ellipsis: true,
          width: columnWidths.find(({ key: colKey }) => colKey === key)?.width,
          render: (_, r, i) => term?.render?.(r as EntityCoreIdentifiable, i),
          onHeaderCell: () => {
            const currentWidth =
              columnWidths.find(({ key: colKey }) => colKey === key)?.width ?? COL_SIZING.default;
            return {
              columnWidth: currentWidth,
              handleResizing: (e: React.MouseEvent<HTMLElement>) => onMouseDown(e, key),
              onClick: () => {
                if (!isSortable || !term.order) return;
                const field = getOrderValue(term.order, dataType);
                if (field) {
                  columnOrderBy(key as EntityCoreFields, field as EntityCoreFields);
                }
              },
              showsortertooltip: {
                title: term?.description ? term.description : term?.title,
              },
            };
          },
          defaultSortOrder: 'descend',
          sortOrder: getOrderDirection(key),
          sortDirections: ['ascend', 'descend', 'descend'],
          align: term?.style?.align,
        });
        return acc;
      }, initialColumns),
    [columnWidths, initialColumns, keys, onMouseDown, columnOrderBy, getOrderDirection, dataType]
  );

  if (dataType) {
    return columns.sort((a, b) => {
      const defs = ViewsDefinitionRegistry[dataType];
      if (!defs) {
        throw new Error('Unable to display the table! Please contact support.', {
          cause: `Cannot find any item in ViewsDefinitionRegistry for dataType "${dataType}"!`,
        });
      }

      return a.key && b.key
        ? defs.columns.indexOf(a.key as EntityCoreFields) -
            defs.columns.indexOf(b.key as EntityCoreFields)
        : -1;
    });
  }

  return columns;
}

export default useDataTableColumns;

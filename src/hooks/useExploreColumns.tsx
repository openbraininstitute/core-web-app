'use client';

import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { ColumnProps } from 'antd/lib/table';
import isString from 'es-toolkit/compat/isString';
import throttle from 'es-toolkit/compat/throttle';

import { fieldsDefinitionRegistry, getFieldDefinition } from 'src/entity-configuration/definitions';

import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { ViewsDefinitionRegistry } from '@/entity-configuration/definitions/view-defs';
import { classNames, fieldTitleSentenceCase } from '@/util/utils';

import {
  ExtendedEntitiesTypeDict,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import type { OrderShape } from '@/entity-configuration/definitions/types';
import type { SortState } from '@/types/explore-section/application';

import styles from '@/ui/segments/data-table/styles.module.css';

type ResizeInit = {
  key: string | null;
  start: number | null;
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

export function useExploreColumns<T>(
  setSortState?: (sortState: SortState) => void,
  sortState?: SortState,
  initialColumns: ColumnProps<T>[] = [],
  dataType?: TExtendedEntitiesTypeDict
): ColumnProps<T>[] {
  const keys = useMemo(() => Object.keys(fieldsDefinitionRegistry), []);

  const [columnWidths, setColumnWidths] = useState<{ key: string; width: number }[]>(
    keys.map((key) => ({
      key,
      width: COL_SIZING.default,
    }))
  );

  useEffect(() => {
    const totalKeys = [...keys];
    setColumnWidths(
      totalKeys.map((key) => {
        const field = getFieldDefinition(key as EntityCoreFields);
        return {
          key,
          width: field?.style?.width ?? getProvisionedWidth(field!.title, field?.unit),
        };
      })
    );
  }, [keys]);

  const columnOrderBy = useCallback(
    (field: string, backendField: string) => {
      let order: 'asc' | 'desc' | null = 'asc';

      if (sortState?.order && field === sortState.field) {
        order = sortState.order === 'desc' ? 'asc' : 'desc';
      }

      setSortState?.({
        backendField,
        field,
        order,
      });
    },
    [setSortState, sortState]
  );

  const updateColumnWidths = useCallback(
    (resizeInit: ResizeInit, clientX: number) => {
      const { key, start } = resizeInit;

      const delta = start ? clientX - start : 0; // No start? No delta.
      const colWidthIndex = columnWidths.findIndex(({ key: colKey }) => colKey === key);

      const updatedWidth = {
        key: key as string,
        width: Math.max(columnWidths[colWidthIndex].width + delta, COL_SIZING.min),
      };

      setColumnWidths([
        ...columnWidths.slice(0, colWidthIndex),
        updatedWidth,
        ...columnWidths.slice(colWidthIndex + 1),
      ]);
    },
    [columnWidths]
  );

  const onMouseDown = useCallback(
    (mouseDownEvent: React.MouseEvent<HTMLElement>, key: string) => {
      const { clientX } = mouseDownEvent;
      const resizeInit = {
        key,
        start: clientX,
      };

      const handleMouseMove = throttle(
        (moveEvent: MouseEvent) => updateColumnWidths(resizeInit, moveEvent.clientX),
        200
      );

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener(
        'mouseup',
        () => window.removeEventListener('mousemove', handleMouseMove),
        { once: true } // Auto-removeEventListener
      );
    },
    [updateColumnWidths]
  );

  const getOrderDirection = useCallback(
    (key: string) => {
      switch (sortState?.order) {
        case 'asc':
          return sortState?.field === key ? 'ascend' : undefined;
        case 'desc':
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
        const isSortable =
          term?.isSortable && !!getOrderValue(term?.order, dataType) && !!setSortState;
        acc.push({
          key,
          title: isString(term?.title) ? (
            <div
              className="flex flex-col text-left break-words"
              style={{ marginTop: '-2px', whiteSpace: 'normal', wordWrap: 'break-word' }}
            >
              <div
                className={`${styles.columnTitle} break-words`}
                style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
              >
                {fieldTitleSentenceCase(term?.title!)}
              </div>
              {term?.unit &&
                dataType !== ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection && (
                  <span className={`${styles.tableHeaderUnits} break-words`}>[{term?.unit}]</span>
                )}
            </div>
          ) : (
            <div
              className="flex cursor-default flex-col pl-[18px] text-left break-words"
              style={{ marginTop: '-2px', whiteSpace: 'normal', wordWrap: 'break-word' }}
            >
              {term?.title}
            </div>
          ),
          className: classNames(
            'text-primary-7 cursor-pointer before:!content-none',
            term?.className
          ),
          sorter: isSortable,
          ellipsis: true,
          width: columnWidths.find(({ key: colKey }) => colKey === key)?.width,
          render: (r) => term?.render?.(r),
          onHeaderCell: () => ({
            handleResizing: (e: React.MouseEvent<HTMLElement>) => onMouseDown(e, key),
            onClick: () => {
              if (!isSortable || !term.order) return;
              const field = getOrderValue(term.order, dataType);
              if (field) {
                columnOrderBy(key, field);
              }
            },
            title: isString(term?.title) ? term.title : '',
            showsortertooltip: {
              // eslint-disable-next-line no-nested-ternary
              title: term?.description ? term.description : isString(term?.title) ? term.title : '',
            },
          }),
          defaultSortOrder: 'descend',
          sortOrder: getOrderDirection(key),
          sortDirections: ['ascend', 'descend', 'descend'],
          align: term?.style?.align,
          fixed: term?.style?.fixed ?? false,
        });
        return acc;
      }, initialColumns),

    [
      columnWidths,
      initialColumns,
      keys,
      onMouseDown,
      columnOrderBy,
      getOrderDirection,
      dataType,
      setSortState,
    ]
  );

  if (dataType) {
    return columns.sort((a, b) =>
      a.key && b.key
        ? ViewsDefinitionRegistry[dataType].columns.indexOf(a.key as EntityCoreFields) -
          ViewsDefinitionRegistry[dataType].columns.indexOf(b.key as EntityCoreFields)
        : -1
    );
  }

  return columns;
}

'use client';

import {
  type MouseEvent as ReactMouseEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import useResizeObserver from '@/hooks/useResizeObserver';

import type { TableRef } from 'antd/es/table';
import type { IAdapterFieldDefinition } from '@/features/entity-import/core/adapter';

/** minimum column width (px) enforced during drag-resize. */
const MIN_COLUMN_WIDTH = 64;

/** default width for field columns that don't specify their own. */
const DEFAULT_FIELD_COLUMN_WIDTH = 200;

/**
 * fallback value for `scroll.y` when the container has no measurable height
 *
 * Ant Design's `<Table>` requires a positive `scroll.y` to enable vertical
 * scrolling. A value of `1` is effectively invisible but satisfies the
 * constraint
 */
const DEFAULT_TABLE_BODY_SCROLL_HEIGHT = 1;

/** width of the fixed row-index column on the left */
export const ROW_INDEX_COLUMN_WIDTH = 88;

/** width of the fixed row-actions column on the right. */
export const ROW_ACTIONS_COLUMN_WIDTH = 72;

/**
 * resolve the rendered width of a single field column
 * priority: user drag-override → field-level `columnWidth` → global default
 */
export function fieldColumnWidth(
  field: Pick<IAdapterFieldDefinition, 'path' | 'columnWidth'>,
  overrides: Record<string, number>
): number {
  return overrides[field.path] ?? field.columnWidth ?? DEFAULT_FIELD_COLUMN_WIDTH;
}

interface UseImportTableLayoutParams {
  /** Adapter field definitions, drives column count and default widths */
  fields: ReadonlyArray<Pick<IAdapterFieldDefinition, 'path' | 'columnWidth'>>;

  /**
   * Ref to the Ant Design `<Table>` instance
   *
   * used to query the native DOM for header/footer heights so the hook can
   * compute the available vertical space for the scrollable table body
   */
  tableRef: RefObject<TableRef | null>;
}

interface UseImportTableLayoutResult {
  /**
   * callback ref for the outermost wrapper `<div>` that contains the table
   *
   * attach this to the wrapper's `ref` prop. The hook uses it to measure the
   * available container height and to observe resize events
   */
  setWrapperRef: (element: HTMLDivElement | null) => void;

  /**
   * current user-applied column width overrides keyed by `field.path`
   *
   * pass these into column definitions to reflect drag-resized widths
   */
  resizeOverrides: Record<string, number>;

  /**
   * initiate a column drag-resize
   *
   * attach this to the `onMouseDown` handler of each column's resize grip
   * The hook manages `mousemove` / `mouseup` listeners on `window` for the
   * duration of the drag
   */
  beginResize: (event: ReactMouseEvent, fieldPath: string) => void;

  /**
   * total horizontal width of all columns combined
   *
   * feed this into `<Table scroll={{ x: scrollWidth }}>` so Ant Design knows
   * when to show a horizontal scrollbar
   */
  scrollWidth: number;

  /**
   * available vertical height for the scrollable table body
   *
   * computed as: container height − header height − footer height
   * feed this into `<Table scroll={{ y: scrollHeight }}>`
   */
  scrollHeight: number;
}

export function useImportTableLayout({
  fields,
  tableRef,
}: UseImportTableLayoutParams): UseImportTableLayoutResult {
  const [resizeOverrides, setResizeOverrides] = useState<Record<string, number>>({});
  const resizeOverridesRef = useRef(resizeOverrides);

  useEffect(() => {
    resizeOverridesRef.current = resizeOverrides;
  }, [resizeOverrides]);

  const beginResize = useCallback(
    (event: ReactMouseEvent, fieldPath: string) => {
      event.preventDefault();
      event.stopPropagation();

      const field = fields.find((f) => f.path === fieldPath);
      const startX = event.clientX;
      const startWidth =
        resizeOverridesRef.current[fieldPath] ?? field?.columnWidth ?? DEFAULT_FIELD_COLUMN_WIDTH;

      const onMove = (moveEvent: MouseEvent) => {
        const next = Math.max(MIN_COLUMN_WIDTH, startWidth + moveEvent.clientX - startX);
        setResizeOverrides((current) => ({ ...current, [fieldPath]: next }));
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [fields]
  );

  const [containerHeight, setContainerHeight] = useState(0);
  const [tableChromeHeights, setTableChromeHeights] = useState({
    headerHeight: 0,
    footerHeight: 0,
  });
  const [wrapperElement, setWrapperElement] = useState<HTMLDivElement | null>(null);

  const syncContainerHeight = useCallback(
    (target?: HTMLElement | null) => {
      const element = target ?? wrapperElement;
      if (!element) return;

      const nextHeight = element.getBoundingClientRect().height;
      setContainerHeight((current) => (current === nextHeight ? current : nextHeight));
    },
    [wrapperElement]
  );

  const syncTableChromeHeights = useCallback(() => {
    const nativeElement = tableRef.current?.nativeElement;
    if (!nativeElement) return;

    const headerHeight =
      nativeElement.querySelector('.ant-table-header, .ant-table-thead')?.getBoundingClientRect()
        .height ?? 0;
    const footerHeight =
      nativeElement.querySelector('.ant-table-footer')?.getBoundingClientRect().height ?? 0;

    setTableChromeHeights((current) =>
      current.headerHeight === headerHeight && current.footerHeight === footerHeight
        ? current
        : { headerHeight, footerHeight }
    );
  }, [tableRef]);

  const setWrapperRef = useCallback(
    (element: HTMLDivElement | null) => {
      setWrapperElement(element);
      if (!element) return;

      syncContainerHeight(element);
      requestAnimationFrame(() => {
        syncTableChromeHeights();
      });
    },
    [syncContainerHeight, syncTableChromeHeights]
  );

  useResizeObserver({
    element: wrapperElement ?? undefined,
    callback: (target) => {
      syncContainerHeight(target);
      syncTableChromeHeights();
    },
  });

  const scrollWidth = useMemo(() => {
    const fieldsWidth = fields.reduce(
      (acc, field) => acc + fieldColumnWidth(field, resizeOverrides),
      0
    );
    return ROW_INDEX_COLUMN_WIDTH + fieldsWidth + ROW_ACTIONS_COLUMN_WIDTH;
  }, [fields, resizeOverrides]);

  const scrollHeight = Math.max(
    containerHeight - tableChromeHeights.headerHeight - tableChromeHeights.footerHeight,
    DEFAULT_TABLE_BODY_SCROLL_HEIGHT
  );

  return {
    setWrapperRef,
    resizeOverrides,
    beginResize,
    scrollWidth,
    scrollHeight,
  };
}

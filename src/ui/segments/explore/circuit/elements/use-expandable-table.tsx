import type { ExpandableConfig } from 'antd/es/table/interface';
import { useAtomValue } from 'jotai';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import { resetFilterSignalAtom } from '@/ui/segments/explore/circuit/helpers';

export interface ExpandableTableState<T extends EntityCoreIdentifiable> {
  expandedData: Record<string, Array<T> | null>;
  expandedRowKeys: Set<string>;
}

export interface UseExpandableTableOptions<T extends EntityCoreIdentifiable> {
  // fetch data for expanded row
  data: (record: T) => Array<T>;
  getRowKey: (record: T) => string;
  // render expanded content
  renderExpanded: (records: Array<T>, originalRecord: T) => ReactNode;
  // determine if row is expandable
  isRowExpandable?: (record: T) => boolean;
  // index of the column to render the expand icon
  expandIconColumnIndex?: number;
  // render the expand icon
  expandIcon?: ExpandableConfig<T>['expandIcon'];
  // whether this is a nested table (affects controlled vs uncontrolled mode)
  isNested?: boolean;
}

/**
 * Reusable hook for managing expandable tables with hierarchy support
 */
export function useExpandableTable<T extends EntityCoreIdentifiable>(
  options: UseExpandableTableOptions<T>
): {
  expandableConfig: ExpandableConfig<T>;
  isRowExpanded: (record: T) => boolean;
  getExpandedData: (record: T) => Array<T> | null;
  resetState: () => void;
} {
  const {
    data,
    getRowKey,
    renderExpanded,
    isRowExpandable = () => true,
    expandIconColumnIndex,
    expandIcon,
    isNested = false,
  } = options;

  const [state, setState] = useState<ExpandableTableState<T>>({
    expandedData: {},
    expandedRowKeys: new Set(),
  });

  const resetState = () =>
    setState({
      expandedData: {},
      expandedRowKeys: new Set(),
    });

  // Reset expandable state when filters change
  const resetFilterSignal = useAtomValue(resetFilterSignalAtom);
  useEffect(() => {
    if (resetFilterSignal > 0) {
      resetState();
    }
  }, [resetFilterSignal, resetState]);

  const isRowExpanded = useCallback(
    (record: T): boolean => {
      const key = getRowKey(record);
      return key in state.expandedData;
    },
    [state.expandedData, getRowKey]
  );

  const getExpandedData = useCallback(
    (record: T): Array<T> | null => {
      const key = getRowKey(record);
      return state.expandedData[key] || null;
    },
    [state.expandedData, getRowKey]
  );

  const onExpand = useCallback(
    async (expanded: boolean, record: T): Promise<void> => {
      const key = getRowKey(record);

      if (!expanded) {
        setState((prev) => {
          const newExpandedData = { ...prev.expandedData };
          delete newExpandedData[key];

          const newState: ExpandableTableState<T> = {
            expandedData: newExpandedData,
            expandedRowKeys: new Set(
              Array.from(prev.expandedRowKeys).filter((rowKey) => rowKey !== key)
            ),
          };

          return newState;
        });
        return;
      }

      setState((prev) => ({
        expandedData: {
          ...prev.expandedData,
          [key]: data(record) ?? null,
        },
        expandedRowKeys: new Set(prev.expandedRowKeys.add(key)),
      }));
    },
    [data, getRowKey]
  );

  const expandedRowRender = useCallback(
    (record: T): ReactNode => {
      const key = getRowKey(record);
      const records = state.expandedData[key] || null;

      if (records === null) {
        return null;
      }

      return renderExpanded(records, record);
    },
    [state.expandedData, getRowKey, renderExpanded]
  );

  // create expandable config - use controlled mode only for top-level tables
  const expandableConfig: ExpandableConfig<T> = {
    rowExpandable: isRowExpandable,
    onExpand,
    expandedRowRender,
    expandIconColumnIndex,
    expandIcon,
    // only use controlled mode for top-level tables to avoid conflicts with nested tables
    ...(isNested ? {} : { expandedRowKeys: Array.from(state.expandedRowKeys) }),
  };

  return {
    expandableConfig,
    isRowExpanded,
    getExpandedData,
    resetState,
  };
}

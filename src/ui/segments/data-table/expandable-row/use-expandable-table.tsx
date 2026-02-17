import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { useAtomValue } from 'jotai';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { resetFilterSignalAtom } from '@/ui/segments/explore/circuit/helpers';
import { log } from '@/utils/logger';

import type { ExpandableConfig } from 'antd/es/table/interface';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';

export interface ExpandableTableState<T extends EntityCoreIdentifiable> {
  expandedData: Record<string, Array<T> | null>;
  loadingRows: Record<string, boolean>;
  expandedRowKeys: Array<string>;
}

export interface UseExpandableTableOptions<T extends EntityCoreIdentifiable, P = unknown> {
  // fetch data for expanded row
  fetcher?: (record: T, params?: P) => Promise<T | Array<T>> | undefined;
  // optional parameters to pass to fetcher
  fetcherParams?: P;
  getRowKey: (record: T) => string;
  // get the id to fetch (e.g., id of circuit)
  getFetchId: (record: T) => string | null;
  // render expanded content
  renderExpanded: (records: Array<T>, originalRecord: T, isLoading: boolean) => ReactNode;
  // determine if row is expandable
  isRowExpandable?: (record: T) => boolean;
  // index of the column to render the expand icon
  expandIconColumnIndex?: number;
  // render the expand icon
  expandIcon?: ExpandableConfig<T>['expandIcon'];
  // whether this is a top-level table that should sync with filter resets
  isTopLevel?: boolean;
}

/**
 * Reusable hook for managing expandable tables with hierarchy support
 */
export function useExpandableTable<T extends EntityCoreIdentifiable, P = unknown>(
  options?: UseExpandableTableOptions<T, P>
): {
  expandableConfig: ExpandableConfig<T> | undefined;
  isRowExpanded: (record: T) => boolean;
  isRowLoading: (record: T) => boolean;
  getExpandedData: (record: T) => Array<T> | null;
} {
  const {
    fetcher,
    fetcherParams,
    getRowKey = (record: T) => record.id,
    getFetchId = () => null,
    renderExpanded = () => null,
    isRowExpandable = () => true,
    expandIconColumnIndex,
    expandIcon,
    isTopLevel = false,
  } = options ?? {};

  const [state, setState] = useState<ExpandableTableState<T>>({
    expandedData: {},
    loadingRows: {},
    expandedRowKeys: [],
  });

  const resetFilterSignal = useAtomValue(resetFilterSignalAtom);

  useEffect(() => {
    if (isTopLevel && resetFilterSignal > 0) {
      setState({
        expandedData: {},
        loadingRows: {},
        expandedRowKeys: [],
      });
    }
  }, [resetFilterSignal, isTopLevel]);

  const isRowExpanded = useCallback(
    (record: T): boolean => {
      const key = getRowKey(record);
      return key in state.expandedData;
    },
    [state.expandedData, getRowKey]
  );

  const isRowLoading = useCallback(
    (record: T): boolean => {
      const key = getRowKey(record);
      return Boolean(state.loadingRows[key]);
    },
    [state.loadingRows, getRowKey]
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
      const fetchId = getFetchId(record);

      if (!expanded) {
        setState((prev) => {
          const newExpandedData = { ...prev.expandedData };
          delete newExpandedData[key];
          const newLoadingRows = { ...prev.loadingRows };
          delete newLoadingRows[key];

          const newState: ExpandableTableState<T> = {
            expandedData: newExpandedData,
            loadingRows: newLoadingRows,
            expandedRowKeys: isTopLevel
              ? prev.expandedRowKeys.filter((rowKey) => rowKey !== key)
              : prev.expandedRowKeys,
          };

          return newState;
        });
        return;
      }

      if (fetcher) {
        setState((prev) => ({
          ...prev,
          loadingRows: { ...prev.loadingRows, [key]: true },
          expandedRowKeys:
            isTopLevel && !prev.expandedRowKeys.includes(key)
              ? [...prev.expandedRowKeys, key]
              : prev.expandedRowKeys,
        }));

        try {
          const result = await fetcher(record, fetcherParams);
          const resultArray = result ? [...(Array.isArray(result) ? result : [result])] : [];

          setState((prev) => ({
            expandedData: {
              ...prev.expandedData,
              [key]: resultArray,
            },
            loadingRows: {
              ...prev.loadingRows,
              [key]: false,
            },
            expandedRowKeys: prev.expandedRowKeys,
          }));
        } catch (_error) {
          setState((prev) => ({
            expandedData: {
              ...prev.expandedData,
              [key]: null,
            },
            loadingRows: {
              ...prev.loadingRows,
              [key]: false,
            },
            expandedRowKeys: prev.expandedRowKeys,
          }));
        }
      } else if (!fetchId) {
        log('warn', 'Row is expandable but no fetcher provided and no fetchId available');
      }
    },
    [fetcher, fetcherParams, getRowKey, getFetchId, isTopLevel]
  );

  const expandedRowRender = useCallback(
    (record: T): ReactNode => {
      const key = getRowKey(record);
      const records = state.expandedData[key] || null;
      const isLoading = Boolean(state.loadingRows[key]);

      if (isLoading) {
        return (
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <Spin indicator={<LoadingOutlined spin />} />
          </div>
        );
      }

      if (records === null) {
        return null;
      }

      return renderExpanded(records, record, isLoading);
    },
    [state.expandedData, state.loadingRows, getRowKey, renderExpanded]
  );

  // create expandable config - only use controlled mode for top-level tables
  const expandableConfig: ExpandableConfig<T> | undefined = options
    ? {
        rowExpandable: isRowExpandable,
        onExpand,
        expandedRowRender,
        expandIconColumnIndex,
        expandIcon,
        // only top-level tables use controlled mode (expandedRowKeys)
        ...(isTopLevel && { expandedRowKeys: state.expandedRowKeys }),
      }
    : undefined;

  return {
    expandableConfig,
    isRowExpanded,
    isRowLoading,
    getExpandedData,
  };
}

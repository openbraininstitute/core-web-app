import { useState, useCallback, ReactNode } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import get from 'lodash/get';
import isNil from 'lodash/isNil';

import type { ExpandableConfig } from 'antd/es/table/interface';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';

export interface ExpandableTableCache<T extends EntityCoreIdentifiable> {
  [key: string]: Array<T> | null;
}

export interface ExpandableTableState<T extends EntityCoreIdentifiable> {
  expandedData: ExpandableTableCache<T>;
  loadingRows: Record<string, boolean>;
}

export interface UseExpandableTableOptions<T extends EntityCoreIdentifiable, P = unknown> {
  /**
   * fetch data for expanded row
   */
  fetcher?: (record: T, params?: P) => Promise<T | Array<T>>;
  /**
   * optional parameters to pass to fetcher
   */
  fetcherParams?: P;
  /**
   * get unique key for caching
   */
  getRowKey: (record: T) => string;
  /**
   * get the id to fetch (e.g., id of circuit)
   */
  getFetchId: (record: T) => string | null;
  /**
   * render expanded content
   */
  renderExpanded: (records: Array<T>, originalRecord: T, isLoading: boolean) => ReactNode;
  /**
   * determine if row is expandable
   */
  isRowExpandable?: (record: T) => boolean;
  /**
   * clear cache when component unmounts
   */
  persistCache?: boolean;
  /**
   * index of the column to render the expand icon
   */
  expandIconColumnIndex?: number;
  /**
   * render the expand icon
   */
  expandIcon?: ExpandableConfig<T>['expandIcon'];
}

/**
 * Reusable hook for managing expandable tables with caching and hierarchy support
 */
export function useExpandableTable<T extends EntityCoreIdentifiable, P = unknown>(
  options: UseExpandableTableOptions<T, P>
): {
  expandableConfig: ExpandableConfig<T>;
  clearCache: () => void;
  isRowExpanded: (record: T) => boolean;
  isRowLoading: (record: T) => boolean;
  getExpandedData: (record: T) => Array<T> | null;
} {
  const {
    fetcher,
    fetcherParams,
    getRowKey,
    getFetchId,
    renderExpanded,
    isRowExpandable = () => true,
    persistCache = true,
    expandIconColumnIndex,
    expandIcon,
  } = options;

  const [state, setState] = useState<ExpandableTableState<T>>({
    expandedData: {},
    loadingRows: {},
  });

  const clearCache = useCallback(() => {
    setState({
      expandedData: {},
      loadingRows: {},
    });
  }, []);

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
      return get(state.expandedData, key, null);
    },
    [state.expandedData, getRowKey]
  );

  const onExpand = useCallback(
    async (expanded: boolean, record: T): Promise<void> => {
      const key = getRowKey(record);
      const fetchId = getFetchId(record);

      if (!expanded) {
        // Row is being collapsed - remove from expanded data but keep in cache if persistCache is true
        if (!persistCache) {
          setState((prev) => {
            const newExpandedData = { ...prev.expandedData };
            delete newExpandedData[key];
            const newLoadingRows = { ...prev.loadingRows };
            delete newLoadingRows[key];
            return {
              expandedData: newExpandedData,
              loadingRows: newLoadingRows,
            };
          });
        }
        return;
      }

      const existingData = get(state.expandedData, key, null);
      if (!isNil(existingData)) {
        return;
      }

      if (fetcher) {
        setState((prev) => ({
          ...prev,
          loadingRows: { ...prev.loadingRows, [key]: true },
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
          }));
        } catch (error) {
          setState((prev) => ({
            expandedData: {
              ...prev.expandedData,
              [key]: null,
            },
            loadingRows: {
              ...prev.loadingRows,
              [key]: false,
            },
          }));
        }
      } else if (!fetchId) {
        // No fetcher and no fetchId - this shouldn't happen for expandable rows
        // eslint-disable-next-line no-console
        console.warn('Row is expandable but no fetcher provided and no fetchId available');
      }
    },
    [fetcher, fetcherParams, getRowKey, getFetchId, persistCache, state.expandedData]
  );

  const expandedRowRender = useCallback(
    (record: T): ReactNode => {
      const key = getRowKey(record);
      const records = get(state.expandedData, key, null);
      const isLoading = Boolean(state.loadingRows[key]);

      if (isLoading) {
        return (
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <Spin indicator={<LoadingOutlined spin />} />
          </div>
        );
      }

      if (isNil(records)) {
        return null;
      }

      return renderExpanded(records, record, isLoading);
    },
    [state.expandedData, state.loadingRows, getRowKey, renderExpanded]
  );

  const expandableConfig: ExpandableConfig<T> = {
    rowExpandable: isRowExpandable,
    onExpand,
    expandedRowRender,
    expandIconColumnIndex,
    expandIcon,
  };

  return {
    expandableConfig,
    clearCache,
    isRowExpanded,
    isRowLoading,
    getExpandedData,
  };
}

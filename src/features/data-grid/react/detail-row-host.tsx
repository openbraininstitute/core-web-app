import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import type { ReactNode } from 'react';
import type { DetailRuntime } from './renderer';

export interface DetailRowHostProps<Row> {
  row: Row;
  rowId: string;
  /** stable grid instance id, namespaces the detail cache */
  gridId: string;
  detail: DetailRuntime<Row>;
  minHeight?: number;
  /** reports the measured content height so the renderer can size the full-width row */
  onHeight: (height: number) => void;
}

/**
 * Renders one expanded row's detail content. Loads the payload through the
 * {@link DetailProvider} port via React Query (cached per row id, so re-expanding
 * doesn't refetch), and reports its measured height through a ResizeObserver so
 * dynamic content — including nested grids — never clips or jitters.
 */
export function DetailRowHost<Row>({
  row,
  rowId,
  gridId,
  detail,
  minHeight,
  onHeight,
}: DetailRowHostProps<Row>): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const onHeightRef = useRef(onHeight);
  onHeightRef.current = onHeight;

  const hasFetch = Boolean(detail.provider.fetch);
  const { data, isLoading, error } = useQuery({
    queryKey: ['data-grid-detail', gridId, rowId],
    queryFn: ({ signal }) => detail.provider.fetch?.(row, signal) ?? Promise.resolve(null),
    enabled: hasFetch,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height;
      if (height) onHeightRef.current(Math.ceil(height));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ minHeight }}>
      {detail.render({
        row,
        data: hasFetch ? data : undefined,
        loading: hasFetch ? isLoading : false,
        error,
      })}
    </div>
  );
}

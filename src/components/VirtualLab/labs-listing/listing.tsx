'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { PlusOutlined, WarningOutlined, ReloadOutlined } from '@ant-design/icons';
import Link from 'next/link';

import Item from '@/components/VirtualLab/item/vlab-item';
import { VirtualLab } from '@/api/virtual-lab-svc/queries/types';
import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { tryCatch } from '@/api/utils';

type Props = {
  labs: Array<VirtualLab>;
  initialPage?: number;
  pageSize?: number;
  totalItems?: number;
};

export default function VirtualLabDashboard({
  labs: initialLabs,
  initialPage = 1,
  pageSize = 10,
  totalItems = 0,
}: Props) {
  const [labs, setLabs] = useState<Array<VirtualLab>>(initialLabs);
  const [page, setPage] = useState<number>(initialPage);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(initialLabs.length < totalItems);
  const [error, setError] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const loadMoreLabs = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    const nextPage = page + 1;
    const result = await tryCatch(listVirtualLabs({ page: nextPage, pageSize }), () => {
      setLoading(false);
    });
    if (result.error) {
      setError('Unable to load additional virtual labs. Please try again');
      return;
    }

    const response = result.data;

    if (response?.data?.results && response.data.results.length > 0) {
      setLabs((prevLabs) => {
        const newLabs = [...prevLabs, ...response.data!.results];
        const total = response.data?.total || 0;
        setHasMore(newLabs.length < total);
        return newLabs;
      });
      setPage(nextPage);
    } else {
      setHasMore(false);
    }
  }, [loading, hasMore, page, pageSize]);

  const handleRetry = useCallback(() => {
    setError(null);
    loadMoreLabs();
  }, [loadMoreLabs]);

  useEffect(() => {
    if (!loadingRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !error) {
          loadMoreLabs();
        }
      },
      { threshold: 0.1 }
    );

    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, loadMoreLabs, error]);

  return (
    <div className="mx-auto flex h-[calc(100vh-5.5rem)] w-full max-w-7xl flex-col overflow-hidden">
      <div className="primary-scrollbar h-[calc(100vh-8.5rem)] flex-1 overflow-y-auto pr-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3">
            {labs.map((vl) => (
              <Item
                key={vl.id}
                id={vl.id}
                name={vl.name}
                lastUpdate={vl.updated_at}
                projectCount={vl.projects_count}
                memberCount={vl.members_count}
              />
            ))}
            {hasMore && !error && (
              <div className="flex w-full items-center justify-center">
                <div
                  ref={loadingRef}
                  className="mt-3 w-max rounded-full border border-primary-6 bg-primary-6 px-8 py-3 text-center font-medium"
                >
                  {loading ? 'Loading more labs...' : ''}
                </div>
              </div>
            )}
            {error && (
              <div className="my-4 rounded-md border border-red-500 bg-red-900/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <WarningOutlined className="text-lg text-red-500" />
                    <p className="text-red-200">{error}</p>
                  </div>
                  <button
                    type="button"
                    aria-label="retry"
                    onClick={handleRetry}
                    className="flex items-center gap-1 rounded-md bg-red-800 px-3 py-1 text-white transition-colors hover:bg-red-700"
                  >
                    <ReloadOutlined />
                    <span>Retry</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="ml-auto mt-4 flex items-center">
        <div className="flex items-center gap-3 pr-3">
          <Link
            className="rounded-none border-none font-bold"
            href="/app/virtual-lab/lab/project/create"
          >
            <div className="group flex h-12 items-center justify-between gap-8 bg-white px-4 py-2 text-primary-9">
              <span>Create project</span>
              <PlusOutlined className="text-lg group-hover:scale-105" />
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-3 pr-3">
          <Link className="rounded-none border-none font-bold" href="/app/virtual-lab/lab/create">
            <div className="group flex h-12 items-center justify-between gap-8 bg-white px-4 py-2 text-primary-9">
              <span>Create virtual lab</span>
              <PlusOutlined className="text-lg group-hover:scale-105" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

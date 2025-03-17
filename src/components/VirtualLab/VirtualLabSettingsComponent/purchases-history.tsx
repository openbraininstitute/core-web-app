'use client';

import { useState, useEffect, useCallback } from 'react';
import { InfoCircleFilled } from '@ant-design/icons';

import { Spin } from 'antd';
import PurchasesTable from '@/components/VirtualLab/VirtualLabSettingsComponent/purchases-table';
import { HistoryError } from '@/components/VirtualLab/create-entity-flows/subscription/elements';
import { listStandalonePayments } from '@/api/virtual-lab-svc/queries/payment';
import { SubscriptionPaymentsResponse } from '@/api/virtual-lab-svc/queries/types';
import { tryCatch } from '@/api/utils';

function PurchasesEmpty() {
  return (
    <div className="mb-6 transform rounded-sm bg-primary-8 p-6 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="mb-2 text-2xl font-bold">Purchases History</h2>
          <p className="max-w-xl text-blue-200/80">No Purchases history found.</p>
        </div>
        <div className="mb-2 flex items-center gap-2 self-baseline">
          <InfoCircleFilled className="text-2xl text-blue-600" />
        </div>
      </div>
    </div>
  );
}

export default function PurchasesHistory() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [data, setData] = useState<SubscriptionPaymentsResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    const { data: result, error: err } = await tryCatch(
      listStandalonePayments({ page: currentPage, pageSize }),
      () => {
        setIsLoading(false);
      }
    );
    if (err) {
      setError(err);
    } else {
      setData(result);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handlePageChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  if (error) return <HistoryError />;
  if (isLoading)
    return (
      <div className="flex items-center justify-center">
        <Spin />
      </div>
    );

  if (!data || !data.data || data.data.payments.length === 0) {
    return <PurchasesEmpty />;
  }

  const { payments, total_count: totalCount, current_page: currPage, page_size: pSize } = data.data;

  return (
    <div data-testid="payments-list" className="h-full w-full py-5">
      <PurchasesTable
        payments={payments}
        total={totalCount}
        currentPage={currPage}
        pageSize={pSize}
        onPageChange={handlePageChange}
        loading={isLoading}
      />
    </div>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import { getProjectAccountBalance } from '@/services/virtual-lab/projects';
import { Skeleton } from '@/ui/molecules/skeleton';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { Enrolment } from '@/api/virtual-lab-svc/queries/course';

export function RemainingCredit({ enrolment }: { enrolment: Enrolment }) {
  const params = useParams();
  const virtualLabId = params.virtualLabId as string;
  const projectId = enrolment.project_id;

  const {
    data: balance,
    isPending,
    isError,
  } = useQuery({
    queryKey: keyBuilder.wallet({ virtualLabId, projectId }),
    queryFn: () => getProjectAccountBalance({ virtualLabId, projectId }),
    select: (res) => Number(res.balance),
    enabled: !!enrolment.seat && !enrolment.is_dropped,
  });

  if (!enrolment.seat || enrolment.is_dropped) return <span className="text-gray-500">-</span>;
  if (isPending) return <Skeleton className="h-4 w-16" />;
  if (isError) return <span className="text-gray-500">Unknown</span>;

  return <span>{balance}</span>;
}

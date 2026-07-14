'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import { getProjectAccountBalance } from '@/services/virtual-lab/projects';
import { Skeleton } from '@/ui/molecules/skeleton';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { Course, Enrolment } from '@/api/virtual-lab-svc/queries/course';

interface SeatRecoverabilityProps {
  course: Course;
  enrolment: Enrolment;
}

export function SeatRecoverability({ course, enrolment }: SeatRecoverabilityProps) {
  const params = useParams();
  const virtualLabId = params.virtualLabId as string;
  const projectId = enrolment.project_id;

  // Calculate conditions at the top level (before any conditional returns)
  const isPeriod1Ended = (() => {
    if (!enrolment.seat) return false;
    const now = new Date();
    const period1EndDate = new Date(course.last_drop_date);
    return now > period1EndDate;
  })();

  const hasBeenDroppedBefore = enrolment.seat?.previously_dropped ?? false;
  const shouldFetchBalance =
    !!enrolment.seat && !isPeriod1Ended && !hasBeenDroppedBefore && !enrolment.is_dropped;

  // Hook called unconditionally at top level
  const {
    data: balance,
    isPending,
    isError,
  } = useQuery({
    queryKey: keyBuilder.wallet({ virtualLabId, projectId }),
    queryFn: () => getProjectAccountBalance({ virtualLabId, projectId }),
    select: (res) => res.balance,
    enabled: shouldFetchBalance,
  });

  // Early returns can happen after hooks
  if (!enrolment.seat || enrolment.is_dropped) {
    return <span className="text-gray-500">-</span>;
  }

  if (isPeriod1Ended) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-semibold text-red-800">No</span>
        <span className="text-xs text-gray-600">(Period 1 has ended)</span>
      </div>
    );
  }

  if (hasBeenDroppedBefore) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-semibold text-red-800">No</span>
        <span className="text-xs text-gray-600">(Seat has been vacated before)</span>
      </div>
    );
  }

  if (isPending) {
    return <Skeleton className="h-4 w-24" />;
  }

  const creditThreshold = (course.credits_per_seat ?? 50) - 50;
  const hasSpentMoreThanThreshold = typeof balance === 'number' && balance < creditThreshold;

  if (hasSpentMoreThanThreshold) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-semibold text-red-800">No</span>
        <span className="text-xs text-gray-600">(Project has spent more than credits)</span>
      </div>
    );
  }

  if (isError) {
    return <span className="text-gray-500">Unknown</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-semibold text-green-800">Yes</span>
    </div>
  );
}

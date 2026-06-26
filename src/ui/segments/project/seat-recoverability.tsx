'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import { getProjectAccountBalance } from '@/services/virtual-lab/projects';
import { Skeleton } from '@/ui/molecules/skeleton';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { Course, Enrolment } from '@/api/virtual-lab-svc/queries/course';

interface SeatRecoverabilityProps {
  enrolment: Enrolment;
  course: Course;
}

export function SeatRecoverability({ enrolment, course }: SeatRecoverabilityProps) {
  const params = useParams();
  const virtualLabId = params.virtualLabId as string;
  const projectId = enrolment.project_id;

  // Fetch project balance to check credits
  const {
    data: balance,
    isLoading,
    isError,
  } = useQuery({
    queryKey: keyBuilder.wallet({ virtualLabId, projectId }),
    queryFn: () => getProjectAccountBalance({ virtualLabId, projectId }),
    select: (res) => res.balance,
    enabled: !!enrolment.seat,
  });

  // Only show if enrolment has a seat
  if (!enrolment.seat) {
    return <span className="text-gray-500">-</span>;
  }

  if (isLoading) {
    return <Skeleton className="h-4 w-24" />;
  }

  const now = new Date();
  const period1EndDate = new Date(course.last_drop_date);
  const isPeriod1Ended = now > period1EndDate;
  const hasBeenDroppedBefore = enrolment.seat.previously_dropped;
  const creditThreshold = (course.credits_per_seat ?? 50) - 50;
  const hasSpentMoreThanThreshold = typeof balance === 'number' && balance < creditThreshold;

  let isRecoverable = true;
  let reason = '';

  if (isPeriod1Ended) {
    isRecoverable = false;
    reason = 'Period 1 has ended';
  } else if (hasBeenDroppedBefore) {
    isRecoverable = false;
    reason = 'Seat has been vacated before';
  } else if (hasSpentMoreThanThreshold) {
    isRecoverable = false;
    reason = 'Project has spent more than 50 credits';
  } else if (isError) {
    return <span className="text-gray-500">Unknown</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className={isRecoverable ? 'text-green-800' : 'text-red-800'}>
        {isRecoverable ? 'Yes' : 'No'}
      </span>
      {reason && <span className="text-xs text-gray-600">({reason})</span>}
    </div>
  );
}

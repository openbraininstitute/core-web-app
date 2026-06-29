'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { fetchEnrolments, fetchSeats } from '@/api/virtual-lab-svc/queries/course';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { Button } from '@/ui/molecules/button';
import { Skeleton } from '@/ui/molecules/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { AssignSeatsModal } from '@/ui/segments/project/course-assign-seats-modal';
import { DropSeatButton } from '@/ui/segments/project/drop-seat-button';
import { SeatRecoverability } from '@/ui/segments/project/seat-recoverability';

type SortField = 'email' | 'student_id' | 'status' | 'activated' | 'dropped' | 'created' | 'seat';
type SortOrder = 'asc' | 'desc';

export default function CoursePage() {
  const params = useParams();
  const virtualLabId = params.virtualLabId as string;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('email');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const queryClient = useQueryClient();

  const handleAssignSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['seats', courseId] });
    queryClient.invalidateQueries({ queryKey: ['enrolments', courseId] });
  };

  const handleDropSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['seats', courseId] });
    queryClient.invalidateQueries({ queryKey: ['enrolments', courseId] });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortableHeader = ({ field, label }: { field: SortField; label: string }) => {
    const isActive = sortField === field;

    return (
      <th
        className="cursor-pointer select-none px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-gray-100"
        onClick={() => handleSort(field)}
      >
        <div className="inline-flex items-center gap-2">
          <span className={isActive ? 'text-gray-900' : 'text-gray-700'}>{label}</span>
          <svg
            className={`size-4 transition-transform ${isActive ? (sortOrder === 'asc' ? 'text-primary-9' : 'rotate-180 text-primary-9') : 'text-gray-400'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <title>
              {isActive
                ? sortOrder === 'asc'
                  ? 'Sort ascending'
                  : 'Sort descending'
                : 'Sortable column'}
            </title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4"
            />
          </svg>
        </div>
      </th>
    );
  };

  // Fetch virtual lab to get course ID
  const labQuery = useQuery({
    queryKey: ['virtualLab', virtualLabId],
    queryFn: () => getVirtualLab({ id: virtualLabId }),
    enabled: !!virtualLabId,
  });

  const courseId = labQuery.data?.course?.id;

  // Fetch seats and enrolments using the course ID
  const seatsQuery = useQuery({
    queryKey: ['seats', courseId],
    queryFn: () => fetchSeats(courseId as string),
    enabled: !!courseId,
  });

  const enrolmentsQuery = useQuery({
    queryKey: ['enrolments', courseId],
    queryFn: () => fetchEnrolments(courseId as string),
    enabled: !!courseId,
  });

  if (labQuery.isPending) {
    return (
      <div className="p-6">
        <Skeleton className="mb-4 h-10" />
        <Skeleton className="mb-4 h-10" />
        <Skeleton className="mb-4 h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  }

  if (labQuery.isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600">Error loading virtual lab</h2>
          <p className="mt-2 text-gray-600">Failed to fetch lab details</p>
        </div>
      </div>
    );
  }

  if (!courseId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-primary-9">No course</h2>
          <p className="mt-2 text-gray-600">This virtual lab does not have a course associated</p>
        </div>
      </div>
    );
  }

  if (seatsQuery.isPending || enrolmentsQuery.isPending) {
    return (
      <div className="p-6">
        <Skeleton className="mb-4 h-10" />
        <Skeleton className="mb-4 h-10" />
        <Skeleton className="mb-4 h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  }

  if (seatsQuery.isError || enrolmentsQuery.isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600">Error loading course data</h2>
          <p className="mt-2 text-gray-600">Failed to fetch seats or enrolments</p>
        </div>
      </div>
    );
  }

  const seats = seatsQuery.data?.data || [];
  let enrolments = enrolmentsQuery.data?.enrolments || [];
  const course = labQuery.data?.course;

  // Sort enrolments
  enrolments = [...enrolments].sort((a, b) => {
    let aVal: string | number | Date;
    let bVal: string | number | Date;

    switch (sortField) {
      case 'email':
        aVal = a.contact_email;
        bVal = b.contact_email;
        break;
      case 'student_id':
        aVal = a.student_id;
        bVal = b.student_id;
        break;
      case 'status':
        aVal = a.claimed_by ? 'claimed' : 'unclaimed';
        bVal = b.claimed_by ? 'claimed' : 'unclaimed';
        break;
      case 'activated':
        aVal = a.activated_at ? new Date(a.activated_at) : new Date(0);
        bVal = b.activated_at ? new Date(b.activated_at) : new Date(0);
        break;
      case 'dropped':
        aVal = a.is_dropped ? 1 : 0;
        bVal = b.is_dropped ? 1 : 0;
        break;
      case 'created':
        aVal = new Date(a.created_at);
        bVal = new Date(b.created_at);
        break;
      case 'seat':
        aVal = a.seat?.id ? 1 : 0;
        bVal = b.seat?.id ? 1 : 0;
        break;
      default:
        aVal = '';
        bVal = '';
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="p-6">
      <h1 className="mb-8 text-2xl font-bold text-primary-9">Course management</h1>

      {/* Course Info Section */}
      {course && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-lg font-semibold text-primary-9">{labQuery.data?.name}</h2>
            {(() => {
              const now = new Date();
              const endDate = new Date(course.end_date);
              const startDate = new Date(course.start_date);
              const isPast = now > endDate;
              const isActive = now >= startDate && now <= endDate;

              return (
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    isPast
                      ? 'bg-red-100 text-red-800'
                      : isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {isPast ? 'Course ended' : isActive ? 'Course active' : 'Course upcoming'}
                </span>
              );
            })()}
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Start date</p>
              <p className="mt-1 text-base text-gray-900">
                {new Date(course.start_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-600">Period 1 end date</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-xs font-semibold text-gray-500 hover:text-gray-700">
                      i
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div className="space-y-2">
                      <p className="font-semibold">Period 1 deadline</p>
                      <ul className="list-inside space-y-1">
                        <li>• New assignments are only possible before Period 1 ends.</li>
                        <li>
                          • Vacated seats can be reassigned only if:
                          <div className="pl-4">
                            <div>– The seat has never been vacated before</div>
                            <div>– The student had spent fewer than 50 credits</div>
                            <div>– Period 1 has not ended</div>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="mt-1 text-base text-gray-900">
                {new Date(course.last_drop_date).toLocaleDateString()}
              </p>
              {(() => {
                const now = new Date();
                const period1EndDate = new Date(course.last_drop_date);
                const isPeriod1Past = now > period1EndDate;

                return (
                  <span
                    className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      isPeriod1Past ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {isPeriod1Past ? 'Ended' : 'Active'}
                  </span>
                );
              })()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">End date</p>
              <p className="mt-1 text-base text-gray-900">
                {new Date(course.end_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Seats Section */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-primary-8">Seats</h2>
          {(() => {
            const availableSeats = seats.filter((seat) => !seat.enrolment_id).length;
            const hasAvailableSeats = availableSeats > 0;
            return (
              <Button
                onClick={() => setIsModalOpen(true)}
                disabled={!hasAvailableSeats}
                className={!hasAvailableSeats ? 'bg-gray-300 text-gray-500 hover:bg-gray-300' : ''}
              >
                Assign seats
              </Button>
            );
          })()}
        </div>
        {(() => {
          const assignedSeats = seats.filter((seat) => seat.enrolment_id).length;
          const totalSeats = seats.length;
          return (
            <div className="text-3xl font-bold text-primary-9">
              {assignedSeats}/{totalSeats}
            </div>
          );
        })()}
      </div>

      {/* Enrolments Section */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-primary-8">
          Enrolments ({enrolments.length})
        </h2>
        {enrolments.length === 0 ? (
          <p className="text-gray-600">No enrolments available</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader field="email" label="Student email" />
                  <SortableHeader field="student_id" label="Student ID" />
                  <SortableHeader field="status" label="Status" />
                  <SortableHeader field="activated" label="Activated" />
                  <SortableHeader field="dropped" label="Dropped" />
                  <SortableHeader field="created" label="Created" />
                  <SortableHeader field="seat" label="Occupies seat" />
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Seat recoverable (reason)
                  </th>
                  <th className="w-32 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {enrolments.map((enrolment) => (
                  <tr key={enrolment.id} className="border-t border-gray-200">
                    <td className="px-4 py-3 text-sm text-gray-900">{enrolment.contact_email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{enrolment.student_id}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          enrolment.claimed_by
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {enrolment.claimed_by ? 'Claimed' : 'Unclaimed'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {enrolment.activated_at
                        ? new Date(enrolment.activated_at).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          enrolment.is_dropped
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {enrolment.is_dropped ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(enrolment.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          enrolment.seat?.id
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {enrolment.seat?.id ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {course && <SeatRecoverability course={course} enrolment={enrolment} />}
                    </td>
                    <td className="w-32 px-4 py-3 text-sm">
                      {course && (
                        <DropSeatButton
                          course={course}
                          courseId={courseId}
                          enrolment={enrolment}
                          onSuccess={handleDropSuccess}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AssignSeatsModal
        open={isModalOpen}
        courseId={courseId}
        enrolments={enrolments}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleAssignSuccess}
      />
    </div>
  );
}

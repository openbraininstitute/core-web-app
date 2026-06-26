'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { fetchEnrolments, fetchSeats } from '@/api/virtual-lab-svc/queries/course';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { Button } from '@/ui/molecules/button';
import { Skeleton } from '@/ui/molecules/skeleton';
import { AssignSeatsModal } from '@/ui/segments/project/course-assign-seats-modal';

export default function CoursePage() {
  const params = useParams();
  const virtualLabId = params.virtualLabId as string;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleAssignSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['seats', courseId] });
    queryClient.invalidateQueries({ queryKey: ['enrolments', courseId] });
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
          <h2 className="text-xl font-bold text-primary-9">No Course</h2>
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

  const seats = seatsQuery.data?.seats || [];
  const enrolments = enrolmentsQuery.data?.enrolments || [];

  return (
    <div className="p-6">
      <h1 className="mb-8 text-2xl font-bold text-primary-9">Course Management</h1>

      {/* Seats Section */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-primary-8">Seats</h2>
          <Button onClick={() => setIsModalOpen(true)}>Assign Seats</Button>
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
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Student Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Student ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Activated
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Dropped
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Created
                  </th>
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

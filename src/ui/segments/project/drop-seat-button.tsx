'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { dropSeats } from '@/api/virtual-lab-svc/queries/course';
import { Button } from '@/ui/molecules/button';
import { Modal } from '@/ui/molecules/modal';
import { SeatRecoverability } from '@/ui/segments/project/seat-recoverability';

import type { Course, Enrolment } from '@/api/virtual-lab-svc/queries/course';

interface DropSeatButtonProps {
  course: Course;
  courseId: string;
  enrolment: Enrolment;
  onSuccess?: () => void;
}

export function DropSeatButton({ course, courseId, enrolment, onSuccess }: DropSeatButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const hasNoSeat = !enrolment.seat?.id;
  const isAlreadyDropped = enrolment.is_dropped;
  const isDisabled = hasNoSeat || isAlreadyDropped;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!enrolment.seat?.id) {
        throw new Error('Seat ID is missing');
      }
      const response = await dropSeats(courseId, [enrolment.seat.id]);
      const result = response.results[0];
      if (!result.is_dropped) {
        throw new Error('Failed to drop seat. Please try again.');
      }
      return response;
    },
    onSuccess: () => {
      setShowConfirm(false);
      onSuccess?.();
    },
  });

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowConfirm(true)}
        disabled={mutation.isPending || isDisabled}
        className={mutation.isPending || isDisabled ? 'bg-gray-300' : ''}
      >
        {mutation.isPending ? 'Dropping...' : 'Drop'}
      </Button>

      <Modal
        open={showConfirm}
        onClose={() => {
          if (!mutation.isPending) {
            mutation.reset();
            setShowConfirm(false);
          }
        }}
        title="Drop seat"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className={mutation.isPending ? 'bg-gray-300' : ''}
            >
              {mutation.isPending ? 'Dropping...' : 'Drop'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p>
            Are you sure you want to drop the seat for <strong>{enrolment.contact_email}</strong>?
            This action cannot be undone.
          </p>

          {/* Recoverability Status */}
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="mb-2 text-sm font-semibold text-gray-700">Seat Recoverable:</p>
            <SeatRecoverability course={course} enrolment={enrolment} />
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-600">Couldn't drop seat. Please try again.</p>
          )}
        </div>
      </Modal>
    </>
  );
}

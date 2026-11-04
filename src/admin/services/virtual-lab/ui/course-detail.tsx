'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/ui/molecules/button';

import { Detail, DetailId, DetailList } from '../../../shared/detail-list';
import { isNotFound } from '../../../shared/errors';
import { FormModal } from '../../../shared/form-modal';
import { asUtc, formatDateTime } from '../../../shared/format';
import { AdminQueryGrid, LoadFailure } from '../../../shared/grid';
import { PageHeader } from '../../../shared/page-header';
import { adminQueryKeys } from '../../../shared/query-keys';
import { AdminLink } from '../../../shell/admin-link';
import { ADMIN_ROOT } from '../../../shell/sections';
import {
  activateCourse,
  deleteCourse,
  getCourse,
  getCourseSeatBatches,
  provisionSeats,
  transferSeats,
  voidCourse,
} from '../api/education';
import { CourseEdit, UUID_RULE } from './course-form';
import { CourseStatusPill } from './courses-list';
import { useTenancyWrite } from './use-tenancy-write';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { AdminCourse, AdminSeatBatch } from '../api/admin-types';

const COURSES_HREF = `${ADMIN_ROOT}/courses`;

const BATCH_COLUMNS: Array<ISimpleColumn<AdminSeatBatch>> = [
  {
    id: 'created',
    header: 'Provisioned',
    width: { flex: 1, minWidth: 180 },
    getValue: (batch) => formatDateTime(batch.created_at),
  },
  {
    id: 'expires',
    header: 'Seats expire',
    width: { flex: 1, minWidth: 180 },
    getValue: (batch) => formatDateTime(batch.expiry_date),
  },
  {
    id: 'seats',
    header: 'Seats',
    width: { width: 100 },
    getValue: (batch) => batch.number_of_seats,
  },
  {
    id: 'used',
    header: 'Used',
    width: { width: 100 },
    getValue: (batch) => batch.seats.filter((seat) => seat.is_consumed).length,
  },
  {
    id: 'credits',
    header: 'Credits per seat',
    width: { width: 150 },
    getValue: (batch) => batch.seats[0]?.credit_value,
  },
  {
    id: 'batch',
    header: 'Batch ID',
    width: { flex: 2, minWidth: 320 },
    getValue: (b) => b.batch_id,
  },
];

function typedLabName(course: AdminCourse) {
  return {
    name: 'name',
    label: "Type the lab's name to confirm",
    rules: [
      {
        validator: async (_: unknown, value: string) => {
          if (value !== course.virtual_lab_name) throw new Error("That isn't the lab's name");
        },
      },
    ],
  };
}

function CourseActions({ course }: { course: AdminCourse }) {
  const router = useRouter();
  const [open, setOpen] = useState<
    'edit' | 'activate' | 'provision' | 'transfer' | 'void' | 'delete' | null
  >(null);
  const close = () => setOpen(null);

  const activateWrite = useTenancyWrite({
    write: () => activateCourse(course.id),
    done: 'Course activated',
    failed: "Couldn't activate the course",
    onSuccess: close,
  });
  const provisionWrite = useTenancyWrite({
    write: (seats: number) => provisionSeats(course.id, seats),
    done: 'Seats provisioned',
    failed: "Couldn't provision the seats",
    onSuccess: close,
  });
  const transferWrite = useTenancyWrite({
    write: ({ target, amount }: { target: string; amount: number | 'all' }) =>
      transferSeats(course.id, target, amount),
    done: 'Seats transferred',
    failed: "Couldn't transfer the seats",
    onSuccess: close,
  });
  const voidWrite = useTenancyWrite({
    write: () => voidCourse(course.id),
    done: 'Course voided',
    failed: "Couldn't void the course",
    onSuccess: close,
  });
  const deleteWrite = useTenancyWrite({
    write: () => deleteCourse(course.id),
    done: 'Course deleted',
    failed: "Couldn't delete the course",
    onSuccess: () => router.push(COURSES_HREF),
  });

  const pastLastDrop = new Date(asUtc(course.last_drop_date)) < new Date();
  const button = (action: NonNullable<typeof open>, label: string) => (
    <Button rounded variant="outline" size="sm" onClick={() => setOpen(action)}>
      {label}
    </Button>
  );

  return (
    <>
      {course.status !== 'voided' && button('edit', 'Edit')}
      {course.status === 'draft' && button('activate', 'Activate')}
      {course.status === 'active' && button('provision', 'Provision seats')}
      {course.status === 'active' && pastLastDrop && button('transfer', 'Transfer seats')}
      {course.status !== 'voided' && button('void', 'Void')}
      {course.status !== 'active' && button('delete', 'Delete')}

      {open === 'edit' && <CourseEdit course={course} onClose={close} />}
      {open === 'activate' && (
        <FormModal
          title="Activate this course?"
          description="Seats can be provisioned once it's active. It can't go back to being a draft."
          fields={[]}
          okText="Activate"
          pending={activateWrite.isPending}
          onSubmit={() => activateWrite.mutate(undefined)}
          onClose={close}
        />
      )}
      {open === 'provision' && (
        <FormModal<{ seats: number }>
          title="Provision seats"
          description="Adds a batch of seats to this course. Credits are only granted when a seat is assigned to a student."
          fields={[
            {
              name: 'seats',
              label: 'Number of seats',
              kind: 'integer',
              min: 1,
              max: 100,
              rules: [{ required: true, message: 'Give a number from 1 to 100' }],
            },
          ]}
          okText="Provision"
          pending={provisionWrite.isPending}
          onSubmit={({ seats }) => provisionWrite.mutate(seats)}
          onClose={close}
        />
      )}
      {open === 'transfer' && (
        <FormModal<{ target: string; amount?: number | null }>
          title="Transfer unused seats"
          description="Moves seats to another active course of the same institution that is still before its last date to drop. Seats worth more credits than that course gives can't move."
          fields={[
            {
              name: 'target',
              label: 'Target course ID',
              rules: [
                { required: true, message: 'Required' },
                UUID_RULE,
                {
                  validator: async (_, value) => {
                    if (value === course.id) throw new Error("That's this course");
                  },
                },
              ],
            },
            {
              name: 'amount',
              label: 'Number of seats',
              kind: 'integer',
              min: 1,
              placeholder: 'All unused seats',
              extra:
                "Left blank, every unused seat moves. They can't be moved back until the target course is past its last date to drop.",
            },
          ]}
          okText="Transfer"
          pending={transferWrite.isPending}
          onSubmit={({ target, amount }) =>
            transferWrite.mutate({ target, amount: amount ?? 'all' })
          }
          onClose={close}
        />
      )}
      {open === 'void' && (
        <FormModal<{ name: string }>
          title="Void this course?"
          description="This drops every enrolled student, empties their project budgets and the lab's budget, and can't be undone. If a student can't be dropped, the course is voided anyway."
          fields={[typedLabName(course)]}
          okText="Void course"
          danger
          pending={voidWrite.isPending}
          onSubmit={() => voidWrite.mutate(undefined)}
          onClose={close}
        />
      )}
      {open === 'delete' && (
        <FormModal<{ name: string }>
          title="Delete this course?"
          description="This drops every enrolled student, empties the budgets, and permanently removes the course, its seats and its enrolments. The lab stays."
          fields={[typedLabName(course)]}
          okText="Delete course"
          danger
          pending={deleteWrite.isPending}
          onSubmit={() => deleteWrite.mutate(undefined)}
          onClose={close}
        />
      )}
    </>
  );
}

export function CourseDetail({ courseId }: { courseId: string }) {
  const { data: course, error } = useQuery({
    queryKey: adminQueryKeys.course({ courseId }),
    queryFn: () => getCourse(courseId),
  });

  // A deleted course is really gone, whatever the cache still holds.
  if (!course || isNotFound(error)) {
    return error ? (
      <LoadFailure error={error} what="this course" />
    ) : (
      <p className="text-neutral-4">Loading this course</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={course.virtual_lab_name}
        parent={{ label: 'Courses', href: COURSES_HREF }}
        actions={<CourseActions course={course} />}
      >
        A lab's admins assign seats and see enrolments. The API refuses those to service admins.
      </PageHeader>
      <DetailList>
        <Detail label="Status">
          <CourseStatusPill status={course.status} />
        </Detail>
        <Detail label="Course ID">
          <DetailId>{course.id}</DetailId>
        </Detail>
        <Detail label="Virtual lab">
          <AdminLink kind="vlab" id={course.virtual_lab_id} label={course.virtual_lab_name} />
        </Detail>
        <Detail label="Template project">
          <AdminLink kind="project" id={course.template_project_id} />
        </Detail>
        <Detail label="Institution">{course.institution_name}</Detail>
        <Detail label="Starts">{formatDateTime(course.start_date)}</Detail>
        <Detail label="Last date to drop">{formatDateTime(course.last_drop_date)}</Detail>
        <Detail label="Ends">{formatDateTime(course.end_date)}</Detail>
      </DetailList>
      <h2 className="text-primary-9 font-semibold">Seat batches</h2>
      <AdminQueryGrid<AdminSeatBatch>
        what="seat batches"
        columns={BATCH_COLUMNS}
        getRowId={(batch) => batch.batch_id}
        queryKey={adminQueryKeys.courseBatches({ courseId })}
        queryFn={() => getCourseSeatBatches(courseId)}
      />
    </div>
  );
}

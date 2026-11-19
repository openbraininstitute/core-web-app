'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/ui/molecules/button';

import { adminQueryKeys } from '../../../query-keys';
import { formatDateTime } from '../../../shared/format';
import { AdminQueryGrid } from '../../../shared/grid';
import { PageHeader } from '../../../shared/page-header';
import { StatusPill } from '../../../shared/status-pill';
import { adminHref } from '../../../shell/admin-link';
import { CourseStatus } from '../api/admin-types';
import { searchCourses } from '../api/education';
import { CourseCreate } from './course-form';
import { useListFilters } from './list-filters';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { AdminCourse, TCourseStatus } from '../api/admin-types';

const STATUS_TONES = {
  [CourseStatus.Draft]: 'neutral',
  [CourseStatus.Active]: 'good',
  [CourseStatus.Voided]: 'bad',
} as const;

export function CourseStatusPill({ status }: { status: TCourseStatus }) {
  return <StatusPill tone={STATUS_TONES[status]}>{status}</StatusPill>;
}

const COLUMNS: Array<ISimpleColumn<AdminCourse>> = [
  {
    id: 'lab',
    header: 'Virtual lab',
    width: { flex: 2, minWidth: 240 },
    getValue: (course) => course.virtual_lab_name,
  },
  {
    id: 'status',
    header: 'Status',
    width: { width: 120 },
    renderCell: ({ status }) => <CourseStatusPill status={status} />,
  },
  {
    id: 'institution',
    header: 'Institution',
    width: { flex: 2, minWidth: 220 },
    getValue: (course) => course.institution_name,
  },
  {
    id: 'start',
    header: 'Starts',
    width: { flex: 1, minWidth: 180 },
    getValue: (course) => formatDateTime(course.start_date),
  },
  {
    id: 'end',
    header: 'Ends',
    width: { flex: 1, minWidth: 180 },
    getValue: (course) => formatDateTime(course.end_date),
  },
];

export function CoursesList() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const { params, controls } = useListFilters({ placeholder: 'Search by virtual lab name' });
  const { query } = params;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Courses"
        actions={
          <Button rounded variant="outline" size="sm" onClick={() => setCreating(true)}>
            Create course
          </Button>
        }
      >
        The API finds a course only by its lab's name, so there's no full list. A course lab's page
        also links to its course.
      </PageHeader>
      {controls}
      {query ? (
        <AdminQueryGrid<AdminCourse>
          what="courses"
          columns={COLUMNS}
          getRowId={({ id, status }) => `${id}:${status}`}
          queryKey={adminQueryKeys.courses(query)}
          queryFn={(signal) => searchCourses(query, signal)}
          onRowClick={(course) => router.push(adminHref('course', course.id))}
        />
      ) : (
        <p className="text-neutral-4">Search to see courses.</p>
      )}
      {creating && <CourseCreate onClose={() => setCreating(false)} />}
    </div>
  );
}

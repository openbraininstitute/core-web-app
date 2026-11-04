'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/ui/molecules/button';

import { formatDateTime } from '../../../shared/format';
import { AdminQueryGrid } from '../../../shared/grid';
import { PageHeader } from '../../../shared/page-header';
import { adminQueryKeys } from '../../../shared/query-keys';
import { StatusPill } from '../../../shared/status-pill';
import { adminHref } from '../../../shell/admin-link';
import { searchCourses } from '../api/education';
import { CourseCreate } from './course-form';
import { useListFilters } from './list-filters';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { AdminCourse, CourseStatus } from '../api/admin-types';

const STATUS_TONES = { draft: 'neutral', active: 'good', voided: 'bad' } as const;

export function CourseStatusPill({ status }: { status: CourseStatus }) {
  return <StatusPill tone={STATUS_TONES[status]}>{status}</StatusPill>;
}

const COLUMNS: Array<ISimpleColumn<AdminCourse>> = [
  {
    id: 'lab',
    header: 'Virtual lab',
    width: { flex: 2, minWidth: 240 },
    renderCell: ({ virtual_lab_name: name }) => (
      <span className="text-primary-9 font-semibold">{name}</span>
    ),
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
  const { params, gridKey, controls } = useListFilters();
  const [creating, setCreating] = useState(false);
  const query = params.query;

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
        The API can only find a course by its lab's name, so there's no full list. A course lab's
        page also links to its course.
      </PageHeader>
      {controls('Search by virtual lab name')}
      {query ? (
        <AdminQueryGrid<AdminCourse>
          key={gridKey}
          what="courses"
          columns={COLUMNS}
          getRowId={({ id, status }) => `${id}:${status}`}
          queryKey={adminQueryKeys.courses({ query })}
          queryFn={() => searchCourses(query)}
          onRowClick={(course) => router.push(adminHref('course', course.id))}
        />
      ) : (
        <p className="text-neutral-4">Search to see courses.</p>
      )}
      {creating && <CourseCreate onClose={() => setCreating(false)} />}
    </div>
  );
}

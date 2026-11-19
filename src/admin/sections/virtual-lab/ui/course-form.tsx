'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { isUuid } from '@/features/data-grid/react/filters/id-tokens';

import { adminQueryKeys } from '../../../query-keys';
import { saveChanges } from '../../../shared/changed-fields';
import { afterDate, FormModal, REQUIRED } from '../../../shared/form-modal';
import { adminHref } from '../../../shell/admin-link';
import { CourseStatus } from '../api/admin-types';
import { createCourse, searchInstitutions, updateCourse } from '../api/education';
import { useTenancyWrite } from './use-tenancy-write';

import type { RuleObject } from 'antd/es/form';
import type { FormModalField } from '../../../shared/form-modal';
import type { AdminCourse, AdminCourseCreate, AdminCourseUpdate } from '../api/admin-types';

export const UUID_RULE: RuleObject = {
  validator: async (_, value?: string) => {
    if (value && !isUuid(value)) throw new Error('Enter a full ID');
  },
};

const DATE_FIELDS: FormModalField[] = [
  { name: 'start_date', label: 'Starts', kind: 'datetime', rules: [REQUIRED] },
  {
    name: 'last_drop_date',
    label: 'Last date to drop',
    kind: 'datetime',
    dependencies: ['start_date'],
    rules: [REQUIRED, ({ getFieldValue }) => afterDate(getFieldValue('start_date'), 'start')],
  },
  {
    name: 'end_date',
    label: 'Ends',
    kind: 'datetime',
    dependencies: ['last_drop_date'],
    rules: [
      REQUIRED,
      ({ getFieldValue }) => afterDate(getFieldValue('last_drop_date'), 'last date to drop'),
    ],
  },
];

function useInstitutionField(enabled = true): FormModalField {
  const { data, error, isPending } = useQuery({
    queryKey: adminQueryKeys.institutions(''),
    queryFn: ({ signal }) => searchInstitutions(undefined, signal),
    enabled,
  });

  let extra: string | undefined;
  if (isPending) extra = 'Loading institutions';
  if (error) extra = "Couldn't load the institutions, so this can't be chosen right now.";

  return {
    name: 'institution_id',
    label: 'Institution',
    kind: 'select',
    options: data?.map(({ id, name }) => ({ value: id, label: name })),
    extra,
    rules: [REQUIRED],
  };
}

export function CourseCreate({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const institutionField = useInstitutionField();
  const write = useTenancyWrite({
    write: createCourse,
    done: 'Course created as a draft',
    failed: "Couldn't create the course",
    onSuccess: ({ id }) => router.push(adminHref('course', id)),
  });

  return (
    <FormModal<AdminCourseCreate>
      title="Create a course"
      description="This creates a draft. It also gives the lab a Pro discount until the course ends, and funds the template project. The lab has to be a course lab, owned by the course account."
      fields={[
        { name: 'virtual_lab_id', label: 'Virtual lab ID', rules: [REQUIRED, UUID_RULE] },
        {
          name: 'template_project_id',
          label: 'Template project ID',
          extra: 'A project in that lab.',
          rules: [REQUIRED, UUID_RULE],
        },
        institutionField,
        ...DATE_FIELDS,
      ]}
      okText="Create"
      pending={write.isPending}
      onSubmit={write.mutate}
      onClose={onClose}
    />
  );
}

export function CourseEdit({ course, onClose }: { course: AdminCourse; onClose: () => void }) {
  // Seats keep the institution they were provisioned under, so only a draft can safely change it.
  const isDraft = course.status === CourseStatus.Draft;
  const institutionField = useInstitutionField(isDraft);
  const write = useTenancyWrite({
    write: (update: AdminCourseUpdate) => updateCourse(course.id, update),
    done: 'Course updated',
    failed: "Couldn't update the course",
    onSuccess: onClose,
  });

  return (
    <FormModal<Required<AdminCourseUpdate>>
      title={`Edit the course of ${course.virtual_lab_name}`}
      description="Changing the end date also moves the end of the lab's Pro discount."
      fields={isDraft ? [institutionField, ...DATE_FIELDS] : DATE_FIELDS}
      initialValues={course}
      okText="Save"
      pending={write.isPending}
      onSubmit={(values) => saveChanges<AdminCourseUpdate>(values, course, write.mutate, onClose)}
      onClose={onClose}
    />
  );
}

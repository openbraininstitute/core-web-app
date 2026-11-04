'use client';

import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';

import { changedFields } from '../../../shared/changed-fields';
import { FormModal } from '../../../shared/form-modal';
import { asUtc } from '../../../shared/format';
import { adminQueryKeys } from '../../../shared/query-keys';
import { adminHref } from '../../../shell/admin-link';
import { createCourse, searchInstitutions, updateCourse } from '../api/education';
import { useTenancyWrite } from './use-tenancy-write';

import type { Rule } from 'antd/es/form';
import type { Dayjs } from 'dayjs';
import type { FormModalField } from '../../../shared/form-modal';
import type { AdminCourse, AdminCourseUpdate } from '../api/admin-types';

const REQUIRED = { required: true, message: 'Required' };

export const UUID_RULE = {
  pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  message: 'Enter a full ID',
};

const after =
  (field: string, label: string): Rule =>
  ({ getFieldValue }) => ({
    validator: async (_, value?: Dayjs) => {
      const earlier: Dayjs | undefined = getFieldValue(field);
      if (value && earlier && !value.isAfter(earlier)) {
        throw new Error(`Has to be after the ${label}`);
      }
    },
  });

const DATE_FIELDS: FormModalField[] = [
  { name: 'start_date', label: 'Starts', kind: 'datetime', rules: [REQUIRED] },
  {
    name: 'last_drop_date',
    label: 'Last date to drop',
    kind: 'datetime',
    rules: [REQUIRED, after('start_date', 'start')],
  },
  {
    name: 'end_date',
    label: 'Ends',
    kind: 'datetime',
    rules: [REQUIRED, after('last_drop_date', 'last date to drop')],
  },
];

type CourseDateValues = { start_date: Dayjs; last_drop_date: Dayjs; end_date: Dayjs };

function useInstitutionOptions() {
  const { data } = useQuery({
    queryKey: adminQueryKeys.institutions({ query: '' }),
    queryFn: () => searchInstitutions(),
  });
  return data?.map(({ id, name }) => ({ value: id, label: name }));
}

export function CourseCreate({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const institutions = useInstitutionOptions();
  const write = useTenancyWrite({
    write: createCourse,
    done: 'Course created as a draft',
    failed: "Couldn't create the course",
    onSuccess: ({ id }) => router.push(adminHref('course', id)),
  });

  return (
    <FormModal<
      CourseDateValues & {
        virtual_lab_id: string;
        template_project_id: string;
        institution_id: string;
      }
    >
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
        {
          name: 'institution_id',
          label: 'Institution',
          kind: 'select',
          options: institutions,
          rules: [REQUIRED],
        },
        ...DATE_FIELDS,
      ]}
      okText="Create"
      pending={write.isPending}
      onSubmit={({ start_date: start, last_drop_date: lastDrop, end_date: end, ...ids }) =>
        write.mutate({
          ...ids,
          start_date: start.toISOString(),
          last_drop_date: lastDrop.toISOString(),
          end_date: end.toISOString(),
        })
      }
      onClose={onClose}
    />
  );
}

export function CourseEdit({ course, onClose }: { course: AdminCourse; onClose: () => void }) {
  const institutions = useInstitutionOptions();
  const write = useTenancyWrite({
    write: (update: AdminCourseUpdate) => updateCourse(course.id, update),
    done: 'Course updated',
    failed: "Couldn't update the course",
    onSuccess: onClose,
  });
  const parsed = (iso: string) => dayjs(asUtc(iso));
  const unlessSame = (date: Dayjs, iso: string) =>
    date.isSame(parsed(iso)) ? iso : date.toISOString();

  return (
    <FormModal<CourseDateValues & { institution_id: string }>
      title={`Edit the course of ${course.virtual_lab_name}`}
      description="Changing the end date also moves the end of the lab's Pro discount."
      fields={[
        {
          name: 'institution_id',
          label: 'Institution',
          kind: 'select',
          options: institutions ?? [
            { value: course.institution_id, label: course.institution_name },
          ],
          rules: [REQUIRED],
        },
        ...DATE_FIELDS,
      ]}
      initialValues={{
        institution_id: course.institution_id,
        start_date: parsed(course.start_date),
        last_drop_date: parsed(course.last_drop_date),
        end_date: parsed(course.end_date),
      }}
      okText="Save"
      pending={write.isPending}
      onSubmit={({
        institution_id: institution,
        start_date: start,
        last_drop_date: lastDrop,
        end_date: end,
      }) => {
        const update = changedFields<AdminCourseUpdate>(
          {
            institution_id: institution,
            start_date: unlessSame(start, course.start_date),
            last_drop_date: unlessSame(lastDrop, course.last_drop_date),
            end_date: unlessSame(end, course.end_date),
          },
          course
        );
        if (Object.keys(update).length) write.mutate(update);
        else onClose();
      }}
      onClose={onClose}
    />
  );
}

import { CourseStatus } from './api/admin-types';

import type { AdminCourse } from './api/admin-types';

export type CourseAction = 'edit' | 'activate' | 'provision' | 'transfer' | 'void' | 'delete';

export function courseActions(
  { status, last_drop_date: lastDropDate }: Pick<AdminCourse, 'status' | 'last_drop_date'>,
  now: Date
): CourseAction[] {
  const active = status === CourseStatus.Active;
  const actions: Array<CourseAction | false> = [
    status !== CourseStatus.Voided && 'edit',
    status === CourseStatus.Draft && 'activate',
    active && 'provision',
    active && new Date(lastDropDate) < now && 'transfer',
    status !== CourseStatus.Voided && 'void',
    !active && 'delete',
  ];
  return actions.filter((action) => action !== false);
}

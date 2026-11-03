import type { AdminUser, AdminUserProjectMembership } from '../api/admin-types';

export function userDisplayName(user: AdminUser) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
}

// The API reports a waitlisted user as `member`, but their groups tell the truth:
// `/proj/{vlab_id}/{project_id}/waitlisted`.
export function projectRole({ id, role }: AdminUserProjectMembership, groups: string[]) {
  const waitlisted = groups.some(
    (group) => group.startsWith('/proj/') && group.endsWith(`/${id}/waitlisted`)
  );
  return waitlisted ? 'waitlisted' : role;
}

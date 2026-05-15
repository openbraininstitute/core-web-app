/**
 * Whether the connected user (viewer) may cancel a pending project invite when the
 * member row has no `user.id` yet (email-only row). Virtual lab owner, virtual lab admins,
 * and project admins may cancel.
 */
export function canManagePendingProjectInviteWithoutMemberId({
  viewerId,
  virtualLabOwnerId,
  virtualLabAdmins,
  projectAdmins,
}: {
  viewerId?: string;
  virtualLabOwnerId?: string | null;
  virtualLabAdmins?: ReadonlyArray<string> | null;
  projectAdmins?: ReadonlyArray<string> | null;
}): boolean {
  if (!viewerId) return false;
  if (virtualLabOwnerId && viewerId === virtualLabOwnerId) return true;
  if (virtualLabAdmins?.includes(viewerId)) return true;
  if (projectAdmins?.includes(viewerId)) return true;
  return false;
}

/**
 * Determines whether the connected user (viewer) is allowed to change the
 * project role of the target user, given the current workspace.
 *
 * Rules:
 * - Dropdown only appears for the virtual lab owner, virtual lab admins,
 *   and project admins.
 * - Virtual lab owner can change the role of everyone (except themselves).
 * - Virtual lab admins can change the role of project admins/members only
 *   (not the virtual lab owner, not other virtual lab admins).
 * - Project admins can change the role of project members only
 *   (not the virtual lab owner, not virtual lab admins, not other project admins).
 */
export function canChangeProjectMemberRole({
  viewerId,
  targetUserId,
  virtualLabOwnerId,
  virtualLabAdmins,
  projectAdmins,
}: {
  viewerId?: string;
  targetUserId: string;
  virtualLabOwnerId?: string | null;
  virtualLabAdmins?: ReadonlyArray<string> | null;
  projectAdmins?: ReadonlyArray<string> | null;
}): boolean {
  if (!viewerId || viewerId === targetUserId) return false;

  const isVlabOwner = (id: string) => !!virtualLabOwnerId && id === virtualLabOwnerId;
  const isVlabAdmin = (id: string) => !!virtualLabAdmins?.includes(id);
  const isProjAdmin = (id: string) => !!projectAdmins?.includes(id);

  if (isVlabOwner(viewerId)) return true;

  if (isVlabAdmin(viewerId)) {
    return !isVlabOwner(targetUserId) && !isVlabAdmin(targetUserId);
  }

  if (isProjAdmin(viewerId)) {
    return !isVlabOwner(targetUserId) && !isVlabAdmin(targetUserId) && !isProjAdmin(targetUserId);
  }

  return false;
}

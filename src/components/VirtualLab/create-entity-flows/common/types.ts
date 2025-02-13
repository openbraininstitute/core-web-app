import { Role } from '@/types/virtual-lab/members';

export const MemberRoleMap = {
  member: 'member',
  admin: 'administrator',
};

export type TMember = {
  index: number;
  id: string;
  role: Role;
  initials: string;
  name: string;
  email: string;
  status?: 'pending' | 'accept' | null;
};

export const SIZE_MAP = {
  small: 'h-16 w-16',
  medium: 'h-20 w-20',
  large: 'h-24 w-24',
};

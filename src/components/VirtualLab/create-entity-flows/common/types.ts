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

export type VirtualLabFlowSteps = 'information' | 'plans' | 'members';
export type ProjectFlowSteps = 'virtual-lab' | 'information' | 'members';

export type Step = { id: VirtualLabFlowSteps | ProjectFlowSteps; label: string };

export const projectFlowSteps: Array<{ id: ProjectFlowSteps; label: string }> = [
  { id: 'virtual-lab', label: 'Virtual lab' },
  { id: 'information', label: 'Information' },
  { id: 'members', label: 'Members' },
];

export const virtualLabFlowSteps: Array<{ id: VirtualLabFlowSteps; label: string }> = [
  { id: 'information', label: 'Information' },
  { id: 'plans', label: 'Plans' },
  { id: 'members', label: 'Members' },
];

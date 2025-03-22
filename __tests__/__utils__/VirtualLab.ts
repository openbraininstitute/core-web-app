import { VirtualLab } from '@/api/virtual-lab-svc/queries/types';

export const createMockVirtualLab = (id: string, extra?: Partial<VirtualLab>): VirtualLab => ({
  id,
  name: `Mock Lab ${id}`,
  description: 'Sploosh',
  reference_email: 'sterling.archer@secretservice.cc',
  created_at: '',
  updated_at: '',
  projects_count: 0,
  members_count: 0,
  entity: 'Mock entity',
  ...extra,
});

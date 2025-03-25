import { Role } from '@/api/virtual-lab-svc/queries/types';
import { LinkItem } from '@/components/VerticalLinks';

export type LinkItemWithRequirements = LinkItem & {
  requires?: {
    userRole?: Role;
  };
};

import { Role } from './members';
import { LinkItem } from '@/components/VerticalLinks';

export type LinkItemWithRequirements = LinkItem & {
  requires?: {
    userRole?: Role;
  };
};

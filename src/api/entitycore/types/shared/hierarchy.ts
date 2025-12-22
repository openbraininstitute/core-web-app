import { TDerivationType } from '@/api/entitycore/types/entities/derivation';

export interface HierarchyNode {
  id: string;
  name: string;
  parent_id: string | null;
  children: Array<HierarchyNode>;
  authorized_public: boolean;
  authorized_project_id: string;
}

export interface HierarchyTreeResponse {
  derivation_type: TDerivationType;
  data: Array<HierarchyNode>;
}

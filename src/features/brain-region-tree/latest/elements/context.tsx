import { createContext, use } from 'react';
import { parseAsString, useQueryStates } from 'nuqs';
import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';

interface TreeConfigContextType {
  expandedIds: Set<string>;
  onToggleNode: (node: IBrainRegionHierarchy) => void;
  onSelectNode: (node: IBrainRegionHierarchy) => void;
  subtitle?: {
    text: string;
    position: 'bottom' | 'right';
  };
  shownNodeIdsSet?: Set<string>;
  indentation: {
    h?: boolean;
    v?: boolean;
    style?: string;
    size?: number;
  };
  nodeRowHeight: number;
}

export const TreeConfigContext = createContext<TreeConfigContextType | null>(null);

export const useTreeConfig = () => {
  const context = use(TreeConfigContext);
  if (!context) {
    throw new Error('useTreeConfig must be used within a TreeConfigProvider');
  }
  return context;
};

export const useBrainRegionHierarchy = () => {
  const [{ id, annotation_value, name }, updateHierarchyConfig] = useQueryStates(
    {
      id: parseAsString.withDefault(''),
      name: parseAsString.withDefault(''),
      annotation_value: parseAsString.withDefault(''),
    },
    {
      urlKeys: {
        id: 'br_id',
        name: 'br_name',
        annotation_value: 'br_av',
      },
    }
  );

  return {
    id,
    name,
    annotation_value,
    updateHierarchyConfig,
  };
};

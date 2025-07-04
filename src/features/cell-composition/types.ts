export type DensityOrCount = 'density' | 'count';
export interface RawTreeNode {
  about: 'MType' | 'EType';
  cellCounts: { neuron: number; glia: number };
  compositeId: string; // for eTypes, this will become a composite id: mTypeID__eTypeID
  label: string;
  parentId: string | null;
  leaves: string[]; // brain region leaf ids this node is associated with
  relatedNodes: string[]; // ids of child nodes (for mType, these are its eType children's composite ids)
  composition: {
    neuron: { density: number; count: number };
    glia: { density: number; count: number };
  };
  id: string; // original eType id
}

export interface TreeNode {
  about: 'MType';
  cellCounts: { neuron: number; glia: number };
  children: Array<TreeNode>;
  compositeId: string;
  count: number;
  density: number;
  id: string;
  leaves: string[];
  name: string;
  parentId: string | null;
  relatedNodes: string[];
}

type Density = {
  density: number;
  count: number;
};

export type NeuronComposition = {
  neuron: Density;
  glia: Density;
};

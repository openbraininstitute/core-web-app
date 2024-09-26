import { Dendrogram } from '@/services/dendrogram';

export type TreeValue = {
  name: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  maxLength: number;
  segments: Array<{
    length: number;
    diam: number;
  }>;
};

export type TreeNode = {
  value: TreeValue;
  /** Number of final leaves */
  spread: number;
  dendrogram: Dendrogram;
  children: TreeNode[];
};

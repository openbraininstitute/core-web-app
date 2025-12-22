import { JSX } from 'react';

export interface TTreeNode {
  id: string;
  name: string;
  children?: Array<TTreeNode>;
}

export type NodeSubtitle<T extends TTreeNode> = ({
  node,
  ...props
}: {
  node: TTreeNode & T;
  props: Partial<RenderNodeProps<T>>;
}) => JSX.Element;

export interface NodeIndentation {
  h?: boolean;
  v?: boolean;
  size?: number;
  style?: string;
}

export interface RenderNodeProps<TNode extends TTreeNode> {
  node: TNode;
  onToggle: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onClick: () => void;
  isExpanded: boolean;
  isSelected: boolean;
  hasChildren: boolean;
  level: number;
  isLast: boolean;
  dataKey: string;
  subtitle?: NodeSubtitle<TNode>;
  indentation?: NodeIndentation;
  nodeRowHeight?: number;
  defaultColor?: string;
}

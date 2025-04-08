import { ReactElement } from 'react';

export type TitleComponentProps = {
  className?: string;
  content: (...args: any[]) => ReactElement<any>;
  colorCode?: string;
  trigger: (...args: any[]) => ReactElement<any>;
  id?: string;
  isExpanded: boolean;
  onClick?: () => void;
  title: string;
  multi?: boolean;
  selectedBrainRegions: Map<string, string>;
  isLeaf: boolean;
  children?: (...args: any[]) => ReactElement<{ children?: (...args: any[]) => ReactElement<any> }>;
};

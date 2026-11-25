import type { ReactNode } from 'react';

/** Where stacked panes keep the grab bar's place and which pane is shut. */
export const StackedSplit = {
  /** A results layout's file view; the layout keeps which pane is shut. */
  File: 'file',
  /** A results layout's side panel; the layout keeps which pane is shut. */
  Panel: 'panel',
  /** The scan config's right column; shared bar place, keeps which pane is shut itself. */
  Config: 'config',
  /** Laid out like `Config`, but the bar's place belongs to this mount only. */
  Isolated: 'isolated',
} as const;

export type TStackedSplit = (typeof StackedSplit)[keyof typeof StackedSplit];

export type TStackedPane = {
  /** What its bar says once it is shut. */
  title: string;
  content: ReactNode;
  /**
   * For a WebGL view: shut, it keeps its size out of sight rather than leave
   * the layout, so nothing in it is squeezed or torn down.
   */
  keepsSize?: boolean;
  /** The box's own padding, and anything else it needs, such as clipping a scene to its corners. */
  boxClassName?: string;
};

import type { ReactNode } from 'react';

export type TScreenshot = {
  src: string;
  /** The size it is shown at on the page; the file holds twice these pixels. */
  width: number;
  height: number;
  alt: string;
  /** Shown under the enlarged image. */
  caption: string;
};

export type TSetupStep = {
  title: string;
  body: ReactNode;
  image: Omit<TScreenshot, 'caption'>;
};

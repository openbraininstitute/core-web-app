import { createContext, useContext } from 'react';

export type TPreviewRef = { id: string; type?: string | null };

/** Opens an entity in the overview's preview drawer; null outside an overview. */
export const PreviewContext = createContext<((ref: TPreviewRef) => void) | null>(null);

export const usePreview = () => useContext(PreviewContext);

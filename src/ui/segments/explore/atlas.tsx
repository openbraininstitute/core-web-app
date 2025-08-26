import type { ReactNode } from 'react';

import { AtlasViewer } from '@/features/brain-atlas-viewer';

type Props = {
  dataKey: string;
  children: ReactNode;
};

export function Atlas({ dataKey, children }: Props) {
  return (
    <div id="3d-area" className="3d bg-primary-9 relative h-full w-full rounded-2xl p-1">
      <AtlasViewer dataKey={dataKey}>{children}</AtlasViewer>
    </div>
  );
}

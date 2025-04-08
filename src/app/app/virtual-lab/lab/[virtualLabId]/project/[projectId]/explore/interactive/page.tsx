'use client';;
import { use } from "react";

import ExploreInteractivePanel from '@/components/explore-section/ExploreInteractive';
import { VirtualLabInfo } from '@/types/virtual-lab/common';

export default function VirtualLabProjectInteractiveExploreLayout(
  props: {
    params: Promise<{ virtualLabId: string; projectId: string }>;
  }
) {
  const params = use(props.params);
  const virtualLabInfo: VirtualLabInfo = {
    virtualLabId: params.virtualLabId,
    projectId: params.projectId,
  };
  return (
    <div className="flex h-screen grow flex-col">
      <ExploreInteractivePanel virtualLabInfo={virtualLabInfo} />
    </div>
  );
}

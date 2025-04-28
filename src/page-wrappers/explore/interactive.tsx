'use client';

import { tryCatch } from '@/api/utils';
import ExploreInteractivePanel from '@/components/explore-section/ExploreInteractive';
import { getBulkEntityCoreCount } from '@/services/entitycore/entities-types-count';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

type Props = {
  virtualLabId: string;
  projectId: string;
};

export default function InteractivePage(props: Props) {
  const searchParams = useSearchParams();

  const entityCounterPromise = useMemo(
    () =>
      tryCatch(
        getBulkEntityCoreCount({
          context: { virtualLabId: props.virtualLabId, projectId: props.projectId },
          brainRegion: searchParams.get('brainRegion'),
        })
      ),
    [searchParams]
  );

  return (
    <ExploreInteractivePanel
      {...{
        virtualLabInfo:
          props.virtualLabId && props.projectId
            ? {
                virtualLabId: props.virtualLabId,
                projectId: props.projectId,
              }
            : undefined,
        entityCounterPromise,
      }}
    />
  );
}

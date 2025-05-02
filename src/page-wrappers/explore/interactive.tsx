'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import ExploreInteractivePanel from '@/components/explore-section/ExploreInteractive';
import { getBulkEntityCoreCount } from '@/services/entitycore/entities-types-count';
import { tryCatch } from '@/api/utils';

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
          virtualLabId: props.virtualLabId,
          projectId: props.projectId,
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

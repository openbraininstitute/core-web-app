import { useQuery } from '@tanstack/react-query';
import { Skeleton } from 'antd';
import { isSingleNeuronSynaptome } from '@/api/entitycore/guards';
import { getMEModel } from '@/api/entitycore/queries';
import type { ISingleNeuronSynaptome } from '@/api/entitycore/types';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { MEModelPreview } from '@/ui/segments/mini-detail-view/previews/me-model-preview';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';

export function SingleNeuronSynaptomePreview({ record }: { record: ISingleNeuronSynaptome }) {
  const { virtualLabId, projectId } = useWorkspace();
  const { data: memodel, isLoading } = useQuery({
    queryKey: keyBuilder.meModel({
      virtualLabId,
      projectId,
      entityId: (record as ISingleNeuronSynaptome)?.me_model?.id,
    }),
    queryFn: () =>
      getMEModel({
        id: (record as ISingleNeuronSynaptome)?.me_model?.id!,
        context: { virtualLabId, projectId },
      }),
    enabled: isSingleNeuronSynaptome(record),
  });

  if (isLoading)
    return (
      <div className="flex w-full! items-center justify-center gap-2">
        <Skeleton.Image
          active
          className={cn('h-[200px]! w-full! rounded-none!')}
          rootClassName={cn(
            'flex h-full! w-full! flex-col items-center justify-center  m-0 rounded-none!'
          )}
        />
        <Skeleton.Image
          active
          className={cn('h-[200px]! w-full! rounded-none!')}
          rootClassName={cn(
            'flex h-full! w-full! flex-col items-center justify-center  m-0 rounded-none!'
          )}
        />
      </div>
    );
  if (memodel) return <MEModelPreview record={memodel} />;
}

import { useQuery } from '@tanstack/react-query';
import { match } from 'ts-pattern';

import { getMEModel } from '@/api/entitycore/queries/model/me-model';
import { ViewerFrame, ViewerMessage } from '@/features/logbook/editor/blocks/viewer-3d/frame';
import { ModelPreview } from '@/features/scan-config/components/model-preview';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { IViewer3dProps } from '@/features/logbook/types';

/** The workflows page's single-neuron viewer for an ME-model, read-only. */
export default function MEModelViewer3d({ entityId, project }: IViewer3dProps) {
  const memodel = useQuery({
    queryKey: keyBuilderLogbook.viewer3d('memodel', entityId),
    queryFn: () => getMEModel({ id: entityId, context: project }),
    staleTime: Number.POSITIVE_INFINITY,
  });
  return match(memodel)
    .with({ status: 'pending' }, () => <ViewerMessage text="Loading the model…" />)
    .with({ status: 'error' }, () => <ViewerMessage text="This model can't be shown." />)
    .with({ status: 'success' }, ({ data }) => (
      <ViewerFrame>
        <ModelPreview model={data} />
      </ViewerFrame>
    ))
    .exhaustive();
}

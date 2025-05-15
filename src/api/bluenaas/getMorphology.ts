import { blueNaasUrl } from '@/config';
import { createHeaders } from '@/util/utils';

export default async function getMorphology({
  modelId,
  token,
  virtualLabId,
  projectId,
}: {
  modelId: string;
  token: string;
  virtualLabId: string;
  projectId: string;
}) {
  const response = await fetch(`${blueNaasUrl}/entitycore/morphology?model_id=${modelId}`, {
    method: 'get',
    headers: createHeaders(token, {
      accept: 'application/x-ndjson',
      'virtual-lab-id': virtualLabId,
      'project-id': projectId,
    }),
  });

  return response;
}

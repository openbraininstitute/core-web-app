import { isType } from '@/util/type-guards';

import { fetchJSON } from './util';

export type AiAgentUserSettings = {
  requireApprovalForCodeExecution: boolean;
};

function isAiAgentUserSettings(data: unknown): data is AiAgentUserSettings {
  return isType(data, {
    requireApprovalForCodeExecution: 'boolean',
  });
}

export async function serviceAiAgentGetSettings(accessToken: string): Promise<AiAgentUserSettings> {
  return fetchJSON({
    method: 'GET',
    accessToken,
    path: 'settings',
    typeGuard: isAiAgentUserSettings,
  });
}

export async function serviceAiAgentPatchSettings({
  accessToken,
  requireApprovalForCodeExecution,
}: {
  accessToken: string;
  requireApprovalForCodeExecution: boolean;
}): Promise<AiAgentUserSettings> {
  return fetchJSON({
    method: 'PATCH',
    accessToken,
    path: 'settings',
    query: { requireApprovalForCodeExecution },
    typeGuard: isAiAgentUserSettings,
  });
}

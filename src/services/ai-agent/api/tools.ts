import { isType } from '@/util/type-guards';

import { asyncCreateSquash, fetchJSON } from './util';

export const serviceAiAgentListTools = asyncCreateSquash(
  async (accessToken: string): Promise<AiAgentListToolsResponse> => {
    const data = await fetchJSON({
      method: 'GET',
      accessToken,
      path: 'tools',
      typeGuard: isAiAgentListToolsResponse,
    });
    return data;
  }
);

type AiAgentListToolsResponse = Array<{ name: string; nameFrontend: string }>;

function isAiAgentListToolsResponse(data: unknown): data is AiAgentListToolsResponse {
  return isType(data, ['array', { name: 'string', nameFrontend: 'string' }]);
}

export async function serviceAiAgentGetTool(
  accessToken: string,
  toolId: string
): Promise<AiAgentGetToolResponse> {
  const data = await fetchJSON({
    method: 'GET',
    accessToken,
    path: `tools/${toolId}`,
    typeGuard: isAiAgentGetToolResponse,
  });
  return data;
}

export type AiAgentGetToolResponse = {
  name: string;
  nameFrontend: string;
  description: string;
  descriptionFrontend: string;
  isOnline: boolean;
  inputSchema: string;
};

function isAiAgentGetToolResponse(data: unknown): data is AiAgentGetToolResponse {
  return isType(data, {
    name: 'string',
    nameFrontend: 'string',
    description: 'string',
    descriptionFrontend: 'string',
    isOnline: 'boolean',
    inputSchema: 'string',
  });
}

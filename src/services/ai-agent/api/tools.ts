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

type AiAgentListToolsResponse = Array<{ name: string; name_frontend: string }>;

function isAiAgentListToolsResponse(data: unknown): data is AiAgentListToolsResponse {
  return isType(data, ['array', { name: 'string', name_frontend: 'string' }]);
}

export const serviceAiAgentGetTool = asyncCreateSquash(
  async (accessToken: string, toolId: string): Promise<AiAgentGetToolResponse> => {
    const data = await fetchJSON({
      method: 'GET',
      accessToken,
      path: `tools/${toolId}`,
      typeGuard: isAiAgentGetToolResponse,
    });
    return data;
  }
);

export type AiAgentGetToolResponse = {
  name: string;
  name_frontend: string;
  description: string;
  description_frontend: string;
  is_online: boolean;
  hil: boolean;
  input_schema: string;
};

function isAiAgentGetToolResponse(data: unknown): data is AiAgentGetToolResponse {
  return isType(data, {
    name: 'string',
    name_frontend: 'string',
    description: 'string',
    description_frontend: 'string',
    is_online: 'boolean',
    hil: 'boolean',
    input_schema: 'string',
  });
}

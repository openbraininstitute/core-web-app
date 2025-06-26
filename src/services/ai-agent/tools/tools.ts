/* eslint-disable no-param-reassign */
import React from 'react';
import {
  AiAgentGetToolResponse,
  serviceAiAgentGetTool,
  serviceAiAgentListTools,
} from '../api/tools';
import { AIAssistantTool } from './ai-assistant-tool/ai-assistant-tool';
import { useAccessToken } from '@/hooks/useAccessToken';
import { logError } from '@/util/logger';
import { useAppNotification } from '@/components/notification';

let toolsListSingleton: Promise<AIAssistantTool[] | null> | null = null;
const cacheToolsDescriptionsQueries = new Map<string, Promise<AiAgentGetToolResponse>>();

/**
 *
 * @returns A list of available AI tools.
 * Or `undefined` if the query is still pending.
 * Or `null` if an error occured.
 */
export function useAITools(): AIAssistantTool[] | undefined | null {
  const { error } = useAppNotification();
  const accessToken = useAccessToken();
  const [tools, setTools] = React.useState<AIAssistantTool[] | undefined | null>(undefined);
  React.useEffect(() => {
    if (!accessToken || tools) return;

    const action = async () => {
      if (!toolsListSingleton) toolsListSingleton = loadTools(accessToken);
      const toolsWithoutDescription = await toolsListSingleton;
      setTools(toolsWithoutDescription);
      if (!toolsWithoutDescription) return;

      try {
        for (const { id } of toolsWithoutDescription) {
          const toolResponse =
            cacheToolsDescriptionsQueries.get(id) ?? serviceAiAgentGetTool(accessToken, id);
          cacheToolsDescriptionsQueries.set(id, toolResponse);
          const tool = await toolResponse;
          if (!tool) continue;

          const index = toolsWithoutDescription.findIndex((item) => item.id === tool.name);
          if (index !== -1) {
            toolsWithoutDescription[index] = new AIAssistantTool(
              tool.name,
              tool.name_frontend,
              tool.description_frontend
            );
          }
          setTools([...toolsWithoutDescription]);
        }
      } catch (ex) {
        logError('Unable to retrieve AI tools list!', ex);
        error({ message: 'Unable to retrieve AI tools list!' });
      }
    };
    action();
  }, [accessToken, error, tools]);
  return tools;
}

async function loadTools(accessToken: string): Promise<AIAssistantTool[] | null> {
  const list = await serviceAiAgentListTools(accessToken);
  const tools: AIAssistantTool[] = list.map(
    (summary) => new AIAssistantTool(summary.name, summary.name_frontend, '')
  );
  return tools.sort(sortToolsByName);
}

function sortToolsByName(tool1: AIAssistantTool, tool2: AIAssistantTool): number {
  const name1 = tool1.name.trim().toLowerCase();
  const name2 = tool2.name.trim().toLowerCase();
  if (name1 < name2) return +1;
  if (name1 > name2) return -1;
  return 0;
}

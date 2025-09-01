const prefix = 'ai-assistant';

export const keyBuilderAI = {
  tools: () => [prefix, 'tools'],
  tool: (toolId: string) => [prefix, 'tool', toolId],
};

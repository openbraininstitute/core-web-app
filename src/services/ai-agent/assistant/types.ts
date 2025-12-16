import { UIMessage, UITools, UIDataTypes } from 'ai';

export interface AssistantContext {
  accessToken: string;
  virtualLabId: string | null;
  projectId: string | null;
}

export type AiAssistantHistory = AiAssistantHistoryItem[];

export interface AiAssistantHistoryItem {
  id: string;
  title: string;
  date: Date;
}

export type AssistantError = { message: string; reason: unknown } | null;

export type MessageMetadata = {
  toolCalls: {
    toolCallId?: string;
    validated?: 'accepted' | 'rejected' | 'pending' | 'not_required';
    isComplete?: boolean;
  }[];
};

// Extends the type of UIMessage from Vercel AI.
export type AiMessage<
  DataParts extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
> = Omit<UIMessage<unknown, DataParts, TOOLS>, 'metadata'> & {
  metadata?: MessageMetadata;
  createdAt: Date;
  isComplete: boolean;
};

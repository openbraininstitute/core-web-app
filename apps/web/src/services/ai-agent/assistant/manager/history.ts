import { keyBuilderAI } from '@/ui/use-query-keys/ai-assistant';

import { serviceAiAgentThreadList } from '../../api';

import type { useQueryClient } from '@tanstack/react-query';
import type { Signal } from '../signal';
import type {
  AiAssistantHistory,
  AiAssistantHistoryItem,
  AssistantContext,
  AssistantError,
} from '../types';

const PAGE_SIZE = 10;

export class HistoryManager {
  private cursor: string | null = null;

  private isProcessing = false;

  private currentProcess: Promise<void> | null = null;

  private hasMorePages = false;

  public queryClient?: ReturnType<typeof useQueryClient>;

  constructor(
    private readonly target: { history: Signal<AiAssistantHistory>; error: Signal<AssistantError> }
  ) {}

  get hasMore() {
    return this.hasMorePages;
  }

  readonly reset = async () => {
    await this.stop();
    this.target.history.set([]);
  };

  readonly start = async (context: AssistantContext) => {
    await this.stop();
    this.target.history.set([]);
    this.cursor = null;
    this.currentProcess = this.next(context);
    await this.currentProcess;
  };

  readonly stop = async () => {
    if (!this.isProcessing) return;

    this.isProcessing = false;
    const { currentProcess } = this;
    if (currentProcess) await currentProcess;
    this.currentProcess = null;
  };

  readonly next = async (context: AssistantContext): Promise<void> => {
    if (this.isProcessing) return;

    const { history } = this.target;
    const newList = [...history.get()];
    const existingThreadIds = new Set(newList.map((item) => item.id));
    const page = await this.loadNextPage(context);
    for (const thread of page) {
      if (!existingThreadIds.has(thread.id)) {
        newList.push(thread);
      }
    }
    const oldList = history.get();
    if (newList.length > oldList.length) history.set(newList);
  };

  private async loadNextPage(context: AssistantContext): Promise<AiAssistantHistory> {
    try {
      this.isProcessing = true;
      const { accessToken, projectId, virtualLabId } = context;

      if (this.queryClient) {
        const resp = await this.queryClient.fetchQuery({
          queryKey: [...keyBuilderAI.history(virtualLabId, projectId), this.cursor],
          queryFn: async () => {
            return await serviceAiAgentThreadList({
              accessToken,
              projectId,
              virtualLabId,
              cursor: this.cursor,
              pageSize: PAGE_SIZE,
              excludeEmpty: true,
            });
          },
          staleTime: 30000,
        });
        this.cursor = resp.nextCursor ?? null;
        this.hasMorePages = resp.hasMore;
        return resp.results.map((result) => {
          const item: AiAssistantHistoryItem = {
            id: result.id,
            title: result.title,
            date: new Date(result.updatedAt),
          };
          return item;
        });
      }

      return [];
    } catch (ex) {
      this.target.error.set({ message: 'Unable to load chat history!', reason: ex });
      return [];
    } finally {
      this.isProcessing = false;
    }
  }
}

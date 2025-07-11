import { serviceAiAgentThreadList } from '../../api';
import { Signal } from '../signal';
import {
  AiAssistantHistory,
  AiAssistantHistoryItem,
  AssistantContext,
  AssistantError,
} from '../types';

const PAGE_SIZE = 10;

export class HistoryManager {
  private currentThreadId: string | undefined = undefined;

  private cursor: string | null = null;

  private isProcessing = false;

  private currentProcess: Promise<void> | null = null;

  constructor(
    private readonly target: { history: Signal<AiAssistantHistory>; error: Signal<AssistantError> }
  ) {}

  start = async (context: AssistantContext, threadId: string) => {
    if (threadId === this.currentThreadId) {
      // We are already loading history for this thread.
      return;
    }

    await this.stop();
    this.target.history.set([]);
    this.currentProcess = this.process(context, threadId);
    await this.currentProcess;
  };

  readonly stop = async () => {
    if (!this.isProcessing) return;

    this.isProcessing = false;
    const { currentProcess } = this;
    if (currentProcess) await currentProcess;
    this.currentProcess = null;
  };

  private async process(context: AssistantContext, threadId: string): Promise<void> {
    this.cursor = null;
    this.isProcessing = true;
    this.currentThreadId = threadId;
    const { history } = this.target;
    while (this.isProcessing) {
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
    }
    this.isProcessing = false;
  }

  private async loadNextPage(context: AssistantContext): Promise<AiAssistantHistory> {
    try {
      const { accessToken, projectId, virtualLabId } = context;
      const resp = await serviceAiAgentThreadList({
        accessToken,
        projectId,
        virtualLabId,
        cursor: this.cursor,
        pageSize: PAGE_SIZE,
      });
      this.isProcessing = resp.has_more;
      this.cursor = resp.next_cursor ?? null;
      return resp.results.map((result) => {
        const item: AiAssistantHistoryItem = {
          id: result.thread_id,
          title: result.title,
          date: new Date(result.update_date),
        };
        return item;
      });
    } catch (ex) {
      this.isProcessing = false;
      this.target.error.set({ message: 'Unable to load chat history!', reason: ex });
      return [];
    }
  }
}

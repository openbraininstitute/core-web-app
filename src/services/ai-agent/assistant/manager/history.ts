import { serviceAiAgentThreadList } from '../../api';
import type { Signal } from '../signal';
import type {
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

  private hasMorePages = false;

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

  readonly start = async (context: AssistantContext, threadId: string) => {
    if (threadId === this.currentThreadId) {
      // We are already loading history for this thread.
      return;
    }

    await this.stop();
    this.target.history.set([]);
    const lastThread = await this.getLastThread(context);
    if (!lastThread) return;

    this.target.history.set([lastThread]);
    this.currentThreadId = threadId;
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
      const resp = await serviceAiAgentThreadList({
        accessToken,
        projectId,
        virtualLabId,
        cursor: this.cursor,
        pageSize: PAGE_SIZE,
        excludeEmptyThreads: true,
      });
      this.cursor = resp.next_cursor ?? null;
      return resp.results.map((result) => {
        const item: AiAssistantHistoryItem = {
          id: result.thread_id,
          title: result.title,
          date: new Date(result.update_date),
        };
        this.hasMorePages = resp.has_more;
        return item;
      });
    } catch (ex) {
      this.target.error.set({ message: 'Unable to load chat history!', reason: ex });
      return [];
    } finally {
      this.isProcessing = false;
    }
  }

  private async getLastThread(
    context: AssistantContext
  ): Promise<AiAssistantHistoryItem | undefined> {
    try {
      const { accessToken, projectId, virtualLabId } = context;
      const resp = await serviceAiAgentThreadList({
        accessToken,
        projectId,
        virtualLabId,
        cursor: this.cursor,
        pageSize: 1,
        excludeEmptyThreads: false,
      });
      const [firstItem] = resp.results;
      if (!firstItem) return undefined;

      const thread: AiAssistantHistoryItem = {
        id: firstItem.thread_id,
        title: firstItem.title,
        date: new Date(firstItem.update_date),
      };
      return thread;
    } catch (ex) {
      this.target.error.set({ message: 'Unable to load chat history last item!', reason: ex });
      return undefined;
    }
  }
}

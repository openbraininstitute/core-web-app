import debounce from 'lodash/debounce';

import { serviceAiAgentThreadCreate } from '../api';
import { Signal } from './signal';
import { AssistantContext } from './types';
import { InitializerThread } from './init/thread';

import { useAccessToken } from '@/hooks/useAccessToken';
import { useParamProjectId, useParamVirtualLabId } from '@/util/params';

class AiAssistantClass {
  public readonly threadId = new Signal<string | undefined>(undefined);

  private readonly accessToken = new Signal('NO-TOKEN');

  private readonly virtualLabId = new Signal<string | null>(null);

  private readonly projectId = new Signal<string | null>(null);

  private readonly threadInitializer = new InitializerThread(this);

  constructor() {
    this.accessToken.event.addListener(this.handleInit);
    this.virtualLabId.event.addListener(this.handleInit);
    this.projectId.event.addListener(this.handleInit);
  }

  init({ accessToken, virtualLabId, projectId }: AssistantContext) {
    this.accessToken.set(accessToken);
    this.virtualLabId.set(virtualLabId);
    this.projectId.set(projectId);
  }

  async createThread() {
    const thread = await serviceAiAgentThreadCreate({
      ...this.context,
      title: new Date().toUTCString(),
    });
    const { threadId } = thread;
    this.threadId.set(threadId);
    return threadId;
  }

  private get context(): AssistantContext {
    return {
      accessToken: this.accessToken.get(),
      virtualLabId: this.virtualLabId.get(),
      projectId: this.projectId.get(),
    };
  }

  private readonly handleInit = debounce(() => {
    this.threadInitializer.init(this.context);
  }, 50);
}

const AiAssistant = new AiAssistantClass();

export function useAiAssistant(): Omit<AiAssistantClass, 'init'> {
  const accessToken = useAccessToken() ?? 'NO-TOKEN';
  const virtualLabId = useParamVirtualLabId();
  const projectId = useParamProjectId();
  AiAssistant.init({ accessToken, virtualLabId, projectId });
  return AiAssistant;
}

import { useAppMessage } from '@/components/notification';
import { AiAssistant } from '@/services/ai-agent/assistant/assistant';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';

function waitForAssistantReady(timeoutMs = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now();

    const check = () => {
      const threadId = AiAssistant.threadId.get();
      const status = AiAssistant.chat.status.get();
      const healthError = AiAssistant.healthError.get();

      if (healthError) {
        resolve(false);
        return;
      }

      if (threadId && status === 'ready') {
        resolve(true);
        return;
      }

      if (Date.now() - start > timeoutMs) {
        resolve(false);
        return;
      }

      setTimeout(check, 200);
    };

    check();
  });
}

export function useAssistantQuestion() {
  const { setState } = usePanelState();
  const message = useAppMessage();

  const sendQuestion = async (question: string) => {
    setState(PanelState.Expanded);

    const ready = await waitForAssistantReady();
    if (ready) {
      AiAssistant.chat.sendMessage(question);
    } else {
      message.warning('The AI assistant is temporarily unavailable. Please try again later.');
    }
  };

  return { sendQuestion };
}

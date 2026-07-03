import { useSetAtom } from 'jotai';

import { pendingAssistantQuestionAtom } from '@/features/ai-assistant/state';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';

export function useAssistantQuestion() {
  const { setState } = usePanelState();
  const setPendingQuestion = useSetAtom(pendingAssistantQuestionAtom);

  const sendQuestion = (question: string) => {
    setPendingQuestion(question);
    setState(PanelState.Expanded);
  };

  return { sendQuestion };
}

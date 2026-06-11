import { atom, useSetAtom } from 'jotai';

import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';

export const pendingAssistantQuestionAtom = atom<string | null>(null);

export function useAssistantQuestion() {
  const { setState } = usePanelState();
  const setPendingQuestion = useSetAtom(pendingAssistantQuestionAtom);

  const sendQuestion = (question: string) => {
    setPendingQuestion(question);
    setState(PanelState.Expanded);
  };

  return { sendQuestion };
}

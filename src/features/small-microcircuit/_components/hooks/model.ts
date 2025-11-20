import { useAtomValue } from 'jotai';
import { modelAtomFamily } from '../atoms';

import { WorkspaceContext } from '@/types/common';

export default function useModel({ id, context }: { id: string; context: WorkspaceContext }) {
  const modelAtom = modelAtomFamily({ id, context });
  const model = useAtomValue(modelAtom);

  return { model };
}

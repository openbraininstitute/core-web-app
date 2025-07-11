import { atom } from 'jotai';
import isEqual from 'lodash/isEqual';

import { JobStatus, Message, MessageType } from '@/services/small-scale-simulator/types';
import { WorkspaceContext } from '@/types/common';
import { atomFamilyWithExpiration } from '@/util/atoms';
import { runSingleNeuronValidation } from '@/api/small-scale-simulator';
import { readNdjsonResponse } from '@/utils/response';

export const runValidationAtomFamily = atomFamilyWithExpiration(
  ({ modelId, ctx }: { modelId: string; ctx: WorkspaceContext }) => {
    const jobStatusAtom = atom<JobStatus>(JobStatus.CREATED);
    const alreadyRunningAtom = atom<Boolean>(false);

    return atom(
      (get) => get(jobStatusAtom),
      async (get, set) => {
        if (get(alreadyRunningAtom)) return;

        set(alreadyRunningAtom, true);

        try {
          const response = await runSingleNeuronValidation({ modelId, ctx });

          await readNdjsonResponse<Message<null>>(response, (message) => {
            if (message.message_type !== MessageType.STATUS) return;

            set(jobStatusAtom, message.status);
          });
        } catch (error) {
          set(jobStatusAtom, JobStatus.ERROR);
        } finally {
          set(alreadyRunningAtom, false);
        }
      }
    );
  },
  {
    ttl: 240_000, // 4 minutes
    areEqual: isEqual,
  }
);

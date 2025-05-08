import { useCallback } from 'react';
import omit from 'lodash/omit';
import get from 'lodash/get';

import { updateUserProfile } from '@/api/virtual-lab-svc/queries/user';
import { tryCatch } from '@/api/utils';
import { Placement } from '@/types/notifications';
import { UserProfileResponse } from '@/api/virtual-lab-svc/queries/types';

interface FieldInfo {
  errors?: string[];
}

export function useFieldsChangeHandler(setValid: (value: boolean) => void) {
  return useCallback(
    (_changedFields: FieldInfo[], allFields: FieldInfo[]) => {
      const error = allFields.find((item) => (item.errors ?? []).length > 0);
      setValid(!error);
    },
    [setValid]
  );
}

export function useSubmitCallback(
  startTransition: React.TransitionStartFunction,
  errorNotify: (
    message: string,
    duration?: number,
    placement?: Placement,
    closeIcon?: boolean,
    key?: React.Key,
    description?: string
  ) => void,
  successNotify: (
    message: string,
    duration?: number,
    placement?: Placement,
    closeIcon?: boolean,
    key?: React.Key,
    description?: string
  ) => void
) {
  return useCallback(
    (values: UserProfileResponse) => {
      startTransition(async () => {
        const { error } = await tryCatch(
          updateUserProfile(omit(values, ['email_verified', 'id'])),
          undefined,
          {
            section: 'profile-page',
            feature: 'update-user-profile',
          }
        );
        if (error) {
          if (get(error, 'cause.error_code') === 'ENTITY_UPDATE__ERROR') {
            errorNotify(
              `We couldn’t update your information. Please check your input and try again.`,
              undefined,
              'topRight',
              true,
              'profile-update-error'
            );
            return;
          }
          errorNotify(
            'Unable to save your profile changes due to a server error.\nPlease verify your information and try submitting again.',
            undefined,
            'topRight',
            true,
            'profile-update-error'
          );
        } else {
          successNotify(
            'Your profile information has been successfully updated',
            undefined,
            'topRight',
            true,
            'profile-update-success'
          );
        }
      });
    },
    [startTransition, errorNotify, successNotify]
  );
}

import { NotificationInstance } from 'antd/es/notification/interface';
import { useCallback } from 'react';
import omit from 'lodash/omit';
import get from 'lodash/get';

import { UserProfileResponse } from '@/api/virtual-lab-svc/queries/types';
import { updateUserProfile } from '@/api/virtual-lab-svc/queries/user';
import { tryCatch } from '@/api/utils';

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
  errorNotify: NotificationInstance['error'],
  successNotify: NotificationInstance['success']
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
            errorNotify({
              message: `We couldn’t update your information. Please check your input and try again.`,
              placement: 'topRight',
              key: 'profile-update-error',
            });
            return;
          }
          errorNotify({
            message:
              'Unable to save your profile changes due to a server error.\nPlease verify your information and try submitting again.',
            placement: 'topRight',
            key: 'profile-update-error',
          });
        } else {
          successNotify({
            message: 'Your profile information has been successfully updated',
            placement: 'topRight',
            key: 'profile-update-success',
          });
        }
      });
    },
    [startTransition, errorNotify, successNotify]
  );
}

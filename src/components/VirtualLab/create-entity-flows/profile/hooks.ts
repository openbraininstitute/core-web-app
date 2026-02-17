import { useMutation, useQueryClient } from '@tanstack/react-query';
import get from 'es-toolkit/compat/get';
import omit from 'es-toolkit/compat/omit';
import { useCallback } from 'react';

import { updateUserProfile } from '@/api/virtual-lab-svc/queries/user';
import { keyBuilder } from '@/ui/use-query-keys/user';

import type { NotificationInstance } from 'antd/es/notification/interface';
import type { UserProfileResponse } from '@/api/virtual-lab-svc/queries/types';

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
  errorNotify: NotificationInstance['error'],
  successNotify: NotificationInstance['success']
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: UserProfileResponse) =>
      updateUserProfile(omit(values, ['email_verified', 'id'])),
    onSuccess: () => {
      successNotify({
        message: 'Your profile information has been successfully updated',
        placement: 'topRight',
        key: 'profile-update-success',
      });
    },
    onError: (error) => {
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
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: keyBuilder.profile(),
      });
    },
  });
}

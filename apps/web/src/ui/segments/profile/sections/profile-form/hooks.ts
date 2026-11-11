import { useMutation, useQueryClient } from '@tanstack/react-query';
import get from 'es-toolkit/compat/get';

import { updateUserProfile } from '@/api/virtual-lab-svc/queries/user';
import { keyBuilder } from '@/ui/use-query-keys/user';

import type { NotificationInstance } from 'antd/es/notification/interface';
import type { TUpdateUserProfileRequest } from '@/api/virtual-lab-svc/queries/types';

export function useSubmitCallback(
  errorNotify: NotificationInstance['error'],
  successNotify: NotificationInstance['success']
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: TUpdateUserProfileRequest) => {
      return updateUserProfile(values);
    },
    onSuccess: () => {
      successNotify({
        message: 'Your profile information has been successfully updated',
        placement: 'topRight',
        key: 'profile-update-success',
      });
    },
    onError: (error) => {
      if (get(error, 'cause.code') === 'DATA_CONFLICT') {
        errorNotify({
          message: get(
            error,
            'cause.message',
            'We’re unable to update your profile with this email address. Please make sure the email is correct or try another one.'
          ),
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

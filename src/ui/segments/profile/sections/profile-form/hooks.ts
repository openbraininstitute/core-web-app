import { useMutation, useQueryClient } from '@tanstack/react-query';
import get from 'es-toolkit/compat/get';

import { updateUserProfile } from '@/api/virtual-lab-svc/queries/user';
import { notify } from '@/components/notification';
import { keyBuilder } from '@/ui/use-query-keys/user';

import type { TUpdateUserProfileRequest } from '@/api/virtual-lab-svc/queries/types';

export function useSubmitCallback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: TUpdateUserProfileRequest) => {
      return updateUserProfile(values);
    },
    onSuccess: () => {
      notify.success({
        title: 'Profile updated',
        description: 'Your profile information has been successfully updated',
        key: 'profile-update-success',
      });
    },
    onError: (error) => {
      if (get(error, 'cause.code') === 'DATA_CONFLICT') {
        notify.error({
          title: 'Profile update failed',
          description: get(
            error,
            'cause.message',
            'We’re unable to update your profile with this email address. Please make sure the email is correct or try another one.'
          ),
          key: 'profile-update-error',
        });
        return;
      }
      notify.error({
        title: 'Profile update failed',
        description:
          'Unable to save your profile changes due to a server error.\nPlease verify your information and try submitting again.',
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

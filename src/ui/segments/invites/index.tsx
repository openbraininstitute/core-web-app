'use client';

import { useRouter } from '@bprogress/next/app';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { ApiErrorCause } from '@/api/error';
import { tryCatch } from '@/api/utils';
import { acceptInvite } from '@/api/virtual-lab-svc/queries/invite';
import { listProjects } from '@/api/virtual-lab-svc/queries/project';
import { config } from '@/config';
import {
  type InvitationContentResponse,
  InviteErrorCodes,
  InviteOriginDict,
} from '@/types/virtual-lab/invites';
import { Button } from '@/ui/molecules/button';
import { Card, CardDescription } from '@/ui/molecules/card';
import { getErrorUrl } from '@/ui/segments/invites/helpers';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';

export function InvitationProcessing({ data }: { data: InvitationContentResponse }) {
  const { data: session } = useSession();
  const inviteToken = useSearchParams().get('token');
  const { push: navigate } = useRouter();

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async () => acceptInvite({ token: inviteToken }),
    onSuccess: (result) => {
      if (result.data.status === 'already_accepted') {
        return `/?errorcode=${InviteErrorCodes.INVITE_ALREADY_ACCEPTED}&origin=${origin}&lab_id=${result.data.virtual_lab_id}&project_id=${result.data.project_id}`;
      }
    },
    onError(error) {
      navigate(
        getErrorUrl({
          error: error.cause as ApiErrorCause,
          accessToken: session?.accessToken,
          inviteToken,
        })
      );
    },
    async onSettled(result, err) {
      log('error', 'error invitation processing', err);
      if (result) {
        const { origin } = result.data;
        if (origin) {
          if (origin === InviteOriginDict.Lab) {
            const { data: results, error } = await tryCatch(
              listProjects({ virtualLabId: result.data.virtual_lab_id, page: 1, size: 1 })
            );
            if (error) {
              navigate(`${config.ROOT_ROUTE}/sync`);
            }
            const projectId = results?.data?.results.at(0)?.id;
            if (projectId) {
              navigate(`${config.ROOT_ROUTE}/${result.data.virtual_lab_id}/${projectId}`);
            } else {
              navigate(`${config.ROOT_ROUTE}/sync`);
            }
          } else if (origin === InviteOriginDict.Project) {
            navigate(
              `${config.ROOT_ROUTE}/${result.data.virtual_lab_id}/${result.data.project_id}`
            );
          }
        }
      }
    },
  });

  const virtualLabText = data.data.origin === InviteOriginDict.Lab && (
    <div>
      <strong>{data.data.inviter_full_name}</strong> has invited you to join the virtual lab,
      titled:
      <strong className="text-primary-8 ml-0.5 font-bold">{data.data.virtual_lab_name}</strong>
    </div>
  );

  const projectText = data.data.origin === InviteOriginDict.Project && (
    <div>
      <strong>{data.data.inviter_full_name}</strong> has invited you to join the project, titled:
      <strong className="text-primary-8 ml-0.5 font-bold">{data.data.project_name}</strong>
    </div>
  );

  const welcomeText = virtualLabText || projectText;

  return (
    <Card
      borderless
      className={cn(
        'relative z-[9999] w-full max-w-2xl bg-white',
        '[box-shadow:12px_12px_45px_0px_#0000001F,_-8px_-8px_24px_0px_#FFFFFFD1]'
      )}
    >
      <CardDescription className="flex flex-col items-center gap-4 px-10 select-none">
        <div className="text-primary-9 w-full self-start py-2 text-left text-2xl">
          Welcome to the Open Brain Platform
        </div>
        <div className="text-md border-neutral-2 text-primary-9 w-full border-y py-4 text-xl">
          {welcomeText}
        </div>
        <div className="mt-12 flex justify-center gap-4 text-lg">
          <Button asChild rounded variant="ghost" size="lg" className="h-14 px-10 text-xl">
            <Link href="/app/virtual-lab/sync">Cancel</Link>
          </Button>
          <Button
            rounded
            size="lg"
            onClick={() => mutateAsync()}
            variant="success"
            type="button"
            className="h-14 px-10 text-xl"
            disabled={isPending}
          >
            Accept
          </Button>
        </div>
      </CardDescription>
    </Card>
  );
}

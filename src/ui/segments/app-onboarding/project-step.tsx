'use client';

import { CheckCircleFilled, LoadingOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { customAlphabet } from 'nanoid';
import Link from 'next/link';

import { AUTO_INIT_WORKSPACE, V2_MIGRATION_TEMPORARY_BASE_PATH } from '@/config';
import { createProject } from '@/api/virtual-lab-svc/queries/project';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { Card, CardContent } from '@/ui/molecules/card';
import { Button } from '@/ui/molecules/button';

type Props = {
  virtualLabId?: string;
  virtualLabName?: string;
};

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);
const ADJECTIVES = [
  'cognitive',
  'synaptic',
  'neuroplastic',
  'dynamic',
  'focused',
  'curious',
  'vivid',
  'insightful',
  'quantum',
  'plastic',
  'neuronal',
  'robust',
];
const NOUNS = [
  'cajal',
  'brodmann',
  'raman',
  'hodgkin',
  'mountcastle',
  'ekstrom',
  'hubel',
  'weisel',
  'ramon',
  'descartes',
  'torvalds',
  'tesla',
];

const randomProjectName = () => {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const id = nanoid(); // generates 6 char random string

  return `${adjective}-${noun}-${id}`;
};

export function ProjectStep({ virtualLabId, virtualLabName }: Props) {
  const breakpoint = useDefaultBreakpoint();
  const queryClient = useQueryClient();

  const ref = useRef(false);
  const [store, updateAutoInitWorkspace] = useLocalStorage<{
    done: boolean;
    date: number | null;
    virtualLabId: string | null;
  }>(AUTO_INIT_WORKSPACE, {
    done: false,
    date: null,
    virtualLabId: null,
  });

  const { mutateAsync, isSuccess, isPending, data } = useMutation({
    mutationFn: () =>
      createProject(virtualLabId!, {
        name: randomProjectName(),
        description: 'first project created by the platform',
        include_members: [],
      }),
    retry: 1,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [keyBuilder.listAllLabs()],
      });
      queryClient.invalidateQueries({
        queryKey: [keyBuilder.listWorkspaceProjects({ virtualLabId: virtualLabId! })],
      });
    },
  });

  const navigateToProject = () => {
    return `${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${data?.data?.project.id}`;
  };

  useEffect(() => {
    async function initWorkspace() {
      if ((!store.done || virtualLabId !== store.virtualLabId) && virtualLabId && !ref.current) {
        ref.current = true;
        await mutateAsync();
        updateAutoInitWorkspace({
          done: true,
          date: new Date().getTime(),
          virtualLabId,
        });
      }
    }
    initWorkspace();
  }, [virtualLabId, store]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full max-w-xl space-y-6">
      <Card className="flex w-full flex-col bg-transparent shadow-none backdrop-blur-sm">
        {isPending && (
          <div className="relative flex w-full flex-col items-center justify-center gap-3">
            <LoadingOutlined className="text-2xl" spin />
            <span className="text-neutral-3">Create your first project in progress...</span>
          </div>
        )}
        {isSuccess && (
          <CardContent className="mx-auto max-w-sm p-8 text-center">
            <div className="mb-6 flex items-start justify-center gap-3">
              <CheckCircleFilled className="mt-1.5 flex-shrink-0 text-green-600" />
              <p className="text-primary-9 max-w-md text-left">
                Congratulations! Your virtual lab {virtualLabName} has been created. We have created
                for you your first project. It means that you are ready to go!
              </p>
            </div>

            <Button
              rounded
              asChild={Boolean(virtualLabId && data?.data?.project.id)}
              variant="success"
              size={breakpoint === 'xl' ? 'lg' : 'md'}
              onClick={navigateToProject}
              disabled={!virtualLabId || !data?.data?.project.id}
              className="h-auto w-full px-8! py-3!"
            >
              <Link
                aria-disabled={!virtualLabId || !data?.data?.project.id}
                href={navigateToProject()}
              >
                Go to project
              </Link>
            </Button>
          </CardContent>
        )}
      </Card>

      <div className="w-full">
        <p className="text-neutral-4 mb-4 text-left text-sm">Just before you go</p>
        <div className="grid justify-items-stretch gap-4 md:grid-cols-2">
          <Link href="/">
            <Card
              borderless
              className="h-full cursor-pointer bg-white/95 shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl"
            >
              <CardContent>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-neutral-4 text-xs tracking-wide uppercase">Video</span>
                </div>
                <h3 className="text-xl leading-tight font-bold text-blue-900">
                  How to use the OBI platform?
                </h3>
              </CardContent>
            </Card>
          </Link>

          <Link href="/">
            <Card
              borderless
              className="h-full cursor-pointer bg-white/95 shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl"
            >
              <CardContent>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-neutral-4 text-xs tracking-wide uppercase">Guides</span>
                </div>
                <h3 className="text-xl leading-tight font-bold text-blue-900">
                  How to launch workflows?
                </h3>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import { CheckCircleFilled } from '@ant-design/icons';
import Link from 'next/link';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { V2_MIGRATION_TEMPORARY_BASE_PATH } from '@/config';
import { Card, CardContent } from '@/ui/molecules/card';
import { Button } from '@/ui/molecules/button';

type Props = {
  virtualLabId?: string;
  virtualLabName?: string;
  projectId?: string;
  error?: string | null;
};

export function ProjectSetup({ virtualLabId, projectId, virtualLabName, error }: Props) {
  const breakpoint = useDefaultBreakpoint();

  const navigateToProject = () => {
    return `${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${projectId}`;
  };

  return (
    <div className="w-full max-w-xl space-y-6">
      <Card className="flex w-full flex-col bg-transparent shadow-none backdrop-blur-sm">
        {virtualLabId && projectId ? (
          <CardContent className="mx-auto max-w-sm p-8 text-center">
            <div className="mb-6 flex items-start justify-center gap-3">
              <CheckCircleFilled className="mt-1.5 flex-shrink-0 text-green-600" />
              <p className="text-primary-9 max-w-md text-left">
                Congratulations! Your virtual lab{' '}
                <strong className="font-bold">{virtualLabName}</strong> has been created. We have
                created for you your first project. It means that you are ready to go!
              </p>
            </div>

            <Button
              rounded
              asChild
              variant="success"
              size={breakpoint === 'xl' ? 'lg' : 'md'}
              onClick={navigateToProject}
              className="h-auto w-full px-8! py-3! hover:text-white"
            >
              <Link href={navigateToProject()}>Go to project</Link>
            </Button>
          </CardContent>
        ) : (
          error && (
            <div className="mb-6 flex items-start justify-center gap-3">
              <CheckCircleFilled className="text-destructive mt-1.5 flex-shrink-0" />
              <p className="text-primary-9 max-w-md text-left">
                Sorry, we couldn&apos;t create your project. This is a temporary issue, please try
                again later.
              </p>
            </div>
          )
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

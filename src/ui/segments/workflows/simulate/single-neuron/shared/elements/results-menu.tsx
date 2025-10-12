/* eslint-disable react/no-array-index-key */

'use client';

import { LoadingOutlined, RightOutlined } from '@ant-design/icons';
import { usePathname, useSearchParams } from 'next/navigation';
import { kebabCase, uniqBy } from 'es-toolkit/compat';
import { useMutation } from '@tanstack/react-query';

import type { ZodError } from 'zod';

import { useSingleNeuronSimulationAtoms } from '@/ui/segments/workflows/simulate/single-neuron/shared/use-simulation-atoms';
import { SimulationStatus } from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { exportSimulationResultsAsZip } from '@/util/simulation-plotly-to-csv';
import {
  ExperimentalSetupConfigurationSchema,
  OverviewConfigurationSchema,
  NeuronLocationArraySchema,
  SimulationType,
  StimulationConfigurationSchema,
  SynapseConfigurationArraySchema,
  type TSimulationType,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useAppNotification } from '@/components/notification';
import { browserHistoryReplace } from '@/utils/browser';
import { messages } from '@/i18n/en/simulation';
import { Button } from '@/ui/molecules/button';
import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';

import styles from './results-menu.module.css';

type Props = {
  sessionId: string;
  type: TSimulationType;
};

export function Menu({ sessionId, type }: Props) {
  const pathname = usePathname();
  const queryParams = useSearchParams();
  const notification = useAppNotification();
  const breakpoint = useDefaultBreakpoint();

  const {
    overviewConfiguration,
    experimentalSetupConfiguration,
    recordLocationConfiguration,
    synaptomeConfiguration,
    stimulationConfiguration,
    simulationResults,
    simulationStatus,
  } = useSingleNeuronSimulationAtoms(sessionId);

  const current = queryParams.get('record') ?? 'all';
  const configError =
    NeuronLocationArraySchema.safeParse(recordLocationConfiguration).error ??
    ExperimentalSetupConfigurationSchema.safeParse(experimentalSetupConfiguration).error ??
    StimulationConfigurationSchema.safeParse(stimulationConfiguration).error ??
    OverviewConfigurationSchema.safeParse(overviewConfiguration).error ??
    (type === SimulationType.SingleNeuronSynaptome &&
      SynapseConfigurationArraySchema.safeParse(synaptomeConfiguration).error);

  const onChange = (value: string) => {
    const params = new URLSearchParams(queryParams);
    params.set('record', value);
    params.delete('step');

    browserHistoryReplace(null, `${pathname}?${params.toString()}`);
  };

  const mutateDownloadResultsAsZip = useMutation({
    mutationFn: () =>
      exportSimulationResultsAsZip({
        name: kebabCase(overviewConfiguration.name) ?? 'simulation_plots',
        result: simulationResults!,
      }),
    onSuccess: () => {
      notification.success({
        message: messages.DownloadSuccessful,
        placement: 'topRight',
        key: 'download-simulation-zip',
      });
    },
    onError: () => {
      notification.error({
        message: messages.DownloadFailed,
        placement: 'topRight',
        key: 'download-simulation-zip',
      });
    },
  });

  const controlsDisabled = simulationStatus?.status !== SimulationStatus.SAVED;

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="secondary-scrollbar flex h-full w-full flex-col items-center justify-start gap-2 overflow-y-auto scroll-auto pr-1.5">
        <Button
          rounded
          variant="outline"
          size={breakpoint === 'l' ? 'md' : 'lg'}
          className={cn('w-full justify-start pr-2! font-bold shadow-md')}
          onClick={() => onChange('all')}
          active={current === 'all'}
        >
          <div className="flex w-full items-center justify-between gap-2">
            <div>All</div>
            <RightOutlined
              className={cn('text-neutral-4 mr-2 [&_svg]:size-3!', {
                '-rotate-180 transform text-white!': current === 'all',
              })}
            />
          </div>
        </Button>
        {uniqBy(recordLocationConfiguration, (item) => `${item.section}-${item.offset}`).map(
          ({ section, offset, color }, indx) => {
            const record = `${section}_${offset === 0 ? '0.0' : String(offset)}`;
            return (
              <Button
                // eslint-disable-next-line react/no-array-index-key
                key={`${record}_${indx}`}
                rounded
                variant="outline"
                size={breakpoint === 'l' ? 'md' : 'lg'}
                className={cn('w-full justify-start pr-2! font-bold shadow-md')}
                onClick={() => onChange(record)}
                active={record === current}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <div>{record}</div>
                  <div className="mr-2 ml-auto flex items-center justify-center gap-1">
                    <div
                      className="size-3! rounded-full border border-white"
                      style={{ background: color }}
                    />
                    <RightOutlined
                      className={cn('text-neutral-4 [&_svg]:size-3!', {
                        '-rotate-180 transform text-white!': current === record,
                      })}
                    />
                  </div>
                </div>
              </Button>
            );
          }
        )}
      </div>
      <div className="mt-auto flex w-full items-center justify-center gap-2 pr-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="mt-auto w-full">
              <Button
                rounded
                variant="outline"
                size={breakpoint === 'l' ? 'md' : 'lg'}
                className={cn(
                  'disabled:bg-neutral-2 disabled:text-neutral-4! w-full justify-center px-10 font-medium!'
                )}
                onClick={() => mutateDownloadResultsAsZip.mutateAsync()}
                disabled={controlsDisabled}
              >
                <div className="flex-shrink-0 font-bold">
                  Download <span className="font-light">(csv)</span>
                </div>
                {mutateDownloadResultsAsZip.isPending && (
                  <LoadingOutlined className="ml-2 text-white" />
                )}
              </Button>
            </div>
          </TooltipTrigger>
          {controlsDisabled && (
            <TooltipContent
              sideOffset={10}
              collisionPadding={{ left: 20 }}
              arrowClassName={configError ? styles.error : 'bg-primary-9'}
              className={classNames(configError && styles.error)}
            >
              {configError ? (
                <p>{extractErrorMessage(configError)}</p>
              ) : (
                <p className={cn('max-w-80 text-left text-sm break-words hyphens-auto')}>
                  Almost there! To download your simulation results, please let it finish running
                  and make sure the details are complete
                </p>
              )}
            </TooltipContent>
          )}
        </Tooltip>
        <div className="mt-auto w-full">
          <Button
            rounded
            variant="success"
            size={breakpoint === 'l' ? 'md' : 'lg'}
            className={cn(
              'disabled:bg-neutral-2 disabled:text-neutral-4! w-full justify-center px-10 font-medium!'
            )}
            disabled={controlsDisabled}
          >
            <div className="flex-shrink-0 font-bold">Reconfigure</div>
          </Button>
        </div>
      </div>
    </div>
  );
}

function extractErrorMessage(error: ZodError): import('react').ReactNode {
  return (
    <>
      {error.issues.map((issue, index) => (
        <div key={index}>{issue.message}</div>
      ))}
    </>
  );
}

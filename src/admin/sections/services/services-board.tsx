'use client';

import { ReloadOutlined } from '@ant-design/icons';
import { skipToken, useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { config } from '@/config';
import { Align } from '@/features/data-grid/core';
import { SimpleGrid } from '@/features/data-grid/presets/simple-grid';
import { Button } from '@/ui/molecules/button';

import { adminQueryKeys } from '../../query-keys';
import { StatusPill } from '../../shared/status-pill';
import { fetchServiceVersion, probeServiceHealth } from './health';
import { SERVICE_CATALOG, serviceBaseUrl } from './service-catalog';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { ServiceHealth } from './health';
import type { ServiceDescriptor } from './service-catalog';

const STATUS_REFRESH_MS = 60_000;
const VERSION_STALE_MS = 5 * 60_000;

type ServiceRow = ServiceDescriptor & { healthUrl: string; versionUrl?: string };

const STATUS_LABEL: Record<ServiceHealth['status'], string> = {
  up: 'Operational',
  down: 'Down',
  unreachable: 'Unreachable',
};

function useServiceHealth(service: ServiceRow) {
  return useQuery({
    queryKey: adminQueryKeys.serviceHealth(service.key),
    queryFn: () => probeServiceHealth(service.healthUrl),
    refetchInterval: STATUS_REFRESH_MS,
  });
}

function StatusCell({ service }: { service: ServiceRow }) {
  const { data: health } = useServiceHealth(service);

  if (!health) return <span className="text-neutral-4">Checking</span>;

  return (
    <StatusPill tone={health.status === 'up' ? 'good' : 'bad'}>
      {STATUS_LABEL[health.status]}
      {health.status === 'down' && ` (${health.httpStatus})`}
    </StatusPill>
  );
}

function LatencyCell({ service }: { service: ServiceRow }) {
  const { data: health } = useServiceHealth(service);
  return health ? <span>{health.latencyMs} ms</span> : null;
}

function VersionCell({ service }: { service: ServiceRow }) {
  const { versionUrl, versionInData } = service;
  const { data: version } = useQuery({
    queryKey: adminQueryKeys.serviceVersion(service.key),
    queryFn: versionUrl ? () => fetchServiceVersion(versionUrl, versionInData) : skipToken,
    staleTime: VERSION_STALE_MS,
  });
  return version ? <span className="font-mono text-sm">{version}</span> : null;
}

const COLUMNS: Array<ISimpleColumn<ServiceRow>> = [
  {
    id: 'service',
    header: 'Service',
    width: { flex: 2, minWidth: 260 },
    renderCell: (service) => (
      <div className="flex flex-col leading-tight">
        <span className="text-primary-9 font-semibold">{service.label}</span>
        <span className="text-neutral-4 truncate text-sm">{service.description}</span>
      </div>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    width: { flex: 1, minWidth: 170 },
    renderCell: (service) => <StatusCell service={service} />,
  },
  {
    id: 'latency',
    header: 'Latency',
    align: Align.Right,
    width: { width: 110 },
    renderCell: (service) => <LatencyCell service={service} />,
  },
  {
    id: 'version',
    header: 'Version',
    width: { flex: 1, minWidth: 150 },
    renderCell: (service) => <VersionCell service={service} />,
  },
  {
    id: 'url',
    header: 'Health check',
    width: { flex: 2, minWidth: 260 },
    renderCell: ({ healthUrl }) => (
      <code title={healthUrl} className="text-neutral-4 truncate text-sm">
        {new URL(healthUrl, 'http://localhost').pathname}
      </code>
    ),
  },
];

function RefreshButton() {
  const queryClient = useQueryClient();
  const queryKey = adminQueryKeys.services();
  const isFetching = useIsFetching({ queryKey }) > 0;

  return (
    <Button
      rounded
      variant="outline"
      size="sm"
      onClick={() => queryClient.invalidateQueries({ queryKey })}
    >
      <ReloadOutlined spin={isFetching} />
      Refresh
    </Button>
  );
}

export function ServicesBoard() {
  // Not at module scope: the config is read lazily, and is empty while Next builds.
  const services = useMemo(
    () =>
      SERVICE_CATALOG.map((descriptor) => {
        const baseUrl = serviceBaseUrl(descriptor, config[descriptor.configKey]);
        return {
          ...descriptor,
          healthUrl: `${baseUrl}${descriptor.healthPath}`,
          versionUrl: descriptor.versionPath && `${baseUrl}${descriptor.versionPath}`,
        };
      }),
    []
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-primary-9 text-xl font-bold">Services</h1>
          <p className="text-neutral-4 text-sm">
            Web app {config.APP_VERSION}, {config.DEPLOYMENT_ENV}
          </p>
        </div>
        <RefreshButton />
      </div>

      <div className="border-neutral-2 rounded-lg border bg-white">
        <SimpleGrid<ServiceRow>
          columns={COLUMNS}
          rows={services}
          getRowId={(service) => service.key}
          rowHeight={56}
          loadingLabel="services"
        />
      </div>

      <p className="text-neutral-4 text-sm">
        Accounting, launch system, grading and cell API don&apos;t accept browser requests, so they
        aren&apos;t checked here.
      </p>
    </div>
  );
}

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
import { SERVER_SERVICE_CATALOG, SERVICE_CATALOG, serviceBaseUrl } from './service-catalog';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { ServiceHealth, ServiceProbe } from './health';
import type { ServiceDescriptor } from './service-catalog';

const STATUS_REFRESH_MS = 60_000;
const VERSION_STALE_MS = 5 * 60_000;

// Rows probed from the server have no URLs here: the server's config holds them.
type ServiceRow = Pick<ServiceDescriptor, 'key' | 'label' | 'description' | 'versionInData'> & {
  healthUrl?: string;
  versionUrl?: string;
};

const STATUS_LABEL: Record<ServiceHealth['status'], string> = {
  up: 'Operational',
  down: 'Down',
  unreachable: 'Unreachable',
  blocked: 'Not reachable from here',
  'not-configured': 'Not configured',
};

const STATUS_TONE: Record<ServiceHealth['status'], 'good' | 'bad' | 'neutral'> = {
  up: 'good',
  down: 'bad',
  unreachable: 'bad',
  blocked: 'neutral',
  'not-configured': 'neutral',
};

async function probeFromServer(key: string): Promise<ServiceProbe> {
  const res = await fetch(`/api/admin/services/${encodeURIComponent(key)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`The web app answered ${res.status}`);
  return res.json();
}

function useServiceProbe({ key, healthUrl }: ServiceRow) {
  return useQuery({
    queryKey: adminQueryKeys.serviceHealth(key),
    queryFn: async (): Promise<ServiceProbe> =>
      healthUrl
        ? { health: await probeServiceHealth(healthUrl), version: null, path: null }
        : probeFromServer(key),
    refetchInterval: STATUS_REFRESH_MS,
  });
}

function StatusCell({ service }: { service: ServiceRow }) {
  const { data, error } = useServiceProbe(service);

  if (!data) {
    return <span className="text-neutral-4">{error ? "Couldn't check" : 'Checking'}</span>;
  }

  const { status, httpStatus } = data.health;
  return (
    <StatusPill tone={STATUS_TONE[status]}>
      {STATUS_LABEL[status]}
      {httpStatus && status !== 'up' && ` (${httpStatus})`}
    </StatusPill>
  );
}

function LatencyCell({ service }: { service: ServiceRow }) {
  const latencyMs = useServiceProbe(service).data?.health.latencyMs;
  return latencyMs === undefined ? null : <span>{latencyMs} ms</span>;
}

function VersionCell({ service }: { service: ServiceRow }) {
  const { key, versionUrl, versionInData } = service;
  const fromServer = useServiceProbe(service).data?.version;
  const { data: fromBrowser } = useQuery({
    queryKey: adminQueryKeys.serviceVersion(key),
    queryFn: versionUrl
      ? () => fetchServiceVersion(versionUrl, { inData: versionInData })
      : skipToken,
    staleTime: VERSION_STALE_MS,
  });
  const version = fromBrowser ?? fromServer;
  return version ? <span className="font-mono text-sm">{version}</span> : null;
}

function HealthPathCell({ service }: { service: ServiceRow }) {
  const fromServer = useServiceProbe(service).data?.path;
  const path = service.healthUrl
    ? new URL(service.healthUrl, 'http://localhost').pathname
    : fromServer && `${fromServer}, from the server`;
  if (!path) return null;

  return (
    <code title={path} className="text-neutral-4 truncate text-sm">
      {path}
    </code>
  );
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
    width: { flex: 1, minWidth: 230 },
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
    renderCell: (service) => <HealthPathCell service={service} />,
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
  const services = useMemo<ServiceRow[]>(
    () => [
      ...SERVICE_CATALOG.map((descriptor) => {
        const baseUrl = serviceBaseUrl(descriptor, config[descriptor.configKey]);
        return {
          ...descriptor,
          healthUrl: `${baseUrl}${descriptor.healthPath}`,
          versionUrl: descriptor.versionPath && `${baseUrl}${descriptor.versionPath}`,
        };
      }),
      ...SERVER_SERVICE_CATALOG,
    ],
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
        Accounting, launch system, grading and cell API don&apos;t accept browser requests, so the
        web app&apos;s server checks them. Accounting and launch system answer only the deployed web
        app, so a local or preview server can&apos;t reach them.
      </p>
    </div>
  );
}

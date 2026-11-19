'use client';

import { ReloadOutlined } from '@ant-design/icons';
import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';

import { config } from '@/config';
import { Align } from '@/features/data-grid/core';
import { SimpleGrid } from '@/features/data-grid/presets/simple-grid';
import { Button } from '@/ui/molecules/button';

import { adminQueryKeys } from '../../query-keys';
import { StatusPill } from '../../shared/status-pill';
import { BROWSER_PROBE, probeService } from './health';
import { SERVICE_CATALOG } from './service-catalog';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { TStatusTone } from '../../shared/status-pill';
import type { ServiceHealth, ServiceProbe } from './health';
import type { ServiceDescriptor } from './service-catalog';

const STATUS_REFRESH_MS = 60_000;
const STATUS_STALE_MS = 30_000;

const SERVICE_STATUS: Record<ServiceHealth['status'], { label: string; tone: TStatusTone }> = {
  up: { label: 'Operational', tone: 'good' },
  down: { label: 'Down', tone: 'bad' },
  unreachable: { label: 'Unreachable', tone: 'bad' },
  blocked: { label: 'Not reachable from here', tone: 'neutral' },
  'not-configured': { label: 'Not configured', tone: 'neutral' },
};

async function fetchServerProbe(key: string): Promise<ServiceProbe> {
  const res = await fetch(`/api/admin/services/${encodeURIComponent(key)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`The web app answered ${res.status}`);
  return res.json();
}

function useServiceProbe(service: ServiceDescriptor) {
  return useQuery({
    queryKey: adminQueryKeys.serviceHealth(service.key),
    queryFn: () =>
      service.probedFrom === 'browser'
        ? probeService(service, config[service.configKey], BROWSER_PROBE)
        : fetchServerProbe(service.key),
    refetchInterval: STATUS_REFRESH_MS,
    staleTime: STATUS_STALE_MS,
  });
}

function StatusCell({ service }: { service: ServiceDescriptor }) {
  const { data, error } = useServiceProbe(service);

  // A failed refetch keeps the last data, which would read as current.
  if (error || !data) {
    return <span className="text-neutral-4">{error ? "Couldn't check" : 'Checking'}</span>;
  }

  const { status, httpStatus } = data.health;
  return (
    <StatusPill tone={SERVICE_STATUS[status].tone}>
      {SERVICE_STATUS[status].label}
      {httpStatus && status !== 'up' && ` (${httpStatus})`}
    </StatusPill>
  );
}

function LatencyCell({ service }: { service: ServiceDescriptor }) {
  const latencyMs = useServiceProbe(service).data?.health.latencyMs;
  return latencyMs === undefined ? null : <span>{latencyMs} ms</span>;
}

function VersionCell({ service }: { service: ServiceDescriptor }) {
  const version = useServiceProbe(service).data?.version;
  return version ? <span className="font-mono text-sm">{version}</span> : null;
}

function HealthPathCell({ service }: { service: ServiceDescriptor }) {
  const probedPath = useServiceProbe(service).data?.path;
  if (!probedPath) return null;
  const path = service.probedFrom === 'server' ? `${probedPath}, from the server` : probedPath;

  return (
    <code title={path} className="text-neutral-4 truncate text-sm">
      {path}
    </code>
  );
}

const COLUMNS: Array<ISimpleColumn<ServiceDescriptor>> = [
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
        <SimpleGrid<ServiceDescriptor>
          columns={COLUMNS}
          rows={SERVICE_CATALOG}
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

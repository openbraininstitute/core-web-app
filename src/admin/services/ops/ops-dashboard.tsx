'use client';

import { ReloadOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { config } from '@/config';
import { Align } from '@/features/data-grid/core';
import { SimpleGrid } from '@/features/data-grid/presets/simple-grid';
import { Badge, STATUS_PILL_CLASS } from '@/ui/molecules/badge';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import { adminQueryKeys, OPS_SERVICE_HEALTH_KEY_PREFIX } from '../../shared/query-keys';
import { probeServiceHealth } from './health';
import { SERVICE_CATALOG, serviceBaseUrl } from './service-catalog';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { ServiceDescriptor } from './service-catalog';

const STATUS_REFRESH_MS = 60_000;

type ServiceRow = ServiceDescriptor & { baseUrl: string };

function useServiceHealth(service: ServiceRow) {
  return useQuery({
    queryKey: adminQueryKeys.opsServiceHealth({ key: service.key }),
    queryFn: () => probeServiceHealth(service),
    refetchInterval: STATUS_REFRESH_MS,
    retry: false,
  });
}

function StatusCell({ service }: { service: ServiceRow }) {
  const { data: health, isPending } = useServiceHealth(service);

  if (isPending) return <span className="text-neutral-4">Checking</span>;

  const operational = health?.status === 'operational';
  return (
    <Badge
      rounded
      variant="outline"
      className={cn(
        STATUS_PILL_CLASS,
        operational
          ? 'border-green-500 bg-green-50 text-green-700'
          : 'border-red-500 bg-red-50 text-red-700'
      )}
    >
      {operational
        ? 'Operational'
        : `Unreachable${health?.httpStatus ? ` (${health.httpStatus})` : ''}`}
    </Badge>
  );
}

function LatencyCell({ service }: { service: ServiceRow }) {
  const { data: health } = useServiceHealth(service);
  return health ? <span>{health.latencyMs} ms</span> : null;
}

function VersionCell({ service }: { service: ServiceRow }) {
  const { data: health } = useServiceHealth(service);
  return health?.version ? <span className="font-mono text-sm">{health.version}</span> : null;
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
    renderCell: (service) => {
      const url = `${service.baseUrl}${service.healthPath}`;
      return (
        <code title={url} className="text-neutral-4 truncate text-sm">
          {new URL(url).pathname}
        </code>
      );
    },
  },
];

export function OpsDashboard() {
  const queryClient = useQueryClient();

  const services = useMemo(
    () =>
      SERVICE_CATALOG.flatMap((descriptor) => {
        const url = config[descriptor.configKey] as string | undefined;
        return url ? [{ ...descriptor, baseUrl: serviceBaseUrl(descriptor, url) }] : [];
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
        <Button
          rounded
          variant="outline"
          size="sm"
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: [OPS_SERVICE_HEALTH_KEY_PREFIX] })
          }
        >
          <ReloadOutlined />
          Refresh
        </Button>
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

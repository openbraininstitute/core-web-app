import { useQuery } from '@tanstack/react-query';
import find from 'es-toolkit/compat/find';
import { useCallback, useMemo, } from 'react';

import { listProjectMembers } from '@/api/virtual-lab-svc/queries/member';
import { DEFAULT_PAGE_SMALL_SIZE } from '@/constants';
import { SimpleGrid } from '@/features/data-grid/presets/simple-grid';
import { getProjectJobReports } from '@/services/virtual-lab/projects';
import { ServiceSubtype } from '@/types/accounting';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Card, CardContent } from '@/ui/molecules/card';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { renderDateAndHour } from '@/util/date';
import { cn } from '@/utils/css-class';

import type { GridDataSource, GridPage } from '@/features/data-grid/core';
import type { SimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { JobReport } from '@/types/accounting';

const categoryLabel: Record<ServiceSubtype, string> = {
  [ServiceSubtype.Notebook]: 'Notebook',
  [ServiceSubtype.NeuronMeshSkeletonization]: 'Process data',
  [ServiceSubtype.IonChannelBuild]: 'Build',
  [ServiceSubtype.IonChannelSim]: 'Simulate',
  [ServiceSubtype.SingleCellBuild]: 'Build',
  [ServiceSubtype.SingleCellSim]: 'Simulate',
  [ServiceSubtype.SmallCircuitSim]: 'Simulate',
  [ServiceSubtype.Storage]: 'Storage',
  [ServiceSubtype.SynaptomeBuild]: 'Build',
  [ServiceSubtype.SynaptomeSim]: 'Simulate',
  // TODO: check if the following subtypes are still relevant and find better labels for them
  [ServiceSubtype.MlRetrieval]: 'ML',
  [ServiceSubtype.MlLlm]: 'ML',
  [ServiceSubtype.MlRag]: 'ML',

  [ServiceSubtype.SingleCellSimulation]: 'Simulate',
  [ServiceSubtype.PairCellSimulation]: 'Simulate',
  [ServiceSubtype.SmallMicrocircuitSimulation]: 'Simulate',
  [ServiceSubtype.MicrocircuitSimulation]: 'Simulate',
  [ServiceSubtype.RegionSimulation]: 'Simulate',
  [ServiceSubtype.SystemSimulation]: 'Simulate',
  [ServiceSubtype.WholeBrainSimulation]: 'Simulate',
  [ServiceSubtype.EM_SYNAPSE_MAPPING]: 'Build',
};

export function categoryRenderFn(subtype: ServiceSubtype) {
  return categoryLabel[subtype] ?? subtype;
}

const typeLabel: Record<ServiceSubtype, string> = {
  [ServiceSubtype.Notebook]: 'Notebook',
  [ServiceSubtype.NeuronMeshSkeletonization]: 'EM mesh skeletonization',
  [ServiceSubtype.IonChannelBuild]: 'Ion channel',
  [ServiceSubtype.IonChannelSim]: 'Ion channel',
  [ServiceSubtype.SingleCellBuild]: 'Single cell',
  [ServiceSubtype.SingleCellSim]: 'Single cell',
  [ServiceSubtype.SmallCircuitSim]: 'Small circuit',
  [ServiceSubtype.Storage]: 'Storage',
  [ServiceSubtype.SynaptomeBuild]: 'Synaptome',
  [ServiceSubtype.SynaptomeSim]: 'Synaptome',
  // TODO: check if the following subtypes are still relevant and find better labels for them
  [ServiceSubtype.MlRetrieval]: 'ML',
  [ServiceSubtype.MlLlm]: 'AI Assistant',
  [ServiceSubtype.MlRag]: 'ML',

  [ServiceSubtype.SingleCellSimulation]: 'Single: Single neuron + extrinsic connectivity',
  [ServiceSubtype.PairCellSimulation]:
    'Pair: Two connected neurons + intrinsic connectivity + extrinsic connectivity',
  [ServiceSubtype.SmallMicrocircuitSimulation]:
    'Small: Microcircuit (3-20 neurons) + intrinsic connectivity + extrinsic connectivity',
  [ServiceSubtype.MicrocircuitSimulation]:
    'Microcircuit: Any circuit larger than 20 neurons but not being a region, system, or whole-brain circuit',
  [ServiceSubtype.RegionSimulation]:
    'Region: Atlas-based continuous volume of an entire brain region or a set of continuous sub-regions',
  [ServiceSubtype.SystemSimulation]:
    'System: Non-continuous circuit consisting of at least two microcircuits/regions that are connected by inter-region connectivity',
  [ServiceSubtype.WholeBrainSimulation]: 'Circuit representing an entire brain',
  [ServiceSubtype.EM_SYNAPSE_MAPPING]: 'Electron microscopy circuit',
};

export function typeRenderFn(subtype: ServiceSubtype) {
  return typeLabel[subtype] ?? subtype;
}

function costRenderFn(amount: string) {
  const numericAmount = parseFloat(amount);
  const formattedAmount = Number.isNaN(numericAmount) ? amount : numericAmount.toFixed(2);
  return <span>{formattedAmount}</span>;
}

const JOB_REPORTS_PAGE_SIZE = 8;

export function JobReportList() {
  const { virtualLabId, projectId } = useWorkspace();

  const { data: users } = useQuery({
    queryKey: keyBuilder.listProjectTeam({ virtualLabId, projectId }),
    queryFn: () => listProjectMembers({ virtualLabId, projectId }),
  });

  // Server data source: the grid owns paging; the report list is fetched per page.
  const dataSource = useMemo<GridDataSource<JobReport>>(
    () => ({
      fetch: async (query): Promise<GridPage<JobReport>> => {
        const response = await getProjectJobReports({
          virtualLabId,
          projectId,
          page: query.page,
          pageSize: query.pageSize,
        });
        return {
          rows: response?.data.items ?? [],
          total: response?.data.meta.total_items ?? 0,
        };
      },
    }),
    [virtualLabId, projectId]
  );

  const userRenderFn = useCallback(
    (userId: string) => {
      const user = find(users?.data?.users, { id: userId });
      return user ? `${user.first_name} ${user.last_name}` : 'Unknown user';
    },
    [users]
  );

  const columns = useMemo<Array<SimpleColumn<JobReport>>>(
    () => [
      {
        id: 'category',
        header: 'Category',
        getValue: (record) => categoryRenderFn(record.subtype),
      },
      { id: 'type', header: 'Type', getValue: (record) => typeRenderFn(record.subtype) },
      { id: 'user', header: 'Member', getValue: (record) => userRenderFn(record.user_id) },
      {
        id: 'date',
        header: 'Date',
        renderCell: (record) => renderDateAndHour(record.started_at),
      },
      {
        id: 'cost',
        header: 'Cost (Credits)',
        renderCell: (record) => costRenderFn(record.amount),
      },
    ],
    [userRenderFn]
  );

  return (
    <div className="mb-4 flex w-full flex-col items-start gap-2">
      <h3 className="text-primary-9 text-xl font-bold">History</h3>
      <Card shadowless className={cn('w-full')}>
        <CardContent>
          <SimpleGrid<JobReport>
            columns={columns}
            getRowId={(record) => record.job_id}
            pageSize={JOB_REPORTS_PAGE_SIZE}
            serverSide={{
              dataSource,
              queryKey: ['project-job-reports', virtualLabId, projectId],
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default JobReportList;

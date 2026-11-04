import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { WorkflowActivityDictValue } from '@/constants';
import { SchemaNameDict } from '@/features/scan-config/types';
import { findWorkflowOfStoredForm } from '@/features/scan-config/workflow/find-descriptor';
import { getWorkflow, listActivities, listWorkflows } from '@/ui/segments/workflows/config/helpers';
import { swapWorkflowInConfigurePath } from '@/ui/segments/workflows/config/routes';
import { WorkflowListSortDict } from '@/ui/segments/workflows/config/types';
import {
  makePathParamUrlFromExtendedType,
  resolveExtendedTypeFromPathParamUrl,
} from '@/utils/url-builder';

const SORTERS = [
  {
    targetType: ExtendedEntitiesTypeDict.AindEphysSpikeSortingSpykingCircus2Campaign,
    schemaName: SchemaNameDict.AINDEPhysSpikeSortingSpykingCircus2ScanConfig,
    obiOne: ObiOneTaskTypeDict.AindEphysSpikeSortingSpykingCircus2,
    generatedApiPath: 'ainde-phys-spike-sorting-spyking-circus-2-scan-config-generate-grid',
  },
  {
    targetType: ExtendedEntitiesTypeDict.AindEphysSpikeSortingKilosort4Campaign,
    schemaName: SchemaNameDict.AINDEPhysSpikeSortingKilosort4ScanConfig,
    obiOne: ObiOneTaskTypeDict.AindEphysSpikeSortingKilosort4,
    generatedApiPath: 'ainde-phys-spike-sorting-kilosort-4-scan-config-generate-grid',
  },
  {
    targetType: ExtendedEntitiesTypeDict.AindEphysSpikeSortingLupinCampaign,
    schemaName: SchemaNameDict.AINDEPhysSpikeSortingLupinScanConfig,
    obiOne: ObiOneTaskTypeDict.AindEphysSpikeSortingLupin,
    generatedApiPath: 'ainde-phys-spike-sorting-lupin-scan-config-generate-grid',
  },
];

function sorterWorkflow(targetType: (typeof SORTERS)[number]['targetType']) {
  return getWorkflow({ activity: WorkflowActivityDictValue.spikeSorting, targetType });
}

describe('spike sorting workflows', () => {
  it('are a category of their own', () => {
    const labels = (activity: string) =>
      listWorkflows({ activity, sort: WorkflowListSortDict.Order }).map(({ label }) => label);

    expect(listActivities().map(({ label }) => label)).toContain('Spike sorting');
    expect(labels(WorkflowActivityDictValue.spikeSorting)).toEqual([
      'Preprocessing',
      'SpykingCircus2',
      'Kilosort4',
      'Lupin',
    ]);
    [WorkflowActivityDictValue.extract, WorkflowActivityDictValue.process].forEach((activity) => {
      expect(labels(activity)).not.toContain('Preprocessing');
      expect(labels(activity)).not.toContain('SpykingCircus2');
    });
  });

  it.each(SORTERS)('the route segment of $targetType converts back to it', ({ targetType }) => {
    const { pathParam } = makePathParamUrlFromExtendedType({ extendedType: targetType });

    expect(resolveExtendedTypeFromPathParamUrl({ pathParam: pathParam as never }).type).toBe(
      targetType
    );
  });

  it.each(SORTERS)('$schemaName is a workflow of its own', ({
    targetType,
    schemaName,
    obiOne,
    generatedApiPath,
  }) => {
    const scanConfig = sorterWorkflow(targetType)?.scanConfig;

    expect(scanConfig?.schemaName).toBe(schemaName);
    expect(scanConfig?.configureBinding.generatedApiPath).toBe(generatedApiPath);
    expect(scanConfig?.definition.taskTypeBindings).toMatchObject({ obiOne });
    expect(scanConfig?.definition.campaign.formTypeNamesWorkflow).toBe(true);
  });

  it.each(SORTERS)('a stored $schemaName form opens in its own workflow', ({
    targetType,
    schemaName,
  }) => {
    const elsewhere = SORTERS.filter((sorter) => sorter.schemaName !== schemaName);

    elsewhere.forEach((sorter) => {
      expect(
        findWorkflowOfStoredForm({ form: { type: schemaName }, schemaName: sorter.schemaName })
          ?.targetType
      ).toBe(targetType);
    });
    expect(findWorkflowOfStoredForm({ form: { type: schemaName }, schemaName })).toBeNull();
  });

  it('keeps a form no workflow claims, or none yet, where it is', () => {
    const schemaName = SchemaNameDict.AINDEPhysSpikeSortingLupinScanConfig;

    expect(findWorkflowOfStoredForm({ form: { type: 'Unknown' }, schemaName })).toBeNull();
    expect(findWorkflowOfStoredForm({ form: undefined, schemaName })).toBeNull();
  });

  it('swaps only the workflow in the configure path', () => {
    const path = swapWorkflowInConfigurePath({
      pathname:
        '/app/virtual-lab/lab/project/workflows/spike-sorting/configure/aind-ephys-spikesorting-lupin-campaign/wf_1',
      from: ExtendedEntitiesTypeDict.AindEphysSpikeSortingLupinCampaign,
      to: ExtendedEntitiesTypeDict.AindEphysSpikeSortingKilosort4Campaign,
    });

    expect(path).toBe(
      '/app/virtual-lab/lab/project/workflows/spike-sorting/configure/aind-ephys-spikesorting-kilosort-4-campaign/wf_1'
    );
  });
});

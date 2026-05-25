import { describe, expect, it } from 'vitest';

import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkflowActivityDictValue } from '@/constants';
import { WorkflowSchemaSelectionMode } from '@/features/scan-config/workflow/workflow-schema-selection';
import {
  buildConfigureUrlForEntity,
  buildScanConfigConfigureHref,
  buildSimulateConfigureUrlFromDataViewEntity,
  buildWorkflowStartingPageUrl,
  getWorkflow,
  resolveSimulateSourceTypeFromDataView,
  WorkflowInitialStageDict,
} from '@/ui/segments/workflows/config';

const workspace = { virtualLabId: 'virtual-lab-id', projectId: 'project-id' };

function expectSessionPath(url: string, prefix: string) {
  expect(url).toMatch(new RegExp(`^${prefix}/wf_[a-z0-9]{10}(\\?|$)`));
}

describe('scan-config workflow navigation routes', () => {
  it('navigates schema workflows with selection requirements to the browse step', () => {
    const url = buildWorkflowStartingPageUrl({
      activity: WorkflowActivityDictValue.build,
      targetType: ExtendedEntitiesTypeDict.EmSynapseMappingCampaign,
      workspace,
      stage: WorkflowInitialStageDict.New,
      workflow: null,
      schemaSelection: {
        schemaName: 'EMSynapseMappingScanConfig',
        uiElement: 'model_identifier_multiple',
        selectionMode: WorkflowSchemaSelectionMode.Grouped,
        acceptedFromIdTypes: ['CellMorphologyFromID', 'MEModelFromID'],
        acceptedEntityTypes: [
          ExtendedEntitiesTypeDict.UniversalCellMorphology,
          ExtendedEntitiesTypeDict.Memodel,
        ],
        tableSelectionType: 'checkbox',
      },
    });

    expect(url).toBe('//virtual-lab-id/project-id/workflows/build/new/em-synapse-mapping-campaign');
  });

  it('creates a configure URL with persisted single selection for scan-config browse rows', () => {
    const url = buildConfigureUrlForEntity({
      activity: WorkflowActivityDictValue.extract,
      targetType: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
      workspace,
      entityId: '11111111-1111-4111-8111-111111111111',
      entityType: ExtendedEntitiesTypeDict.Circuit,
    });

    expectSessionPath(
      url,
      '//virtual-lab-id/project-id/workflows/extract/configure/circuit-extraction-campaign'
    );
  });

  it('creates a configure URL without persisting selection for duplicate and resume paths', () => {
    const url = buildConfigureUrlForEntity({
      activity: WorkflowActivityDictValue.process,
      targetType: ExtendedEntitiesTypeDict.SkeletonizationCampaign,
      workspace,
      entityId: '11111111-1111-4111-8111-111111111111',
      entityType: ExtendedEntitiesTypeDict.EMCellMesh,
      skipSelectionPersist: true,
      query: { origin: 'campaign-id' },
    });

    expectSessionPath(
      url,
      '//virtual-lab-id/project-id/workflows/process/configure/skeletonization-campaign'
    );
    expect(url).toContain('origin=campaign-id');
  });

  it('uses an explicit session id when one is supplied from query params', () => {
    expect(
      buildScanConfigConfigureHref({
        activity: WorkflowActivityDictValue.simulate,
        targetType: ExtendedEntitiesTypeDict.IonChannelModelSimulation,
        workspace,
        sessionId: 'wf_existing0',
      })
    ).toBe(
      '//virtual-lab-id/project-id/workflows/simulate/configure/ion-channel-model-simulation/wf_existing0'
    );
  });

  it('creates an empty configure session when no selection or entity ref is available', () => {
    const url = buildScanConfigConfigureHref({
      activity: WorkflowActivityDictValue.process,
      targetType: ExtendedEntitiesTypeDict.SkeletonizationCampaign,
      workspace,
    });

    expectSessionPath(
      url,
      '//virtual-lab-id/project-id/workflows/process/configure/skeletonization-campaign'
    );
  });

  it('persists explicit browse selection payloads into scan-config configure URLs', () => {
    const url = buildConfigureUrlForEntity({
      activity: WorkflowActivityDictValue.extract,
      targetType: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
      workspace,
      entityId: 'unused-entity-id',
      selection: {
        mode: 'single',
        item: { type: ExtendedEntitiesTypeDict.Circuit, id: 'selected-circuit-id' },
      },
      query: { source: 'browse' },
    });

    expectSessionPath(
      url,
      '//virtual-lab-id/project-id/workflows/extract/configure/circuit-extraction-campaign'
    );
    expect(url).toContain('source=browse');
  });

  it('rejects explicit selection payloads for workflows without scan-config session configure', () => {
    expect(() =>
      buildConfigureUrlForEntity({
        activity: WorkflowActivityDictValue.simulate,
        targetType: ExtendedEntitiesTypeDict.SingleNeuronSimulation,
        workspace,
        entityId: 'memodel-id',
        selection: {
          mode: 'single',
          item: { type: ExtendedEntitiesTypeDict.Memodel, id: 'memodel-id' },
        },
      })
    ).toThrow('does not support session selection configure');
  });

  it('builds legacy configure URLs for non-scan-config workflows', () => {
    const browseFirstUrl = buildConfigureUrlForEntity({
      activity: WorkflowActivityDictValue.simulate,
      targetType: ExtendedEntitiesTypeDict.SingleNeuronSimulation,
      workspace,
      entityId: 'memodel-id',
      entityType: ExtendedEntitiesTypeDict.Memodel,
      query: { panel: 'configuration' },
    });
    expect(browseFirstUrl).toMatch(
      /^\/\/virtual-lab-id\/project-id\/workflows\/simulate\/configure\/memodel\/memodel-id\?panel=configuration&session=wf_[a-z0-9]{10}$/
    );

    const workflow = getWorkflow({
      activity: WorkflowActivityDictValue.build,
      targetType: ExtendedEntitiesTypeDict.Memodel,
    });
    expect(
      buildWorkflowStartingPageUrl({
        activity: WorkflowActivityDictValue.build,
        targetType: ExtendedEntitiesTypeDict.Memodel,
        workspace,
        stage: WorkflowInitialStageDict.Configure,
        workflow,
        query: { mode: 'new' },
      })
    ).toMatch(
      /^\/\/virtual-lab-id\/project-id\/workflows\/build\/configure\/memodel\?mode=new&session=wf_[a-z0-9]{10}$/
    );
  });

  it('throws when no workflow is registered for a requested route target', () => {
    expect(() =>
      buildConfigureUrlForEntity({
        activity: WorkflowActivityDictValue.extract,
        targetType: ExtendedEntitiesTypeDict.Memodel,
        workspace,
        entityId: 'memodel-id',
      })
    ).toThrow('No workflow registered for extract / memodel');
  });

  it('maps data-view circuit scale to simulate workflow source and configure URL', () => {
    expect(
      resolveSimulateSourceTypeFromDataView(ExtendedEntitiesTypeDict.Circuit, {
        scale: CircuitScaleDictionary.SmallMicrocircuit,
      })
    ).toBe(ExtendedEntitiesTypeDict.SmallMicrocircuit);

    const url = buildSimulateConfigureUrlFromDataViewEntity({
      workspace,
      extendedType: ExtendedEntitiesTypeDict.Circuit,
      entityId: '11111111-1111-4111-8111-111111111111',
      entity: { scale: CircuitScaleDictionary.SmallMicrocircuit },
    });

    expect(url).toMatch(
      /^\/\/virtual-lab-id\/project-id\/workflows\/simulate\/configure\/small-microcircuit-simulation\/wf_[a-z0-9]{10}\?panel=configuration&sessionId=wf_[a-z0-9]{10}$/
    );
  });

  it('handles all data-view source type branches and unsupported circuit scales', () => {
    expect(
      resolveSimulateSourceTypeFromDataView(ExtendedEntitiesTypeDict.Circuit, {
        scale: CircuitScaleDictionary.PairNeuron,
      })
    ).toBe(ExtendedEntitiesTypeDict.PairedNeuronCircuit);
    expect(
      resolveSimulateSourceTypeFromDataView(ExtendedEntitiesTypeDict.Circuit, {
        scale: CircuitScaleDictionary.Single,
      })
    ).toBe(ExtendedEntitiesTypeDict.MEModelWithSynapses);
    expect(
      resolveSimulateSourceTypeFromDataView(ExtendedEntitiesTypeDict.Circuit, {
        scale: CircuitScaleDictionary.Microcircuit,
      })
    ).toBe(ExtendedEntitiesTypeDict.Microcircuit);
    expect(
      resolveSimulateSourceTypeFromDataView(ExtendedEntitiesTypeDict.Circuit, {
        scale: CircuitScaleDictionary.Region,
      })
    ).toBe(ExtendedEntitiesTypeDict.BrainRegion);
    expect(
      resolveSimulateSourceTypeFromDataView(ExtendedEntitiesTypeDict.Circuit, {
        scale: 'unsupported-scale' as never,
      })
    ).toBeNull();
    expect(resolveSimulateSourceTypeFromDataView(ExtendedEntitiesTypeDict.Memodel, {})).toBe(
      ExtendedEntitiesTypeDict.Memodel
    );
    expect(
      buildSimulateConfigureUrlFromDataViewEntity({
        workspace,
        extendedType: ExtendedEntitiesTypeDict.Circuit,
        entityId: 'circuit-id',
        entity: { scale: 'unsupported-scale' as never },
      })
    ).toBeNull();
  });
});

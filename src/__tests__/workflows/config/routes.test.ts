import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkflowActivityDictValue, WorkspaceScope } from '@/constants';
import { SCAN_CONFIG_ORIGIN_ID_SEARCH_PARAM } from '@/features/scan-config/workflow/constants';
import { readWorkflowSelection } from '@/features/scan-config/workflow/selection';
import { SCOPE_QUERY_PARAMS } from '@/ui/hooks/use-scope';
import { SimulateWorkflows } from '@/ui/segments/workflows/config/activities/simulate';
import {
  buildEntityConfigureHref,
  buildScanConfigConfigureHref,
  buildWorkflowHubStageHref,
  getWorkflowTypeRouteKey,
  resolveWorkflowTargetTypeFromRoute,
} from '@/ui/segments/workflows/config/routes';
import {
  WORKFLOW_SESSION_ID_SEARCH_PARAM,
  WorkflowConfigureRoutingDict,
} from '@/ui/segments/workflows/config/types';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { KebabCase } from '@/utils/type';

const { MOCK_WORKFLOW_SESSION_ID, mockCreateSessionId } = vi.hoisted(() => {
  const MOCK_WORKFLOW_SESSION_ID = 'wf_test_session_01' as const;
  return {
    MOCK_WORKFLOW_SESSION_ID,
    mockCreateSessionId: vi.fn(() => MOCK_WORKFLOW_SESSION_ID),
  };
});

vi.mock('@/features/scan-config/workflow/selection/helpers', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/scan-config/workflow/selection/helpers')>();
  return {
    ...actual,
    createWorkflowSessionId: mockCreateSessionId,
  };
});

const workspace = { virtualLabId: 'vl-1', projectId: 'proj-1' };

function parseHref(href: string) {
  const url = new URL(href, 'http://localhost');
  return {
    pathname: url.pathname,
    searchParams: url.searchParams,
  };
}

describe('workflow configure routing', () => {
  beforeEach(() => {
    mockCreateSessionId.mockClear();
    sessionStorage.clear();
  });

  describe('custom simulate configure pages', () => {
    it('puts the selected entity id in the path for memodel simulation', () => {
      const href = buildEntityConfigureHref({
        activity: WorkflowActivityDictValue.simulate,
        targetType: ExtendedEntitiesTypeDict.SingleNeuronSimulation,
        workspace,
        entityId: 'memodel-entity-42',
        entityType: ExtendedEntitiesTypeDict.Memodel,
      });

      const { pathname, searchParams } = parseHref(href);

      expect(pathname).toBe(
        '/app/vl-1/proj-1/workflows/simulate/configure/memodel/memodel-entity-42'
      );
      expect(searchParams.get(WORKFLOW_SESSION_ID_SEARCH_PARAM)).toMatch(/^wf_/);
      expect(pathname.endsWith(`/${MOCK_WORKFLOW_SESSION_ID}`)).toBe(false);
    });

    it('builds browse-first configure href with entity id in the path', () => {
      const href = buildEntityConfigureHref({
        activity: WorkflowActivityDictValue.simulate,
        targetType: ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
        workspace,
        entityId: 'syn-99',
        entityType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
        query: { scope: WorkspaceScope.Public },
      });

      const { pathname, searchParams } = parseHref(href);

      expect(pathname).toBe(
        '/app/vl-1/proj-1/workflows/simulate/configure/single-neuron-synaptome/syn-99'
      );
      expect(searchParams.get('scope')).toBe(WorkspaceScope.Public);
    });
  });

  describe('ion channel simulation (standalone scan-config)', () => {
    it('includes a session id path segment so the catch-all route resolves', () => {
      const href = buildEntityConfigureHref({
        activity: WorkflowActivityDictValue.simulate,
        targetType: ExtendedEntitiesTypeDict.IonChannelModelSimulation,
        workspace,
        entityId: 'ignored-for-standalone',
        entityType: ExtendedEntitiesTypeDict.IonChannelModel,
      });

      const { pathname } = parseHref(href);

      expect(pathname).toBe(
        `/app/vl-1/proj-1/workflows/simulate/configure/ion-channel-model-simulation/${MOCK_WORKFLOW_SESSION_ID}`
      );
    });

    it('does not persist browse selection for standalone configure routing', () => {
      buildEntityConfigureHref({
        activity: WorkflowActivityDictValue.simulate,
        targetType: ExtendedEntitiesTypeDict.IonChannelModelSimulation,
        workspace,
        entityId: 'ion-channel-1',
        entityType: ExtendedEntitiesTypeDict.IonChannelModel,
      });

      expect(readWorkflowSelection(MOCK_WORKFLOW_SESSION_ID, sessionStorage)).toBeNull();
    });

    it('hub navigation targets configure with session segment (regression for 404)', () => {
      const href = buildWorkflowHubStageHref({
        activity: WorkflowActivityDictValue.simulate,
        targetType: ExtendedEntitiesTypeDict.IonChannelModelSimulation,
        workspace,
        stage: 'configure',
        workflow: {
          isScanConfig: true,
          configureRouting: WorkflowConfigureRoutingDict.Standalone,
        } as never,
        query: { [SCOPE_QUERY_PARAMS]: WorkspaceScope.Public },
      });

      const { pathname, searchParams } = parseHref(href);

      expect(pathname).toMatch(
        new RegExp(
          `/workflows/simulate/configure/ion-channel-model-simulation/${MOCK_WORKFLOW_SESSION_ID}$`
        )
      );
      expect(searchParams.get(SCOPE_QUERY_PARAMS)).toBe(WorkspaceScope.Public);
      expect(pathname).not.toBe(
        '/app/vl-1/proj-1/workflows/simulate/configure/ion-channel-model-simulation'
      );
    });
  });

  describe('scan-config workflows with entity selection', () => {
    it('builds configure href for me_model_with_synapses data view using circuit entity type', () => {
      const workflow = SimulateWorkflows.find(
        (w) => !w.disabled && w.sourceType === ExtendedEntitiesTypeDict.MEModelWithSynapses
      );
      expect(workflow).toBeDefined();

      const href = buildEntityConfigureHref({
        activity: WorkflowActivityDictValue.simulate,
        targetType: workflow!.targetType,
        workspace,
        entityId: 'circuit-25328',
        entityType: EntityTypeDict.Circuit,
      });

      const { pathname } = parseHref(href);

      expect(pathname).toMatch(
        /\/workflows\/simulate\/configure\/single-neuron-circuit-simulation\/wf_[a-z0-9]+$/
      );
    });

    it('persists selection and uses session id as the final path segment', () => {
      const href = buildEntityConfigureHref({
        activity: WorkflowActivityDictValue.simulate,
        targetType: ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
        workspace,
        entityId: 'circuit-7',
        entityType: ExtendedEntitiesTypeDict.MemodelCircuit,
      });

      const { pathname } = parseHref(href);
      const sessionId = pathname.split('/').pop();

      expect(pathname).toMatch(
        /\/workflows\/simulate\/configure\/me-model-circuit-simulation\/wf_[a-z0-9]+$/
      );
      expect(sessionId).toBeTruthy();
      if (!sessionId) {
        throw new Error('expected session id in configure pathname');
      }

      const stored = readWorkflowSelection(sessionId, sessionStorage);
      expect(stored).toMatchObject({
        selection: {
          mode: 'single',
          items: [{ type: ExtendedEntitiesTypeDict.MemodelCircuit, id: 'circuit-7' }],
        },
      });
    });

    it('supports duplicate flows via originId query param', () => {
      const href = buildScanConfigConfigureHref({
        activity: WorkflowActivityDictValue.simulate,
        targetType: ExtendedEntitiesTypeDict.IonChannelModelSimulation,
        workspace,
        standalone: true,
        originId: 'campaign-abc',
      });

      const { searchParams } = parseHref(href);

      expect(searchParams.get(SCAN_CONFIG_ORIGIN_ID_SEARCH_PARAM)).toBe('campaign-abc');
    });
  });

  describe('hub navigation for browse-first workflows', () => {
    it('routes browse-first simulate workflows to /new with session query param', () => {
      const href = buildWorkflowHubStageHref({
        activity: WorkflowActivityDictValue.simulate,
        targetType: ExtendedEntitiesTypeDict.SingleNeuronSimulation,
        workspace,
        stage: 'new',
        workflow: { isScanConfig: false } as never,
        sessionId: 'wf_hub_session',
        query: {
          [SCOPE_QUERY_PARAMS]: WorkspaceScope.Public,
          [WORKFLOW_SESSION_ID_SEARCH_PARAM]: 'wf_hub_session',
        },
      });

      const { pathname, searchParams } = parseHref(href);

      expect(pathname).toBe('/app/vl-1/proj-1/workflows/simulate/new/single-neuron-simulation');
      expect(searchParams.get(WORKFLOW_SESSION_ID_SEARCH_PARAM)).toBe('wf_hub_session');
    });

    it('routes scan-config browse workflows to /new/{type}', () => {
      const href = buildWorkflowHubStageHref({
        activity: WorkflowActivityDictValue.simulate,
        targetType: ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
        workspace,
        stage: 'new',
        workflow: { isScanConfig: true } as never,
        sessionId: 'wf_browse_session',
        query: {
          [SCOPE_QUERY_PARAMS]: WorkspaceScope.Public,
          [WORKFLOW_SESSION_ID_SEARCH_PARAM]: 'wf_browse_session',
        },
      });

      const { pathname } = parseHref(href);

      expect(pathname).toBe('/app/vl-1/proj-1/workflows/simulate/new/me-model-circuit-simulation');
    });
  });

  describe('route type resolution', () => {
    it('roundtrips extended entity types through kebab-case route keys', () => {
      const targetType = ExtendedEntitiesTypeDict.IonChannelModelSimulation;
      const routeKey = getWorkflowTypeRouteKey(targetType);

      expect(routeKey).toBe('ion-channel-model-simulation');
      expect(
        resolveWorkflowTargetTypeFromRoute(routeKey as KebabCase<TExtendedEntitiesTypeDict>)
      ).toBe(targetType);
    });
  });
});

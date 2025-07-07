import groupBy from 'lodash/groupBy';
import isEqual from 'lodash/isEqual';
import { Atom, atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

import { pageNumberAtom, pageSizeAtom } from '@/state/explore-section/list-view-atoms';
import { fetchJsonFileByUrl, fetchResourceByIdUsingResolver } from '@/api/nexus';
import {
  EModelConfiguration,
  EModelConfigurationPayload,
  EModelWorkflow,
  ExemplarMorphologyDataType,
  MechanismForUI,
} from '@/types/e-model'; // TODO: Confirm these types
import { EModelResource } from '@/types/explore-section/delta-model';

import { ReconstructedNeuronMorphology } from '@/types/explore-section/delta-experiment';
import sessionAtom from '@/state/session';
import { convertDeltaMorphologyForUI } from '@/services/e-model';
import { ensureArray } from '@/util/nexus';
import { WorkspaceContext } from '@/types/common';
import { getEntityDerivations } from '@/api/entitycore/queries/general/derivation';
import { tryCatch } from '@/api/utils';
import { getElectricalCellRecordings } from '@/api/entitycore/queries';
import { IElectricalCellRecording } from '@/api/entitycore/types';

type ModelResourceInfo = {
  eModelId: string;
  projectId: string;
  virtualLabId: string;
};

const eModelFamily = atomFamily<ModelResourceInfo, Atom<Promise<EModelResource | null>>>(
  (resourceInfo) =>
    atom(async (get) => {
      const { eModelId, projectId, virtualLabId } = resourceInfo;

      const session = get(sessionAtom);

      if (!session) return null;

      const model = await fetchResourceByIdUsingResolver<EModelResource>(eModelId, session, {
        project: projectId,
        org: virtualLabId,
      });

      return model;
    }),
  isEqual
);

const eModelWorkflowFamily = atomFamily<ModelResourceInfo, Atom<Promise<EModelWorkflow | null>>>(
  (resourceInfo) =>
    atom(async (get) => {
      const eModel = await get(eModelFamily(resourceInfo));
      const session = get(sessionAtom);

      if (!eModel || !session) return null;

      const { '@id': followedWorkflowId } = eModel.generation.activity.followedWorkflow;

      const followedWorkflow = await fetchResourceByIdUsingResolver<EModelWorkflow>(
        followedWorkflowId,
        session,
        { org: resourceInfo.virtualLabId, project: resourceInfo.projectId }
      );

      return followedWorkflow;
    }),
  isEqual
);

const eModelConfigurationFamily = atomFamily<
  ModelResourceInfo,
  Atom<Promise<EModelConfiguration | null>>
>(
  (resourceInfo) =>
    atom(async (get) => {
      const followedWorkflow = await get(eModelWorkflowFamily(resourceInfo));
      const session = get(sessionAtom);

      if (!followedWorkflow || !session) return null;

      const eModelConfigurationPart = ensureArray(followedWorkflow.hasPart).find(
        ({ '@type': type }) => type === 'EModelConfiguration'
      );

      const { '@id': eModelConfigurationId } = eModelConfigurationPart ?? {};

      if (!eModelConfigurationId) return null;

      const eModelConfiguration = await fetchResourceByIdUsingResolver<EModelConfiguration>(
        eModelConfigurationId,
        session,
        { org: resourceInfo.virtualLabId, project: resourceInfo.projectId }
      );

      return eModelConfiguration;
    }),
  isEqual
);

const eModelExemplarMorphologyFamily = atomFamily<
  Omit<ModelResourceInfo, 'eModelId'> & { eModelId?: string },
  Atom<Promise<ExemplarMorphologyDataType | null>>
>(
  (resourceInfo) =>
    atom(async (get) => {
      if (!resourceInfo.eModelId) return null;

      const eModelConfiguration = await get(
        eModelConfigurationFamily(resourceInfo as ModelResourceInfo)
      );
      const session = get(sessionAtom);

      if (!eModelConfiguration || !session) return null;

      const exemplarMorphologyId = eModelConfiguration.uses.find(
        ({ '@type': type }) => type === 'NeuronMorphology'
      )?.['@id'];

      if (!exemplarMorphologyId) return null;

      const exemplarMorphology =
        await fetchResourceByIdUsingResolver<ReconstructedNeuronMorphology>(
          exemplarMorphologyId,
          session,
          { org: resourceInfo.virtualLabId, project: resourceInfo.projectId }
        );

      return convertDeltaMorphologyForUI(exemplarMorphology);
    }),
  isEqual
);

export const experimentalTracesAtomFamily = atomFamily<
  WorkspaceContext & { id: string; key: string },
  Atom<Promise<{ error: Error | null; data?: IElectricalCellRecording[] | null; total: number }>>
>(
  (ctx) =>
    atom(async (get) => {
      const pageNumber = get(pageNumberAtom(ctx.key));
      const pageSize = get(pageSizeAtom({ key: ctx.key, defaultSize: 5 }));
      const { data, error } = await tryCatch(
        getEntityDerivations({
          context: { virtualLabId: ctx.virtualLabId, projectId: ctx.projectId },
          entityId: ctx.id,
          entityRoute: 'emodel',
          filters: {
            page: pageNumber,
            page_size: pageSize,
          },
        })
      );
      if (error) {
        return {
          error,
          data: null,
          total: 0,
        };
      }
      const { data: emodels, error: emodelsError } = await tryCatch(
        getElectricalCellRecordings({
          context: { virtualLabId: ctx.virtualLabId, projectId: ctx.projectId },
          filters: { id__in: data?.data.map((o) => o.id).join(',') },
          withFacets: false,
        })
      );
      if (emodelsError) {
        return {
          data: null,
          error: emodelsError,
          total: 0,
        };
      }
      return {
        data: emodels?.data,
        error: null,
        total: data.pagination.total_items,
      };
    }),
  (a, b) => a.key === b.key
);

const eModelConfigurationDistributionFamily = atomFamily<
  ModelResourceInfo,
  Atom<Promise<EModelConfigurationPayload | null>>
>(
  (resourceInfo) =>
    atom(async (get) => {
      const session = get(sessionAtom);
      const eModelConfiguration = await get(eModelConfigurationFamily(resourceInfo));

      if (!session || !eModelConfiguration) return null;

      const contentUrl = ensureArray(eModelConfiguration.distribution).find(
        ({ encodingFormat }) => encodingFormat === 'application/json'
      )?.contentUrl;

      if (!contentUrl) return null;

      const json = await fetchJsonFileByUrl<EModelConfigurationPayload>(contentUrl, session);

      return json;
    }),
  isEqual
);

// TODO:
// This whole MechanismForUI stuff is kind of garbage.
// Should be thrown-out.
// Same for convertDeltaMorphologyForUI and convertESTraceForUI.
const eModelMechanismsAtomFamily = atomFamily<
  ModelResourceInfo,
  Atom<Promise<MechanismForUI | null>>
>(
  (resourceInfo) =>
    atom(async (get) => {
      const session = get(sessionAtom);
      const configurationDistribution = await get(
        eModelConfigurationDistributionFamily(resourceInfo)
      );

      if (!session || !configurationDistribution) return null;

      const { mechanisms } = configurationDistribution;

      const mechanismsByLocation = groupBy(mechanisms, 'location');

      return { processed: mechanismsByLocation, raw: {} } as MechanismForUI;
    }),
  isEqual
);

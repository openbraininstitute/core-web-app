'use client';

import { Atom, atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import pick from 'lodash/pick';
import isEqual from 'lodash/isEqual';

import sessionAtom from '@/state/session';
import { fetchResourceById, queryES } from '@/api/nexus';
import { DeltaResource, Contributor, Subject } from '@/types/explore-section/resources';
import { Contributor as DeltaContributor } from '@/types/explore-section/delta-contributor';
import {
  ExperimentalTrace,
  ReconstructedNeuronMorphology,
  Experiment,
} from '@/types/explore-section/delta-experiment';
import { ensureArray } from '@/util/nexus';
import { DetailViewUrlParams, ResourceInfo } from '@/types/explore-section/application';
import { getLicenseByIdQuery } from '@/queries/es';
import { subjectAgeSelectorFn, ageSelectorFn } from '@/util/explore-section/selector-functions';
import { atlasESView } from '@/config';
import { DataType } from '@/constants/explore-section/list-views';
import { getEntityByLegacyType } from '@/entity-configuration/domain/helpers';

export const backToListPathAtom = atom<string | null | undefined>(null);

export const sessionAndInfoFamily = atomFamily(
  (resourceInfo?: ResourceInfo) =>
    atom((get) => {
      const session = get(sessionAtom);

      if (!session || !resourceInfo) throw Error('Session or Info is invalid');

      return { session, info: resourceInfo as ResourceInfo };
    }),
  isEqual
);

export const detailFamily = atomFamily<
  DetailViewUrlParams & { dataType: DataType },
  Atom<Promise<any>>
>(
  (viewParams) =>
    atom(async () => {
      const entity = getEntityByLegacyType({ legacyType: viewParams.dataType });
      if (entity && entity.api.query.one) {
        return await entity.api.query.one({
          id: viewParams.id,
          context: { virtualLabId: viewParams.virtualLabId, projectId: viewParams.projectId },
        });
      }
    }),
  isEqual
);

export const contributorsDataFamily = atomFamily<
  ResourceInfo,
  Atom<Promise<DeltaContributor[] | null>>
>(
  (resourceInfo) =>
    atom(async (get) => {
      const { session, info } = get(sessionAndInfoFamily(resourceInfo));
      const detail = (await get(detailFamily(resourceInfo))) as Experiment;

      if (!detail || !detail.contribution) return null;

      const contributions = ensureArray(detail.contribution);

      const contributors = await Promise.all(
        contributions.map(async (contribution) => {
          if (contribution?.agent?.name)
            return pick(contribution.agent, ['@id', '@type', 'name']) as Contributor;

          return fetchResourceById<Contributor>(
            contribution?.agent['@id'],
            session,
            pick(info, ['org', 'project'])
          );
        })
      );

      return contributors;
    }),
  isEqual
);

export const licenseDataFamily = atomFamily<ResourceInfo, Atom<Promise<string | null>>>(
  (resourceInfo) =>
    atom(async (get) => {
      const detail = (await get(detailFamily(resourceInfo))) as
        | ExperimentalTrace
        | ReconstructedNeuronMorphology;
      const session = get(sessionAtom);

      if (!detail || !detail.license || !session) throw new Error('No license found');

      const licenseQuery = getLicenseByIdQuery(detail.license['@id']);
      const [license] = await queryES<{ label: string }>(licenseQuery, session, {
        org: atlasESView.org,
        project: atlasESView.project,
        viewId: atlasESView.id,
      });
      return license.label || detail.license['@id'];
    }),
  isEqual
);

const latestRevisionFamily = atomFamily(
  (resourceInfo?: ResourceInfo) =>
    atom<Promise<number | null>>(async (get) => {
      const { session, info } = get(sessionAndInfoFamily(resourceInfo));

      const latestRevision: DeltaResource = await fetchResourceById(
        info.id,
        session,
        pick(info, ['org', 'project'])
      );
      return latestRevision._rev;
    }),
  isEqual
);

export const speciesDataFamily = atomFamily<ResourceInfo, Atom<Promise<Experiment | null>>>(
  (resourceInfo) =>
    atom(async (get) => {
      const { session, info } = get(sessionAndInfoFamily(resourceInfo));

      const detail = (await get(detailFamily(resourceInfo))) as Experiment;

      if (!detail || !detail.subject) return null;

      if (detail.subject?.species?.label) return detail;

      const subject = await fetchResourceById<Experiment>(
        detail.subject['@id'],
        session,
        pick(info, ['org', 'project'])
      );

      return subject;
    }),
  isEqual
);

export const subjectAgeDataFamily = atomFamily<ResourceInfo, Atom<Promise<string | null>>>(
  (resourceInfo) =>
    atom(async (get) => {
      const { session, info } = get(sessionAndInfoFamily(resourceInfo));

      const detail = (await get(detailFamily(resourceInfo))) as Experiment;

      if (!detail || !detail.subject) return null;

      if (detail.subject.age) return subjectAgeSelectorFn(detail);

      if (detail.subject['@id']) {
        const subject = await fetchResourceById<Subject>(
          detail.subject['@id'],
          session,
          pick(info, ['org', 'project'])
        );

        return ageSelectorFn(subject);
      }

      return null;
    }),
  isEqual
);

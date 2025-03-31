import { Atom, atom } from 'jotai';
import find from 'lodash/find';
import get from 'lodash/get';

import sessionAtom from '@/state/session';
import { composeUrl, ensureArray } from '@/util/nexus';
import { fetchFileByUrl } from '@/api/nexus';
import type { IReconstructionMorphology } from '@/api/entitycore/types/entities/reconstruction-morphology';
import type { IAsset } from '@/api/entitycore/types/shared/global';

function getContentUrlByEncoding(assets: Array<IAsset>, encodingFormat: string) {
  const asset = find(
    assets,
    (asset) => get(asset, 'meta.legacy.encodingFormat') === encodingFormat
  );
  return get(asset, 'meta.legacy.contentUrl', null);
}

function extractOrgAndProject(url: string) {
  const parts = url.split('/');
  const index = parts.indexOf('files');

  if (index !== -1 && parts.length > index + 2) {
    return {
      id: parts.at(-1),
      org: get(parts, index + 1, null),
      project: get(parts, index + 2, null),
    };
  }

  return { org: null, project: null, id: null };
}

export default function createMorphologyDataAtom(
  resource: IReconstructionMorphology
): Atom<Promise<string> | null> {
  return atom((get) => {
    const session = get(sessionAtom);
    if (!session) return null;

    const assets = ensureArray(resource.assets);
    const traceDistro = getContentUrlByEncoding(assets, 'application/swc');

    if (!traceDistro) {
      throw new Error(`No distribution found for resource ${resource.id}`);
    }

    const { org, project, id } = extractOrgAndProject(traceDistro);
    if (org && project && id) {
      const url = composeUrl('file', decodeURIComponent(id), {
        org: org,
        project: project,
        idExpand: false,
      });
      return fetchFileByUrl(url, session)
        .then((resp) => resp.text())
        .then((fetchedData) => fetchedData);
    }
    return null;
  });
}

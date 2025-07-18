import { Atom, atom } from 'jotai';

import sessionAtom from '@/state/session';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeEnum } from '@/api/entitycore/types';

import type { IReconstructionMorphology } from '@/api/entitycore/types/entities/reconstruction-morphology';
import { WorkspaceContext } from '@/types/common';

export default function createMorphologyDataAtom(
  morphology: IReconstructionMorphology,
  ctx?: WorkspaceContext
): Atom<Promise<string | null>> {
  return atom(async (get) => {
    const session = get(sessionAtom);
    if (!session) return null;

    const asset = morphology.assets?.find((a) => a.content_type === 'application/swc');
    if (!asset) {
      throw new Error(`No distribution found for resource ${morphology.id}`);
    }

    // TODO: extend downloadAsset so that return type can be parameterized
    // as: ArrayBuffer, String, JSON, Response, etc.
    const arrayBuffer = await downloadAsset<ArrayBuffer>({
      entityType: EntityTypeEnum.ReconstructionMorphology,
      entityId: morphology.id,
      id: asset.id,
      ctx,
    });

    const decoder = new TextDecoder('utf-8');
    return decoder.decode(arrayBuffer);
  });
}

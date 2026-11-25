import { match } from 'ts-pattern';

import { UploadPhase } from '@/api/entitycore/queries/assets/multipart';
import { DRACO_MAX_TRIANGLES } from '@/features/entities/em-cell-mesh/viewer/engine/budget';
import {
  GLB_HEADER_BYTES,
  glbJsonEnd,
  meshHeader,
  readGlbJson,
} from '@/features/entities/em-cell-mesh/viewer/engine/glb';
import { messages } from '@/i18n/en/upload';
import { formatBytes as formatUploadLimit } from '@/ui/hooks/use-file-upload';
import {
  EMCellMeshFileType,
  getEMCellMeshFileType,
} from '@/ui/segments/contribute/em-cell-mesh/schema';
import { formatBytes, formatCompactNumber } from '@/utils/format';

import type { IUploadProgress } from '@/api/entitycore/queries/assets/multipart';
import type { MeshHeader } from '@/features/entities/em-cell-mesh/viewer/engine/glb';

export const OBJ_MAX_BYTES = 6 * 1024 ** 3;
export const GLB_MAX_BYTES = 500 * 1024 ** 2;

const OBJ_SNIFF_BYTES = 64 * 1024;
const HASHING_SHARE = 0.1;
const PROGRESS_STEPS = 100;

export interface IMeshFileCheck {
  error: string | null;
  notice: string | null;
}

const ACCEPTED: IMeshFileCheck = { error: null, notice: null };

function refused(error: string): IMeshFileCheck {
  return { error, notice: null };
}

export function isObjMeshFile(file: File): boolean {
  return getEMCellMeshFileType(file)?.type === EMCellMeshFileType.Obj;
}

async function checkObjFile(file: File): Promise<IMeshFileCheck> {
  const head = await file.slice(0, OBJ_SNIFF_BYTES).text();
  return /^v\s/m.test(head) ? ACCEPTED : refused(messages.MeshFileNotObj.replace('$$', file.name));
}

async function readGlbMeshHeader(file: File): Promise<MeshHeader> {
  const header = new Uint8Array(await file.slice(0, GLB_HEADER_BYTES).arrayBuffer());
  const json = readGlbJson(new Uint8Array(await file.slice(0, glbJsonEnd(header)).arrayBuffer()));
  if (!json) throw new Error('GLB ends inside its JSON chunk');
  return meshHeader(json);
}

async function checkGlbFile(file: File): Promise<IMeshFileCheck> {
  if (file.size > GLB_MAX_BYTES) {
    return refused(
      messages.FileSizeExceeded.replace('$$$', formatUploadLimit(GLB_MAX_BYTES)).replace(
        '$$',
        file.name
      )
    );
  }
  try {
    const header = await readGlbMeshHeader(file);
    if (!header.draco || header.triangles <= DRACO_MAX_TRIANGLES) return ACCEPTED;
    return {
      error: null,
      notice: messages.MeshAboveViewerLimit.replace(
        '$$$',
        formatCompactNumber(DRACO_MAX_TRIANGLES)
      ).replace('$$', formatCompactNumber(header.triangles)),
    };
  } catch {
    return refused(messages.ResolveMeshFileFailed.replace('$$', file.name));
  }
}

/** Checks a mesh file in the browser; the OBJ itself is validated by the conversion task. */
export async function checkMeshFile(file: File): Promise<IMeshFileCheck> {
  return match(getEMCellMeshFileType(file)?.type)
    .with(EMCellMeshFileType.Obj, () => checkObjFile(file))
    .with(EMCellMeshFileType.Glb, () => checkGlbFile(file))
    .otherwise(() => Promise.resolve(refused(messages.FileNotAccepted.replace('$$', file.name))));
}

export function describeUploadProgress(progress: IUploadProgress): string {
  if (progress.phase === UploadPhase.Hashing) return 'Preparing';
  return `Uploading ${formatBytes(progress.loadedBytes, 1)} of ${formatBytes(progress.totalBytes, 1)}`;
}

/** The upload's share done, with hashing counted as its first tenth. */
export function uploadFraction(progress: IUploadProgress): number {
  if (progress.totalBytes === 0) return 0;
  const share = progress.loadedBytes / progress.totalBytes;
  return progress.phase === UploadPhase.Hashing
    ? share * HASHING_SHARE
    : HASHING_SHARE + share * (1 - HASHING_SHARE);
}

/** Whether two progress reports show the same percentage, so the second needs no render. */
export function isSameUploadStep(a: IUploadProgress | null, b: IUploadProgress): boolean {
  return (
    a !== null &&
    a.phase === b.phase &&
    Math.floor(uploadFraction(a) * PROGRESS_STEPS) ===
      Math.floor(uploadFraction(b) * PROGRESS_STEPS)
  );
}

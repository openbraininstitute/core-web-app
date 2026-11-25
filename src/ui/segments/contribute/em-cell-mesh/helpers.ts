import { match } from 'ts-pattern';

import { UploadPhase } from '@/api/entitycore/queries/assets/multipart';
import { DRACO_MAX_TRIANGLES } from '@/features/entities/em-cell-mesh/viewer/engine/budget';
import {
  GLB_HEADER_BYTES,
  glbDeclaredLength,
  glbJsonEnd,
  isGlbBinChunkHeader,
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
import type { IEMCellMeshCreate } from '@/api/entitycore/types/entities/em-cell-mesh';
import type { TEntityLifecycleStatus } from '@/api/entitycore/types/shared/global';
import type { MeshHeader } from '@/features/entities/em-cell-mesh/viewer/engine/glb';
import type { TEMCellMeshForm } from '@/ui/segments/contribute/em-cell-mesh/schema';

export const OBJ_MAX_BYTES = 6 * 1024 ** 3;
export const GLB_MAX_BYTES = 500 * 1024 ** 2;

const OBJ_SNIFF_BYTES = 64 * 1024;
const OBJ_STATEMENT = /^(?:#|(?:v|vt|vn|vp|f|l|p|o|g|s|mtllib|usemtl)[ \t])/m;
const OBJ_BYTES_PER_TRIANGLE = 48;
const GLB_CHUNK_HEADER_BYTES = 8;
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

function aboveViewerLimit(message: string, triangles: number): IMeshFileCheck {
  return {
    error: null,
    notice: message
      .replace('$$$', formatCompactNumber(DRACO_MAX_TRIANGLES))
      .replace('$$', formatCompactNumber(triangles)),
  };
}

async function checkObjFile(file: File): Promise<IMeshFileCheck> {
  const head = await file.slice(0, OBJ_SNIFF_BYTES).text();
  if (head.includes('\0') || !OBJ_STATEMENT.test(head))
    return refused(messages.MeshFileNotObj.replace('$$', file.name));
  const triangles = Math.round(file.size / OBJ_BYTES_PER_TRIANGLE);
  return triangles > DRACO_MAX_TRIANGLES
    ? aboveViewerLimit(messages.MeshObjAboveViewerLimit, triangles)
    : ACCEPTED;
}

async function readGlbMeshHeader(file: File): Promise<MeshHeader> {
  const header = new Uint8Array(await file.slice(0, GLB_HEADER_BYTES).arrayBuffer());
  if (glbDeclaredLength(header) !== file.size)
    throw new Error('GLB length differs from its header');
  const jsonEnd = glbJsonEnd(header);
  const head = new Uint8Array(await file.slice(0, jsonEnd + GLB_CHUNK_HEADER_BYTES).arrayBuffer());
  if (!isGlbBinChunkHeader(head.subarray(jsonEnd))) throw new Error('GLB without a binary chunk');
  const json = readGlbJson(head);
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
    return aboveViewerLimit(messages.MeshAboveViewerLimit, header.triangles);
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

export function toEMCellMeshCreatePayload(
  values: TEMCellMeshForm,
  lifecycleStatus: TEntityLifecycleStatus
): IEMCellMeshCreate {
  const { setup } = values;
  return {
    name: setup.name,
    description: setup.description,
    brain_region_id: setup.brain_region_id,
    subject_id: values.subject_id,
    license_id: values.license_id,
    experiment_date:
      typeof setup.experiment_date === 'string'
        ? setup.experiment_date
        : setup.experiment_date.toISOString(),
    contact_email: setup.contact_email,
    published_in: setup.published_in,
    notice_text: setup.notice_text,
    em_dense_reconstruction_dataset_id: setup.em_dense_reconstruction_dataset_id,
    release_version: setup.release_version,
    dense_reconstruction_cell_id: setup.dense_reconstruction_cell_id,
    generation_method: setup.generation_method,
    level_of_detail: setup.level_of_detail,
    mesh_type: setup.mesh_type,
    lifecycle_status: lifecycleStatus,
  };
}

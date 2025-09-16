import { fetchJSON } from './util';
import { assertString, isString } from '@/util/type-guards';

export async function serviceAiAgentStorageGetFileContent({
  accessToken,
  fileIdentifier,
}: {
  accessToken: string;
  fileIdentifier: string;
}): Promise<StorageGetFileContent> {
  const url = await fetchJSON({
    accessToken,
    method: 'GET',
    path: `storage/${fileIdentifier}/presigned-url`,
    params: { file_identifier: fileIdentifier },
    typeGuard: isString,
  });
  assertString(url, 'presigned-url');
  const resp = await fetch(url);
  console.log(
    "🚀 [storage] url, resp.headers.get('x-amz-meta-category') =",
    url,
    resp.headers.get('X-Amz-Meta-Category')
  ); // @FIXME: Remove this line written on 2025-09-02 at 11:08
  const type = resp.headers.get('x-amz-meta-category') ?? 'unknown';
  if (type === 'image') {
    return { content: url, type };
  }
  return {
    content: await resp.text(),
    type,
  };
}

export interface StorageGetFileContent {
  content: string;
  type: string;
}

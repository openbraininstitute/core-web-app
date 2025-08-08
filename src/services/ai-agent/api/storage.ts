import { tgdLoadImageFromArrayBuffer } from '@tolokoban/tgd';

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
  const type = resp.headers.get('X-Amz-Meta-Category') ?? 'unknown';
  if (type === 'image') {
    const content = await tgdLoadImageFromArrayBuffer(await resp.arrayBuffer());
    if (!content) throw Error('Unable to load the image!');

    return { content, type };
  }
  return {
    content: await resp.text(),
    type,
  };
}

export interface StorageGetFileContent {
  content: string | HTMLImageElement;
  type: string;
}

import { getClient } from '@/services/sanity/client';
import { tryType } from '@/services/sanity/type-utils';
import { logError } from '@/utils/logger';

export interface ContentForVirtualLabsBlock {
  title: string;
  description: string;
  videoURL: string;
}

function isContentForVirtualLabsBlocks(data: unknown): data is ContentForVirtualLabsBlock[] {
  return tryType('ContentForVirtualLabsBlocks', data, [
    'array',
    {
      title: 'string',
      description: 'string',
      videoURL: 'string',
    },
  ]);
}

export async function getVirtualLabsBlocks(): Promise<ContentForVirtualLabsBlock[]> {
  try {
    const data = await getClient().fetch(
      `*[_type == "tripleBloc"][0].blocks[]{
  title,
  description,
  "videoURL": video
}`
    );
    if (isContentForVirtualLabsBlocks(data)) return data;
  } catch (ex) {
    logError('Error fetching virtual labs blocks:', ex);
  }
  return [];
}

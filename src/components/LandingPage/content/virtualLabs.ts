import { useSanity } from '@/services/sanity/hooks';
import { tryType } from './_common';

interface ContentForVirtualLabsBlock {
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

export function useSanityContentForVirtualLabsBlocks(): ContentForVirtualLabsBlock[] {
  return (
    useSanity(
      `*[_type == "tripleBloc"][0].blocks[]
{
  title,
  description,
  "videoURL": video
}`,
      isContentForVirtualLabsBlocks
    ) ?? []
  );
}

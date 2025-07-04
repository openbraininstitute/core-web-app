import { tryType } from './_common';
import { useSanity } from '@/services/sanity';
import { isString } from '@/util/type-guards';

function useSanityContentForVirtualLabsTitle() {
  return (
    useSanity(
      `*[_type=="pages" && slug.current=="home"][0]
.content[_type=="tryptich"][0].title`,
      isString
    ) ?? ''
  );
}

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

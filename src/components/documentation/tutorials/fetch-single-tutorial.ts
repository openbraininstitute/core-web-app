import type { PortableTextBlock } from 'next-sanity';
import { useSanity } from '@/services/sanity';
import { logError } from '@/util/logger';
import { assertType, type TypeDef } from '@/util/type-guards';
import type { StepProps } from '../type';

export function useSanityForSingleTutorial({ slug }: { slug: string }) {
  const query = `
        *[_type=="tutorial" && slug.current == '${slug}'][0]
    {
        _id,
        title,
        description,
        "slug": slug.current,
        "url": videoUrl,
        "imageURL": thumbnail.asset->url,
        "imageWidth": thumbnail.asset->metadata.dimensions.width,
        "imageHeight": thumbnail.asset->metadata.dimensions.height,
        content,
        steps,
        transcript
    }

    `;
  const data = useSanity(query, isContentForSingleTutorial);
  return data ?? null;
}

export type ContentForSingleTutorial = {
  url: string;
  title: string | null;
  slug: string;
  description: string | null;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
  content: PortableTextBlock[] | null;
  steps: StepProps[] | null;
  transcript: PortableTextBlock[] | null;
};

const portableTextTypeDef: TypeDef = [
  'array',
  {
    _type: 'string',
    _key: 'string',
    style: ['|', 'string', 'null', 'undefined'],
    children: [
      '|',
      [
        'array',
        {
          _type: 'string',
          _key: 'string',
          text: 'string',
          marks: ['|', ['array', 'string'], 'null', 'undefined'],
        },
      ],
      'null',
      'undefined',
    ],
    markDefs: ['|', ['array', { _key: 'string', _type: 'string' }], 'null', 'undefined'],
    level: ['|', 'number', 'null', 'undefined'],
    listItem: ['|', 'string', 'null', 'undefined'],
  },
];

const stepPropsTypeDef: TypeDef = {
  title: 'string',
  content: ['|', portableTextTypeDef, 'null', 'undefined'],
  time: ['|', 'number', 'null', 'undefined'],
};

function isContentForSingleTutorial(data: unknown): data is ContentForSingleTutorial {
  const typeStringOrNull: TypeDef = ['|', 'string', 'null', 'undefined'];
  const typePortableTextOrNull: TypeDef = ['|', portableTextTypeDef, 'null', 'undefined'];
  const typeStepsOrNull: TypeDef = ['|', ['array', stepPropsTypeDef], 'null', 'undefined'];
  try {
    assertType(
      data,
      {
        _id: 'string',
        url: 'string',
        title: typeStringOrNull,
        slug: 'string',
        description: typeStringOrNull,
        imageURL: 'string',
        imageWidth: 'number',
        imageHeight: 'number',
        content: typePortableTextOrNull,
        steps: typeStepsOrNull,
        transcript: typePortableTextOrNull,
      },
      'ContentForSingleTutorial'
    );
    return true;
  } catch (ex) {
    logError(ex);
    return false;
  }
}

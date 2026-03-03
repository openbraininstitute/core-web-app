import { RichText, tryType } from './_common';

import { TypeDef } from '@/util/type-guards';

export const typeStringOrNull: TypeDef = ['|', 'string', 'null', 'undefined'];
export const typeNumberOrNull: TypeDef = ['|', 'number', 'null', 'undefined'];
export const typeBooleanOrNull: TypeDef = ['|', 'boolean', 'null', 'undefined'];
export const typeImage = {
  imageURL: 'string',
  imageWidth: 'number',
  imageHeight: 'number',
} satisfies TypeDef;

export interface ContentForRichTextImage {
  _type: 'imageBlock';
  alt: string;
  caption: null | string;
  image: null | {
    url: string;
    width: number;
    height: number;
  };
}

const typeContentForRichTextImage = {
  _type: ['literal', 'imageBlock'],
  alt: typeStringOrNull,
  caption: typeStringOrNull,
  image: [
    '|',
    'null',
    {
      url: 'string',
      width: 'number',
      height: 'number',
    },
  ],
} satisfies TypeDef;

export interface ContentForRichTextMultipleButton {
  _type: 'multipleButton';
  buttonsList: Array<{
    title: string;
    href: string;
    backgroundURL: string;
    backgroundWidth: number;
    backgroundHeight: number;
  }>;
}

const typeContentForRichTextMultipleButton = {
  _type: ['literal', 'multipleButton'],
  buttonsList: [
    'array',
    {
      title: 'string',
      href: 'string',
      backgroundURL: 'string',
      backgroundWidth: 'number',
      backgroundHeight: 'number',
    },
  ],
} satisfies TypeDef;

export interface ContentForRichTextVideo {
  _type: 'video';
  url: string;
  timestamps?: null | Array<{
    label: string;
    description: string;
    timestamp: number;
  }>;
}

const typeContentForRichTextVideo = {
  _type: ['literal', 'video'],
  url: typeStringOrNull,
  timestamps: [
    '?',
    [
      '|',
      'null',
      {
        label: typeStringOrNull,
        description: typeStringOrNull,
        timestamp: typeNumberOrNull,
      },
    ],
  ],
} satisfies TypeDef;

export interface ContentForRichTextPreview {
  _type: 'previewBlock';
  title: string;
  text: string | RichText;
  buttonLabel: string | null;
  image: null | {
    url: string;
    width: number;
    height: number;
  };
  background: null | {
    url: string;
    width: number;
    height: number;
  };
  button: null | {
    label: string;
    link: string;
  };
}

const typeContentForRichTextPreview: TypeDef = {
  _type: ['literal', 'previewBlock'],
  title: typeStringOrNull,
  buttonLabel: typeStringOrNull,
  image: [
    '|',
    'null',
    {
      url: 'string',
      width: 'number',
      height: 'number',
    },
  ],
  background: [
    '|',
    'null',
    {
      url: 'string',
      width: 'number',
      height: 'number',
    },
  ],
  button: ['|', { label: typeStringOrNull, link: typeStringOrNull }],
};

const typeRichTextParagraph: TypeDef = () => [
  'array',
  [
    '|',
    {
      _type: ['literal', 'block'],
      children: ['?', typeRichTextParagraph],
    },
    {
      _type: ['literal', 'span'],
      text: 'string',
    },
    {
      _type: ['literal', 'spacer'],
      size: 'string',
    },
  ],
];

export interface ContentForRichTextTitle {
  _type: 'titleHeadline';
  title: string;
  levelType: 'h2' | 'h3';
}

const typeContentForRichTextTitle: TypeDef = {
  _type: ['literal', 'titleHeadline'],
  title: 'string',
  levelType: ['literal', 'h2', 'h3'],
};

export interface ContentForRichTextVerticalSpace {
  _type: 'verticalDivider';
  spacing: 'small' | 'medium' | 'large';
}

const typeContentForRichTextVerticalSpace: TypeDef = {
  _type: ['literal', 'verticalDivider'],
  spacing: ['literal', 'small', 'medium', 'large'],
};

export interface ContentForRichTextItems {
  _type: 'bulletList';
  content: Array<{
    title?: string;
    content: string;
    imageURL?: string | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
  }>;
}

const typeContentForRichTextItems: TypeDef = {
  _type: ['literal', 'bulletList'],
  content: [
    'array',
    {
      title: ['?', 'string'],
      content: 'string',
      imageURL: ['?', typeStringOrNull],
      imageWidth: ['?', typeNumberOrNull],
      imageHeight: ['?', typeNumberOrNull],
    },
  ],
};

export interface ContentForRichTextWidget {
  _type: 'section';
  name: string;
}

const typeContentForRichTextWidget: TypeDef = {
  _type: ['literal', 'section'],
  name: 'string',
};

export interface ContentForRichTextParagraph {
  _type: 'richContent';
  content: string | RichText;
}

const typeContentForRichTextParagraph: TypeDef = () => ({
  _type: ['literal', 'richContent'],
  content: typeRichTextParagraph,
});

export type ContentForRichText = Array<
  | ContentForRichTextItems
  | ContentForRichTextTitle
  | ContentForRichTextWidget
  | ContentForRichTextParagraph
  | ContentForRichTextVerticalSpace
  | ContentForRichTextPreview
  | ContentForRichTextImage
  | ContentForRichTextVideo
  | ContentForRichTextMultipleButton
>;

const typeContentForRichText: TypeDef = [
  'array',
  [
    '|',
    typeContentForRichTextItems,
    typeContentForRichTextTitle,
    typeContentForRichTextWidget,
    typeContentForRichTextVerticalSpace,
    typeContentForRichTextParagraph,
    typeContentForRichTextPreview,
    typeContentForRichTextImage,
    typeContentForRichTextVideo,
    typeContentForRichTextMultipleButton,
  ],
];

export function isContentForRichText(data: unknown): data is ContentForRichText {
  return tryType('ContentForRichText', data, typeContentForRichText);
}

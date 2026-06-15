import { recursiveFindText, urlRegex } from '@/ui/molecules/text-pattern-transformer';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Molecules/TextPatternTransformer',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Recursively walks React children, replacing string matches of a regex with a component. The default export is the URL regex; pair it with any renderer.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const linkifyUrl = (match: string) => (
  <a
    key={match}
    href={match.startsWith('http') ? match : `https://${match}`}
    target="_blank"
    rel="noopener noreferrer"
    className="text-primary-7 underline underline-offset-2"
  >
    {match}
  </a>
);

export const Linkify: Story = {
  render: () => (
    <p className="w-[560px] text-sm">
      {recursiveFindText(
        "See the docs at https://openbraininstitute.org and the source at www.github.com/openbraininstitute. Email contact@openbraininstitute.org wouldn't be matched (not a URL).",
        linkifyUrl,
        urlRegex
      )}
    </p>
  ),
};

export const HighlightWord: Story = {
  render: () => (
    <p className="w-[560px] text-sm">
      {recursiveFindText(
        'The hippocampus is part of the limbic system. The hippocampus drives memory consolidation.',
        (match) => (
          <mark key={match} className="bg-primary-1 px-1 rounded">
            {match}
          </mark>
        ),
        /hippocampus/gi
      )}
    </p>
  ),
};

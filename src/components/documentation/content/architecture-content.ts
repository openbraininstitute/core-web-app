import { useAITools } from '@/services/ai-agent/tools/tools';
import type { SingleSectionProps } from '../type';

export function useDocumentationArchitecture(): SingleSectionProps[] {
  const tools = useAITools() ?? [];

  return [
    {
      name: 'Overview',
      slug: 'overview',
      children: null,
      disabled: false,
      link: '/app/documentation',
    },
    {
      name: 'Glossary',
      slug: 'glossary',
      children: null,
      disabled: false,
      link: '/app/documentation/glossary',
    },
    {
      name: 'Features',
      slug: 'features',
      children: [
        {
          name: 'Subcellular',
          slug: 'subcellular',
          children: null,
          disabled: false,
          link: '/app/documentation/features/subcellular',
        },
        {
          name: 'Cellular',
          slug: 'cellular',
          children: null,
          disabled: false,
          link: '/app/documentation/features/cellular',
        },
        {
          name: 'Circuit',
          slug: 'circuit',
          children: null,
          disabled: false,
          link: '/app/documentation/features/circuit',
        },
        {
          name: 'System',
          slug: 'system',
          children: null,
          disabled: true,
          link: '/app/documentation/features/system',
        },
      ],
      disabled: false,
      link: '/app/documentation/features',
    },
    {
      name: 'Your Virtual Lab',
      slug: 'virtual-lab',
      children: [
        {
          name: 'Credits',
          slug: 'credits',
          children: null,
          disabled: true,
          link: '/app/documentation/virtual-lab/credits',
        },
        {
          name: 'Teams',
          slug: 'teams',
          children: null,
          disabled: true,
          link: '/app/documentation/virtual-lab/teams',
        },
      ],
      disabled: false,
      link: '/app/documentation/virtual-lab',
    },
    {
      name: 'Projects',
      slug: 'projects',
      children: [
        {
          name: 'Explore',
          slug: 'explore',
          children: null,
          disabled: true,
          link: '/app/documentation/projects/explore',
        },
        {
          name: 'Build',
          slug: 'build',
          children: null,
          disabled: true,
          link: '/app/documentation/projects/build',
        },
        {
          name: 'Experiment',
          slug: 'experiment',
          children: null,
          disabled: true,
          link: '/app/documentation/projects/experiment',
        },
        {
          name: 'Library',
          slug: 'library',
          children: null,
          disabled: true,
          link: '/app/documentation/projects/library',
        },
        {
          name: 'Paper',
          slug: 'paper',
          children: null,
          disabled: true,
          link: '/app/documentation/projects/paper',
        },
      ],
      disabled: false,
      link: '/app/documentation/projects',
    },
    {
      name: 'Notebooks',
      slug: 'notebooks',
      children: null,
      disabled: true,
      link: '/app/documentation/notebooks',
    },
    {
      name: 'AI Chat tools',
      slug: 'ai-chat-tools',
      children: tools.map((tool) => ({
        name: tool.name,
        slug: tool.id,
        children: null,
        disabled: false,
        link: `/app/documentation/ai-chat-tools/${tool.id}`,
      })),
      link: '/app/documentation/ai-chat-tools',
      disabled: false,
    },
  ];
}

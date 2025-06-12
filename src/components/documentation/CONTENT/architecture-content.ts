import { SingleSectionProps } from '../type';

import { useAITools } from '@/services/ai-agent/tools/tools';

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
      name: 'Your virtual lab',
      slug: 'virtual-lab',
      children: null,
      disabled: true,
      link: '/app/documentation/virtual-lab',
    },
    {
      name: 'Projects',
      slug: 'projects',
      children: null,
      disabled: true,
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
    {
      name: 'Ion Channels',
      slug: 'ion-channels',
      children: null,
      link: '/app/documentation/build/ion-channels',
      disabled: true,
    },
    {
      name: 'Metabolism',
      slug: 'metabolism',
      children: null,
      link: '/app/documentation/build/metabolism',
      disabled: true,
    },
    {
      name: 'NGV Unit',
      slug: 'ngv-unit',
      children: null,
      link: '/app/documentation/build/ngv-unit',
      disabled: true,
    },
    {
      name: 'Single Neuron',
      slug: 'single-neuron',
      children: null,
      link: '/app/documentation/build/single-neuron',
      disabled: true,
    },
    {
      name: 'Synaptome',
      slug: 'synaptome',
      children: null,
      link: '/app/documentation/build/synaptome',
      disabled: true,
    },
    {
      name: 'Paired Neurons',
      slug: 'paired-neurons',
      children: null,
      link: '/app/documentation/build/paired-neurons',
      disabled: true,
    },
    {
      name: 'Small microcircuits',
      slug: 'small-microcircuits',
      children: null,
      link: '/app/documentation/build/small-microcircuits',
      disabled: true,
    },
    {
      name: 'Microcircuits',
      slug: 'microcircuits',
      children: null,
      link: '/app/documentation/build/microcircuits',
      disabled: true,
    },
    {
      name: 'NGV Circuit',
      slug: 'ngv-circuit',
      children: null,
      link: '/app/documentation/build/ngv-circuit',
      disabled: true,
    },
    {
      name: 'Brain Region',
      slug: 'brain-region',
      children: null,
      link: '/app/documentation/build/brain-region',
      disabled: true,
    },
    {
      name: 'Brain System',
      slug: 'brain-system',
      children: null,
      link: '/app/documentation/build/brain-system',
      disabled: true,
    },
    {
      name: 'Whole Brain',
      slug: 'whole-brain',
      children: null,
      link: '/app/documentation/build/whole-brain',
      disabled: true,
    },
  ];
}

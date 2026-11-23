import { config } from '@/config';
import { ClaudePluginSetup } from '@/ui/segments/project/get-started/ai-assistants/claude-plugin-setup';
import { BackButton } from '@/ui/segments/project/get-started/elements/back-button';

import type { Metadata } from 'next';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export const metadata: Metadata = {
  title: 'Use OBI from Claude | Open Brain Institute',
  description:
    'Set up the Open Brain Institute plugin in Claude to search data, build models and run simulations from your chats.',
};

export default async function Page({ params }: ServerSideComponentProp<WorkspaceContext, null>) {
  const { virtualLabId, projectId } = await params;
  const home = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}`;

  return (
    <section id="claude-plugin-setup" data-testid="claude-plugin-setup" className="pr-2">
      <BackButton
        className="sticky top-0 bg-background w-full z-49 pb-2"
        toBack={home}
        list={[
          { title: 'Get started', link: home },
          { title: 'Claude plugin', link: '' },
        ]}
      />
      <ClaudePluginSetup />
    </section>
  );
}

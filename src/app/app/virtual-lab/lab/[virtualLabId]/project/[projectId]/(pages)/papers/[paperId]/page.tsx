import { auth } from '@/auth';
import PaperView from '@/components/papers/PaperView';
import retrievePaperLexicalConfig from '@/services/paper-ai/retrievePaperLexicalConfig';
import { ServerSideComponentProp } from '@/types/common';

type Props = ServerSideComponentProp<{
  virtualLabId: string;
  projectId: string;
  paperId: string;
}>;

export default async function Paper(props: Props) {
  const params = await props.params;

  const { virtualLabId, projectId, paperId } = params;

  const session = await auth();
  if (!session) return;

  const { config, paper } = await retrievePaperLexicalConfig({
    virtualLabId,
    projectId,
    paperId,
    session,
  });

  return <PaperView {...{ config, paper }} />;
}

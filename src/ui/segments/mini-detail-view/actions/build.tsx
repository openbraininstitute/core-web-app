import { kebabCase } from 'es-toolkit/compat';
import Link from 'next/link';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';

export function WorkflowBuildActions<T extends EntityCoreObjectTypes>({ record }: { record: T }) {
  const { virtualLabId, projectId } = useWorkspace();
  const onWorkflowClick = () => {};

  return (
    <div className="sticky bottom-0 mt-auto flex items-center justify-center gap-2 self-end p-4">
      <Button
        rounded
        asChild
        title="Go to details page"
        variant="default"
        className="hover:bg-primary-7/40 h-12 border border-white/16 px-10 font-bold shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]"
      >
        <Link
          href={`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(record.type)}/${record.id}`}
        >
          View details
        </Link>
      </Button>
      <Button
        rounded
        asChild
        title="Start build"
        variant="default"
        className="hover:bg-primary-7/40 h-12 border border-white/16 px-10 font-bold shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]"
      >
        <Link
          href={{
            pathname: `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/build/configure/${kebabCase(record.type)}/${record.id}`,
            query: { sessionId: crypto.randomUUID() },
          }}
          onClick={onWorkflowClick}
        >
          Use model
        </Link>
      </Button>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Empty } from 'antd';
import type { BundledLanguage } from 'shiki';
import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { EntityCoreResource, IAsset } from '@/api/entitycore/types/shared/global';
import { getEntityCorePresignedUrl } from '@/services/entity-download/pre-singed-url';
import type { WorkspaceContext } from '@/types/common';
import { CodeBlock, CodeBlockCopyButton, CodeBlockLanguageLabel } from '@/ui/molecules/code-blocks';
import { Skeleton } from '@/ui/molecules/skeleton';
import { keyBuilder } from '@/ui/use-query-keys/third-parties';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';

export function CodeFileViewer({
  entity,
  asset,
  context,
  assetPath,
}: {
  entity: Partial<EntityCoreResource>;
  asset: IAsset;
  context: WorkspaceContext;
  assetPath?: string;
}) {
  const { data: presignedData, isLoading: isLoadingUrl } = useQuery({
    queryKey: keyBuilder.s3presignedUrl({ entityId: entity.id, assetId: asset.id, ...context }),
    queryFn: async () => {
      return getEntityCorePresignedUrl({
        entityType: entity.type as TEntityTypeDict,
        entityId: entity.id!,
        virtualLabId: context.virtualLabId,
        projectId: context.projectId,
        configAssetId: asset.id,
        assetPath,
      });
    },
    enabled: !!entity.id && !!asset.id,
    staleTime: Infinity,
  });

  const { data: content, isLoading } = useQuery({
    queryKey: ['file-content', { url: presignedData?.url }],
    queryFn: async () => {
      const response = await fetch(presignedData?.url!);
      if (!response.ok) throw new Error('Failed to fetch file');
      return response.text();
    },
    enabled: !!presignedData?.url,
    staleTime: Infinity,
  });

  if (isLoading || isLoadingUrl) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex h-full items-center justify-center">
        <Empty description="Failed to load file content" />
      </div>
    );
  }

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      log('error', 'Failed to copy code to clipboard', error);
      throw error;
    }
  };
  const fileName = assetPath?.split('/').at(-1) ?? asset.path.split('/').at(-1);
  const language = fileName?.split('.').at(-1) as BundledLanguage;
  const filename = assetPath?.split('.').at(-1) ?? asset.path.split('/').pop() ?? 'file';

  return (
    <CodeBlock
      code={content}
      language={language}
      showLineNumbers
      title={filename}
      className={cn(
        'secondary-scrollbar h-full overflow-auto [&_pre]:overflow-x-auto',
        '[&_pre]:whitespace-pre [&>div]:overflow-auto [&>div>div]:overflow-x-auto',
        'border-neutral-3 bg-white! [&_.shiki]:bg-white! [&_.shiki]:shadow-xl!'
      )}
    >
      <div className="bg-neutral-light flex items-center justify-between px-2 py-2">
        <CodeBlockLanguageLabel />
        <CodeBlockCopyButton
          onCopy={handleCopy}
          onError={() => {}}
          className="ml-auto size-8 self-end rounded-full px-2 hover:bg-gray-300"
          iconClassName="text-gray-500 size-4"
        />
      </div>
    </CodeBlock>
  );
}

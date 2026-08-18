import { useQuery } from '@tanstack/react-query';
import { Empty } from 'antd';

import { getEntityCorePresignedUrl } from '@/services/entity-download/pre-singed-url';
import { CodeBlock, CodeBlockCopyButton, CodeBlockLanguageLabel } from '@/ui/molecules/code-blocks';
import { Skeleton } from '@/ui/molecules/skeleton';
import { keyBuilder } from '@/ui/use-query-keys/third-parties';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';

import type { BundledLanguage } from 'shiki';
import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { EntityCoreResource, IAsset } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

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
    // assetPath is part of the key: files inside a directory asset share one asset id and differ
    // only by their path, so leaving it out serves every one of them the first file's url
    queryKey: keyBuilder.s3presignedUrl({
      entityId: entity.id,
      assetId: asset.id,
      assetPath,
      ...context,
    }),
    queryFn: async () => {
      return getEntityCorePresignedUrl({
        entityType: entity.type as TEntityTypeDict,
        // biome-ignore lint/style/noNonNullAssertion: this is enabled only if entity is present (see useQuery/enabled)
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
      // biome-ignore lint/style/noNonNullAssertion: this is enabled only if presignedData is present (see useQuery/enabled)
      const response = await fetch(presignedData!.url);
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

  const LARGE_FILE_CHAR_LIMIT = 10000;
  const isLargeFile = content.length > LARGE_FILE_CHAR_LIMIT;

  const displayContent = getTruncatedContent(content, LARGE_FILE_CHAR_LIMIT);

  return (
    <CodeBlock
      code={displayContent}
      language={language}
      showLineNumbers={!isLargeFile}
      className={cn(
        'secondary-scrollbar h-full overflow-auto [&_pre]:overflow-x-auto',
        '[&_pre]:whitespace-pre [&>div]:overflow-auto [&>div>div]:overflow-x-auto',
        'border-neutral-3 bg-white! [&_.shiki]:bg-white! [&_.shiki]:shadow-xl!'
      )}
    >
      <div className="bg-neutral-light flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <div className="flex items-center gap-3">
          <CodeBlockLanguageLabel title={fileName} />

          {isLargeFile && (
            <span className="rounded border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Large file truncated for performance
            </span>
          )}
        </div>

        <CodeBlockCopyButton
          onCopy={handleCopy}
          onError={() => {}}
          className="ml-auto size-8 rounded-full px-2 hover:bg-gray-300"
          iconClassName="text-gray-500 size-4"
        />
      </div>
    </CodeBlock>
  );
}

function getTruncatedContent(text: string, maxLines: number) {
  const lines = text.split('\n');

  if (lines.length <= maxLines) {
    return text;
  }

  const topCount = Math.floor(maxLines / 2);
  const bottomCount = Math.ceil(maxLines / 2);

  const firstPart = lines.slice(0, topCount).join('\n');
  const lastPart = lines.slice(-bottomCount).join('\n');

  const hiddenCount = lines.length - (topCount + bottomCount);

  return `${firstPart}\n\n... [ ${hiddenCount} lines truncated for performance ] ...\n\n${lastPart}`;
}

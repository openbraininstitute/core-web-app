'use client';

import { useQuery } from '@tanstack/react-query';
import { Empty } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel, type IAsset } from '@/api/entitycore/types/shared/global';
import { BrokenImageIcon } from '@/components/icons/image-states';
import { getEntityCorePresignedUrl } from '@/services/entity-download/pre-singed-url';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
import { Skeleton } from '@/ui/molecules/skeleton';
import { keyBuilder } from '@/ui/use-query-keys/third-parties';
import { cn } from '@/utils/css-class';

import { useSelectedIonChannelModel } from '../hooks/use-selected-ion-channel-model';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { Config } from '@/features/scan-config/types';
import type { WorkspaceContext } from '@/types/common';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type FigureSummaryEntry = {
  order: number;
  group?: string;
  [field: string]: string | number | undefined;
};

type FigureSummaryJson = Record<string, FigureSummaryEntry>;

type GroupKey = 'traces' | 'parameters';

type CategoryEntry = {
  key: string;
  order: number;
  assets: Array<{ field: string; path: string }>;
};

type GroupedData = Record<GroupKey, CategoryEntry[]>;

function normalizeSummaryKey(key: string): string {
  return key.trim().toLowerCase();
}

function toDisplayLabel(value: string): string {
  if (normalizeSummaryKey(value) === 'ap') return 'AP';
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function parseSummary(data: FigureSummaryJson): GroupedData {
  const grouped: GroupedData = { traces: [], parameters: [] };

  for (const [key, entry] of Object.entries(data)) {
    const group: GroupKey =
      normalizeSummaryKey(String(entry.group || 'traces')) === 'parameters'
        ? 'parameters'
        : 'traces';

    const assets = Object.entries(entry)
      .filter(([f, v]) => f !== 'group' && f !== 'order' && typeof v === 'string')
      .map(([field, value]) => ({ field, path: value as string }));

    if (assets.length === 0) continue;

    grouped[group].push({
      key,
      order: typeof entry.order === 'number' ? entry.order : 0,
      assets,
    });
  }

  grouped.traces.sort((a, b) => a.order - b.order);
  grouped.parameters.sort((a, b) => a.order - b.order);

  return grouped;
}

function getFileName(path: string): string {
  return path.split('/').pop() || path;
}

function resolveAsset(modelAssets: IAsset[], rawPath?: string): IAsset | undefined {
  const target = rawPath?.trim();
  if (!target) return undefined;

  const directMatch = modelAssets.find(
    (asset) => asset.path === target || asset.path.endsWith(`/${target}`)
  );
  if (directMatch) return directMatch;

  const targetName = target.split('/').pop()?.toLowerCase();
  if (!targetName) return undefined;

  const targetWithPdf = targetName.endsWith('.pdf') ? targetName : `${targetName}.pdf`;

  return modelAssets.find((asset) => {
    const assetFileName = getFileName(asset.path).toLowerCase();
    return assetFileName === targetName || assetFileName === targetWithPdf;
  });
}

function PdfAsImage({
  asset,
  entity,
  context,
  label,
  className,
}: {
  asset: IAsset;
  entity: IonChannelModel;
  context: WorkspaceContext;
  label?: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [pageSize, setPageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const { data: presignedData, isLoading } = useQuery({
    queryKey: keyBuilder.s3presignedUrl({
      entityId: entity.id,
      assetId: asset.id,
      virtualLabId: context.virtualLabId,
      projectId: context.projectId,
    }),
    queryFn: () =>
      getEntityCorePresignedUrl({
        entityType: entity.type as TEntityTypeDict,
        entityId: entity.id,
        virtualLabId: context.virtualLabId,
        projectId: context.projectId,
        configAssetId: asset.id,
      }),
    enabled: !!entity.id && !!asset.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const calc = () => {
      if (containerRef.current && pageSize) {
        const cw = containerRef.current.clientWidth - 16;
        const ch = containerRef.current.clientHeight - 16;
        setScale(Math.min(cw / pageSize.width, ch / pageSize.height, 1));
      }
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [pageSize]);

  const handlePageLoad = ({ width, height }: { width: number; height: number }) => {
    if (!pageSize) setPageSize({ width, height });
  };

  if (isLoading) return <Skeleton className={cn('h-full w-full', className)} />;

  if (!presignedData?.url) {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <Empty description="Failed to load" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col overflow-hidden', className)}>
      {label && (
        <div className="shrink-0 px-1 pb-1 text-sm font-medium text-label uppercase">{label}</div>
      )}
      <div
        ref={containerRef}
        className="flex flex-1 items-center justify-center overflow-hidden bg-white rounded-md"
      >
        <Document
          file={presignedData.url}
          onLoadSuccess={() => {}}
          loading={<Skeleton className="h-full w-full" />}
          error={<Empty description="Error loading PDF" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
        >
          <Page
            pageNumber={1}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            scale={scale}
            onLoadSuccess={handlePageLoad}
          />
        </Document>
      </div>
    </div>
  );
}

export function IonChannelFigureViewer({ entity }: { entity: IonChannelModel }) {
  const context = useWorkspace();

  const [selectedGroup, setSelectedGroup] = useState<GroupKey>('traces');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const summaryAsset = entity.assets?.find(
    (a) => a.label === AssetLabel.ion_channel_model_figure_summary_json
  );

  const { data: grouped, isLoading: loadingSummary } = useQuery({
    queryKey: [
      'ion-channel-figure-summary',
      entity.id,
      summaryAsset?.id,
      context.virtualLabId,
      context.projectId,
    ],
    queryFn: async () => {
      if (!summaryAsset) return null;
      const presigned = await getEntityCorePresignedUrl({
        entityType: EntityTypeDict.IonChannelModel as TEntityTypeDict,
        entityId: entity.id,
        virtualLabId: context.virtualLabId,
        projectId: context.projectId,
        configAssetId: summaryAsset.id,
      });
      const response = await fetch(presigned.url);
      return (await response.json()) as FigureSummaryJson;
    },
    enabled: !!summaryAsset && !!context.virtualLabId && !!context.projectId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    select(data) {
      return data ? parseSummary(data) : null;
    },
  });

  const groupOptions = useMemo(() => {
    if (!grouped) return [];
    const opts: Array<{ key: GroupKey; label: string }> = [];
    if (grouped.traces.length > 0) opts.push({ key: 'traces', label: 'Model traces' });
    if (grouped.parameters.length > 0) opts.push({ key: 'parameters', label: 'Model parameters' });
    return opts;
  }, [grouped]);

  const categories = useMemo(() => {
    if (!grouped) return [];
    return grouped[selectedGroup].map((c) => ({
      key: c.key,
      label: toDisplayLabel(c.key),
    }));
  }, [grouped, selectedGroup]);

  const currentCategory = useMemo(() => {
    if (!grouped || !selectedCategory) return null;
    return grouped[selectedGroup].find((c) => c.key === selectedCategory) ?? null;
  }, [grouped, selectedGroup, selectedCategory]);

  const handleGroupChange = useCallback(
    (group: string) => {
      const g = group as GroupKey;
      setSelectedGroup(g);
      if (grouped) {
        setSelectedCategory(grouped[g][0]?.key ?? '');
      }
    },
    [grouped]
  );

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

  // Initialize or reset when entity or grouped data changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on entity.id change
  useEffect(() => {
    if (!grouped) {
      setSelectedCategory('');
      return;
    }
    const group: GroupKey = grouped.traces.length > 0 ? 'traces' : 'parameters';
    setSelectedGroup(group);
    setSelectedCategory(grouped[group][0]?.key ?? '');
  }, [entity.id, grouped]);

  const resolvedAssets = useMemo(() => {
    if (!currentCategory) return [];
    const modelAssets = entity.assets || [];
    const priority: Record<string, number> = {
      stimuli: 0,
      traces: 1,
      'time constant': 0,
      'steady state': 1,
    };

    return currentCategory.assets
      .map((a) => ({
        field: a.field,
        asset: resolveAsset(modelAssets, a.path),
      }))
      .filter((a): a is { field: string; asset: IAsset } => a.asset !== undefined)
      .sort((a, b) => {
        const pa = priority[a.field] ?? 99;
        const pb = priority[b.field] ?? 99;
        return pa - pb;
      });
  }, [currentCategory, entity.assets]);

  if (loadingSummary) {
    return (
      <div className="flex flex-col gap-3 p-4 h-full">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-10 w-full bg-gray-100 rounded-md" />
          <Skeleton className="h-10 w-full bg-gray-100 rounded-md" />
        </div>
        <div className="h-full flex flex-col items-center gap-1.5">
          <Skeleton className="h-1/2 w-full bg-gray-100 rounded-md" />
          <Skeleton className="h-1/2 w-full bg-gray-100 rounded-md" />
        </div>
      </div>
    );
  }

  if (!grouped || groupOptions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 overflow-hidden p-3 bg-white ml-4 rounded-md">
        <BrokenImageIcon className="text-gray-300 size-16" />
        <div className="text-primary-8 font-light text-lg select-none">
          No figures available for this model
        </div>
      </div>
    );
  }

  return (
    <div
      id="scan-config-ion-channel-figure-viewer"
      className="flex h-full flex-col gap-3 overflow-hidden p-3 bg-white ml-4 rounded-md"
    >
      <div className="flex gap-3 shrink-0">
        <div className="flex-1 flex flex-col gap-1">
          <Select value={selectedGroup} onValueChange={handleGroupChange}>
            <SelectTrigger className="w-full h-12! bg-white border-gray-200 capitalize text-base text-primary-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-100">
              {groupOptions.map((opt) => (
                <SelectItem
                  key={opt.key}
                  value={opt.key}
                  className="capitalize text-base cursor-pointer h-12! text-primary-9"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full h-12! bg-white border-gray-200 capitalize text-base text-primary-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-100">
              {categories.map((opt) => (
                <SelectItem
                  key={opt.key}
                  value={opt.key}
                  className="capitalize text-base cursor-pointer h-12! text-primary-9"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto secondary-scrollbar flex flex-col gap-2">
        {resolvedAssets.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            No figures found
          </div>
        ) : (
          resolvedAssets.map(({ field, asset }, indx) => (
            <div key={asset.id} className="flex-1 h-full">
              <div className="flex-1 h-full max-h-[calc(100%-10px)]">
                <PdfAsImage
                  asset={asset}
                  entity={entity}
                  context={context}
                  label={toDisplayLabel(field)}
                  className="h-full w-full"
                />
              </div>
              <div
                className={cn('h-px bg-gray-200 my-2', {
                  hidden: indx === resolvedAssets.length - 1,
                })}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

type Props = {
  selectedRootElement: string;
  selectedEntry: string;
  config: Config;
};

export function IonChannelModelRecordingRender({
  selectedEntry,
  selectedRootElement,
  config,
}: Props) {
  const { entity, isLoading } = useSelectedIonChannelModel({
    config,
    selectedRootElement,
    selectedEntry,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4 h-full">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-10 w-full bg-gray-100 rounded-md" />
          <Skeleton className="h-10 w-full bg-gray-100 rounded-md" />
        </div>
        <div className="h-full flex flex-col items-center gap-1.5">
          <Skeleton className="h-1/2 w-full bg-gray-100 rounded-md" />
          <Skeleton className="h-1/2 w-full bg-gray-100 rounded-md" />
        </div>
      </div>
    );
  }
  if (entity) {
    return <IonChannelFigureViewer entity={entity} />;
  }
  return null;
}

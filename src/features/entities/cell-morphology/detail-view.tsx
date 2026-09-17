'use client';

import { RiBox3Line, RiNodeTree, RiResetLeftLine } from '@remixicon/react';
import { skipToken, useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetContentType, AssetLabel, AssetStatus } from '@/api/entitycore/types/shared/global';
import { withErrorConfig } from '@/components/GenericErrorFallback';
import { MorphoViewer } from '@/components/MorphoViewer';
import { DEFAULT_SETTINGS } from '@/components/MorphoViewer/constants';
import { FullscreenButton } from '@/features/scan-config/components/color-by/chrome-button';
import { ModeToggle } from '@/features/scan-config/components/color-by/mode-toggle';
import {
  MenuButton,
  MenuRow,
  MenuSlider,
  ViewerControlsMenu,
  ViewerSwitch,
} from '@/features/scan-config/components/color-by/viewer-controls-menu';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';
import { FullscreenPortalScope } from '@/utils/fullscreen';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { MorphologySettings, Neurite } from '@/components/MorphoViewer/constants';
import type { IViewerModeOption } from '@/features/scan-config/components/color-by/mode-toggle';
import type { ColoringType, MorphologyCanvas } from '@/morpho-viewer';
import type { WorkspaceContext } from '@/types/common';

export function CellMorphologyViewer({ entity }: { entity: ICellMorphology }) {
  const ctx = useParams<WorkspaceContext>();
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<MorphologyCanvas['mode']>('mesh');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [neurites, setNeurites] = useState<Neurite[]>([]);

  const swcAsset = entity.assets?.find((asset) => asset.content_type === AssetContentType.swc);
  const meshAsset = entity.assets?.find(
    (asset) =>
      asset.label === AssetLabel.cell_surface_mesh &&
      asset.content_type === AssetContentType.gltf_binary &&
      asset.status === AssetStatus.CREATED
  );
  const modes: IViewerModeOption[] =
    meshAsset && swcAsset
      ? [
          {
            label: 'Mesh',
            testId: 'morphology-mode-mesh',
            icon: <RiBox3Line className="size-4" />,
            active: mode === 'mesh',
            onSelect: () => setMode('mesh'),
          },
          {
            label: 'Skeleton',
            testId: 'morphology-mode-skeleton',
            icon: <RiNodeTree className="size-4" />,
            active: mode === 'skeleton',
            onSelect: () => setMode('skeleton'),
          },
        ]
      : [];
  const shownMode = meshAsset ? mode : 'skeleton';

  const assetKey = (asset?: IAsset) =>
    keyBuilder.asset({
      assetId: asset?.id ?? '',
      entityId: entity.id,
      assetType: EntityTypeDict.CellMorphology,
      context: ctx,
      asRawResponse: true,
    });
  const download = (asset: IAsset) =>
    downloadAsset({
      ctx,
      entityType: EntityTypeDict.CellMorphology,
      entityId: entity.id,
      id: asset.id,
      asRawResponse: true,
    });
  const swc = useQuery({
    queryKey: assetKey(swcAsset),
    queryFn:
      swcAsset && shownMode === 'skeleton'
        ? () => download(swcAsset).then((response) => response.text())
        : skipToken,
    staleTime: Infinity,
  });
  const mesh = useQuery({
    queryKey: assetKey(meshAsset),
    queryFn:
      meshAsset && shownMode === 'mesh'
        ? () => download(meshAsset).then((response) => response.arrayBuffer())
        : skipToken,
    staleTime: Infinity,
  });

  return (
    <div
      ref={setRoot}
      className="relative h-[min(360px,42vh)] min-h-[260px] w-full overflow-hidden rounded-2xl border border-neutral-2 bg-white [&:fullscreen]:rounded-none"
    >
      <FullscreenPortalScope root={root}>
        <div className="h-full">
          <ErrorBoundary
            FallbackComponent={withErrorConfig({
              cls: { container: 'bg-white' },
              showButtons: false,
              customError: 'Error while loading morphology viewer',
            })}
          >
            <MorphoViewer
              className="h-full overflow-hidden rounded-2xl"
              swc={swc.data}
              swcError={!swcAsset || swc.isError}
              mode={shownMode}
              mesh={mesh.data}
              meshError={mesh.isError}
              settings={settings}
              onNeurites={setNeurites}
            />
          </ErrorBoundary>
        </div>
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <ModeToggle options={modes} />
          <FullscreenButton target={root} />
          <SettingsMenu
            settings={settings}
            onChange={setSettings}
            neurites={neurites}
            skeleton={shownMode === 'skeleton'}
          />
        </div>
      </FullscreenPortalScope>
    </div>
  );
}

const NEURITE_LABELS: Record<Neurite, string> = {
  soma: 'Soma',
  basalDendrite: 'Basal dendrite',
  apicalDendrite: 'Apical dendrite',
  axon: 'Axon',
};

const COLOR_BY: [ColoringType, string][] = [
  ['section', 'Section'],
  ['distance', 'Distance'],
];

function SettingsMenu({
  settings,
  onChange,
  neurites,
  skeleton,
}: {
  settings: MorphologySettings;
  onChange: (settings: MorphologySettings) => void;
  neurites: Neurite[];
  skeleton: boolean;
}) {
  const { darkMode, palettes, hidden, thickness, colorBy } = settings;
  const paletteName = darkMode ? 'dark' : 'light';
  const bothDendrites = neurites.includes('basalDendrite') && neurites.includes('apicalDendrite');
  const update = (patch: Partial<MorphologySettings>) => onChange({ ...settings, ...patch });

  return (
    <ViewerControlsMenu
      backgroundDark={darkMode}
      onBackgroundDarkChange={(dark) => update({ darkMode: dark })}
    >
      {neurites.length > 0 && (
        <>
          <SectionLabel>Neurites</SectionLabel>
          {neurites.map((neurite) => {
            const label =
              neurite.endsWith('Dendrite') && !bothDendrites ? 'Dendrite' : NEURITE_LABELS[neurite];
            const color = palettes[paletteName][neurite];
            return (
              <MenuRow
                key={neurite}
                label={label}
                icon={
                  <label
                    className="relative size-4 cursor-pointer rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: color }}
                  >
                    <input
                      type="color"
                      aria-label={`${label} color`}
                      value={color}
                      onChange={(event) =>
                        update({
                          palettes: {
                            ...palettes,
                            [paletteName]: {
                              ...palettes[paletteName],
                              [neurite]: event.target.value,
                            },
                          },
                        })
                      }
                      className="absolute inset-0 size-full cursor-pointer opacity-0"
                    />
                  </label>
                }
              >
                {neurite !== 'soma' && (
                  <ViewerSwitch
                    label={`Show ${label.toLowerCase()}`}
                    checked={!hidden.includes(neurite)}
                    onChange={(shown) =>
                      update({
                        hidden: shown ? hidden.filter((n) => n !== neurite) : [...hidden, neurite],
                      })
                    }
                  />
                )}
              </MenuRow>
            );
          })}
          <MenuButton
            icon={<RiResetLeftLine className="size-4 shrink-0" />}
            label="Reset colors"
            onClick={() => update({ palettes: DEFAULT_SETTINGS.palettes, hidden: [] })}
          />
          {skeleton && (
            <>
              <div className="mx-2 my-1 h-px bg-neutral-200" />
              <SectionLabel icon={<RiNodeTree className="size-4 shrink-0" />}>
                Skeleton view
              </SectionLabel>
              <MenuSlider
                label="Thickness"
                min={50}
                max={500}
                step={10}
                value={Math.round(thickness * 100)}
                format={(percent) => `${percent}%`}
                onChange={(percent) => update({ thickness: percent / 100 })}
              />
              <div className="flex flex-col gap-1 px-2 py-1.5 text-sm text-neutral-700">
                Color by
                <div className="grid grid-cols-2 gap-0.5 rounded-full bg-neutral-100 p-0.5">
                  {COLOR_BY.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={colorBy === value}
                      onClick={() => update({ colorBy: value })}
                      className={cn(
                        'h-7 rounded-full text-xs transition-colors focus-visible:outline-none',
                        colorBy === value
                          ? 'bg-primary-8 text-white'
                          : 'text-neutral-500 hover:bg-white'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </ViewerControlsMenu>
  );
}

function SectionLabel({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-2 pb-0.5 pt-1.5 text-xs font-medium text-neutral-500">
      <span className="inline-flex size-4 shrink-0 items-center justify-center">{icon}</span>
      {children}
    </div>
  );
}

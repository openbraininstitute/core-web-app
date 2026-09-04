import { RiImageLine } from '@remixicon/react';
import { Image as AntdImage } from 'antd';
import { useLayoutEffect, useRef, useState } from 'react';

import { getAsset } from '@/api/entitycore/selectors/assets';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { FamilyTree } from '@/components/icons/FamilyTree';
import { BrokenImageIcon, ImageIcon } from '@/components/icons/image-states';
import { View3d } from '@/components/icons/View3d';
import { CircuitScene } from '@/features/circuit-viewer/circuit-scene';
import { useCircuitImageURL } from '@/features/scan-config/components/hooks/circuit';
import { Skeleton } from '@/ui/molecules/skeleton';
import { classNames } from '@/util/utils';
import { fullscreenPopupContainer, toggleFullscreen } from '@/utils/fullscreen';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type {
  ICircuitSceneProps,
  IElectrodeOverlayOptions,
  TSceneMemodel,
  TSceneSubject,
} from '@/features/circuit-viewer/circuit-scene';
import type { IViewerModeOption } from '@/features/scan-config/components/color-by/mode-toggle';
import type { IFormBindingOptions } from '@/features/scan-config/components/model-preview/morphology-locations-block';

const ViewerModeDict = {
  Visualization: 'viz',
  Image: 'image',
  Dendrogram: 'dendrogram',
} as const;
type ViewerMode = (typeof ViewerModeDict)[keyof typeof ViewerModeDict];

function circuitHasDesignerImage(circuit: ICircuit): boolean {
  return (
    getAsset({
      assets: circuit.assets ?? [],
      label: AssetLabel.simulation_designer_image,
    }).getAllOrNull() !== null
  );
}

/**
 * Which pane the viewer shows. A stale dendrogram choice falls back to 3D, and circuits
 * without a designer image stay in 3D.
 */
function resolveActiveMode({
  enableVisualization,
  supportsDendrogram,
  hasDesignerImage,
  mode,
}: {
  enableVisualization: boolean;
  supportsDendrogram: boolean;
  hasDesignerImage: boolean;
  mode: ViewerMode;
}): ViewerMode {
  if (!enableVisualization) return ViewerModeDict.Image;
  if (mode === ViewerModeDict.Dendrogram) {
    return supportsDendrogram ? ViewerModeDict.Dendrogram : ViewerModeDict.Visualization;
  }
  if (!hasDesignerImage) return ViewerModeDict.Visualization;
  return mode;
}

interface ICircuitPreviewOptions {
  className?: string;
  enableVisualization?: boolean;
  largeCircuit?: boolean;
  /** Forwarded untouched — see {@link ICircuitSceneProps} for all four. */
  features?: Partial<IEntityViewerFeatures>;
  defaultNeuronOpacity?: number;
  form?: IFormBindingOptions;
  electrodes?: IElectrodeOverlayOptions;
}

type TCircuitPreviewProps = ICircuitPreviewOptions & TSceneSubject;

/**
 * The model as scan-config shows it: {@link CircuitScene} in 3D, with the
 * simulation designer's image beside it on a circuit, and the dendrogram of the
 * same cell beside it on an MEModel.
 */
export function CircuitPreview({
  className,
  circuit,
  memodel,
  enableVisualization = false,
  largeCircuit = false,
  features,
  defaultNeuronOpacity,
  form,
  electrodes,
}: TCircuitPreviewProps) {
  const [mode, setMode] = useState<ViewerMode>(ViewerModeDict.Visualization);
  const previewRef = useRef<HTMLDivElement>(null);

  const hasDesignerImage = circuit ? circuitHasDesignerImage(circuit) : false;
  // The dendrogram tab is only offered on MEModels.
  const supportsDendrogram = Boolean(memodel) && enableVisualization;
  const activeMode = resolveActiveMode({
    enableVisualization,
    supportsDendrogram,
    hasDesignerImage,
    mode,
  });

  const showImage = activeMode === ViewerModeDict.Image;
  // The dendrogram is the same scene morphed, not a pane of its own, so the 3D
  // half stays on show for both.
  const showViz =
    activeMode === ViewerModeDict.Visualization || activeMode === ViewerModeDict.Dendrogram;
  const showDendrogram = supportsDendrogram && activeMode === ViewerModeDict.Dendrogram;
  // Keep both panes mounted once available so mode switches don't remount
  // WebGL / reload morphologies (visibility only).
  const mountImage = Boolean(circuit) && (hasDesignerImage || !enableVisualization);
  const mountViz = enableVisualization;

  const modeToggle: IViewerModeOption[] = [
    {
      label: '3D visualization',
      icon: <View3d className="size-4" />,
      active: activeMode === ViewerModeDict.Visualization,
      onSelect: () => setMode(ViewerModeDict.Visualization),
    },
  ];
  if (hasDesignerImage) {
    modeToggle.push({
      label: 'Image',
      icon: <RiImageLine className="size-4" />,
      active: showImage,
      onSelect: () => setMode(ViewerModeDict.Image),
    });
  }
  if (supportsDendrogram) {
    modeToggle.push({
      label: 'Dendrogram',
      icon: <FamilyTree className="size-4" />,
      active: showDendrogram,
      onSelect: () => setMode(ViewerModeDict.Dendrogram),
    });
  }

  return (
    // The wrapper goes fullscreen, not the scene inside it, so the designer
    // image beside the scene is still on screen there.
    <div
      ref={previewRef}
      className="relative h-full min-h-0 overflow-hidden rounded-2xl [&:fullscreen]:rounded-none [&:fullscreen]:bg-white"
    >
      {mountImage && circuit && (
        <div
          className={classNames('absolute inset-0', !showImage && 'invisible pointer-events-none')}
          aria-hidden={!showImage}
          inert={!showImage || undefined}
        >
          <CircuitImage className={className} circuit={circuit} />
        </div>
      )}
      {mountViz && (
        <div className="absolute inset-0">
          <CircuitScene
            {...(circuit ? { circuit } : { memodel: memodel as TSceneMemodel })}
            largeCircuit={largeCircuit}
            active={showViz}
            dendrogram={showDendrogram}
            features={features}
            defaultNeuronOpacity={defaultNeuronOpacity}
            form={form}
            electrodes={electrodes}
            modeToggle={modeToggle}
            onToggleFullscreen={() => toggleFullscreen(previewRef.current)}
          />
        </div>
      )}
    </div>
  );
}

export function CircuitImage({ className, circuit }: { className?: string; circuit: ICircuit }) {
  const { data, isLoading, error } = useCircuitImageURL(circuit.id);
  const [loaded, setLoaded] = useState(false);

  useLayoutEffect(() => {
    if (!data) return;

    const img = new Image();
    img.src = data;
    img.onload = () => {
      setLoaded(true);
    };
  }, [data]);

  return (
    <div className={classNames('w-full h-full', className)}>
      {isLoading && (
        <Skeleton className="flex rounded-2xl items-center justify-center w-full h-full">
          <ImageIcon className="w-20 h-20 text-gray-300 rounded-2xl" />
        </Skeleton>
      )}
      {!isLoading && (error || !data) && (
        <Skeleton
          active={false}
          className="flex rounded-2xl items-center justify-center w-full h-full"
        >
          <BrokenImageIcon className="w-20 h-20 text-gray-300 rounded-2xl" />
        </Skeleton>
      )}
      {!isLoading && !error && data && !loaded && (
        <Skeleton className="flex rounded-2xl items-center justify-center w-full h-full">
          <ImageIcon className="w-20 h-20 text-gray-300 rounded-2xl" />
        </Skeleton>
      )}
      {!isLoading && !error && data && loaded && (
        <div
          id="scan-config-circuit-preview"
          className="w-full h-full min-h-0 p-2 overflow-hidden rounded-2xl shadow-[inset_0_0_0_1px_#fff,0_0_0_1px_rgba(0,0,0,0.04)] bg-white"
        >
          <div className="w-full h-full overflow-hidden [&_.ant-image]:block! [&_.ant-image]:w-full! [&_.ant-image]:h-full! [&_.ant-image-img]:w-full! [&_.ant-image-img]:h-full! [&_.ant-image-img]:object-contain!">
            <AntdImage
              src={data}
              alt="Circuit preview"
              preview={{ getContainer: fullscreenPopupContainer }}
              className="block! w-full! h-full!"
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

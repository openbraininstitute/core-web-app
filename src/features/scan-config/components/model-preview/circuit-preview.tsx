import { RiImage2Line, RiImageLine } from '@remixicon/react';
import { Image as AntdImage } from 'antd';
import { useLayoutEffect, useState } from 'react';

import { getAsset } from '@/api/entitycore/selectors/assets';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { FamilyTree } from '@/components/icons/FamilyTree';
import { BrokenImageIcon, ImageIcon } from '@/components/icons/image-states';
import { View3d } from '@/components/icons/View3d';
import { CircuitScene } from '@/features/circuit-viewer/circuit-scene';
import { useCircuitImageURL } from '@/features/scan-config/components/hooks/circuit';
import { Skeleton } from '@/ui/molecules/skeleton';
import { classNames } from '@/util/utils';
import { FullscreenPortalScope, fullscreenPopupContainer } from '@/utils/fullscreen';

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
  DesignerImage: 'designer-image',
  CircuitVisualization: 'circuit-visualization',
  Dendrogram: 'dendrogram',
} as const;
type ViewerMode = (typeof ViewerModeDict)[keyof typeof ViewerModeDict];

function circuitHasAsset(circuit: ICircuit, label: AssetLabel): boolean {
  return getAsset({ assets: circuit.assets ?? [], label }).getAllOrNull() !== null;
}

/**
 * Which pane the viewer shows. A stale dendrogram or image choice falls back to 3D
 * once the circuit no longer has the asset it needs.
 */
function resolveActiveMode({
  enableVisualization,
  supportsDendrogram,
  hasDesignerImage,
  hasCircuitVisualization,
  mode,
}: {
  enableVisualization: boolean;
  supportsDendrogram: boolean;
  hasDesignerImage: boolean;
  hasCircuitVisualization: boolean;
  mode: ViewerMode;
}): ViewerMode {
  if (!enableVisualization) return ViewerModeDict.DesignerImage;
  if (mode === ViewerModeDict.Dendrogram) {
    return supportsDendrogram ? ViewerModeDict.Dendrogram : ViewerModeDict.Visualization;
  }
  if (mode === ViewerModeDict.DesignerImage && !hasDesignerImage) {
    return ViewerModeDict.Visualization;
  }
  if (mode === ViewerModeDict.CircuitVisualization && !hasCircuitVisualization) {
    return ViewerModeDict.Visualization;
  }
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
 * The model as scan-config shows it: {@link CircuitScene} in 3D, with the circuit's
 * visualization and simulation designer images beside it where a circuit has them, and
 * the dendrogram of the same cell beside it on an MEModel.
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
  // State, not a ref: the chrome's button and the portal scope read it while
  // rendering.
  const [previewRoot, setPreviewRoot] = useState<HTMLDivElement | null>(null);

  const hasDesignerImage = circuit
    ? circuitHasAsset(circuit, AssetLabel.simulation_designer_image)
    : false;
  const hasCircuitVisualization = circuit
    ? circuitHasAsset(circuit, AssetLabel.circuit_visualization)
    : false;
  // The dendrogram tab is only offered on MEModels.
  const supportsDendrogram = Boolean(memodel) && enableVisualization;
  const activeMode = resolveActiveMode({
    enableVisualization,
    supportsDendrogram,
    hasDesignerImage,
    hasCircuitVisualization,
    mode,
  });

  const showDesignerImage = activeMode === ViewerModeDict.DesignerImage;
  const showCircuitVisualization = activeMode === ViewerModeDict.CircuitVisualization;
  // The dendrogram is the same scene morphed, not a pane of its own, so the 3D
  // half stays on show for both.
  const showViz =
    activeMode === ViewerModeDict.Visualization || activeMode === ViewerModeDict.Dendrogram;
  const showDendrogram = supportsDendrogram && activeMode === ViewerModeDict.Dendrogram;
  // Keep every pane mounted once available so mode switches don't remount
  // WebGL / reload morphologies (visibility only).
  const mountDesignerImage = Boolean(circuit) && (hasDesignerImage || !enableVisualization);
  const mountCircuitVisualization = Boolean(circuit) && hasCircuitVisualization;
  const mountViz = enableVisualization;

  const modeToggle: IViewerModeOption[] = [
    {
      label: '3D visualization',
      testId: 'viewer-mode-visualization',
      icon: <View3d className="size-4" />,
      active: activeMode === ViewerModeDict.Visualization,
      onSelect: () => setMode(ViewerModeDict.Visualization),
    },
  ];
  if (hasCircuitVisualization) {
    modeToggle.push({
      label: 'Circuit visualization',
      testId: 'viewer-mode-circuit-visualization',
      icon: <RiImage2Line className="size-4" />,
      active: showCircuitVisualization,
      onSelect: () => setMode(ViewerModeDict.CircuitVisualization),
    });
  }
  if (hasDesignerImage) {
    modeToggle.push({
      label: 'Simulation designer image',
      testId: 'viewer-mode-image',
      icon: <RiImageLine className="size-4" />,
      active: showDesignerImage,
      onSelect: () => setMode(ViewerModeDict.DesignerImage),
    });
  }
  if (supportsDendrogram) {
    modeToggle.push({
      label: 'Dendrogram',
      testId: 'viewer-mode-dendrogram',
      icon: <FamilyTree className="size-4" />,
      active: showDendrogram,
      onSelect: () => setMode(ViewerModeDict.Dendrogram),
    });
  }

  return (
    // The wrapper goes fullscreen, not the scene inside it, so the designer
    // image beside the scene is still on screen there.
    <div
      ref={setPreviewRoot}
      className="relative h-full min-h-0 overflow-hidden rounded-2xl [&:fullscreen]:rounded-none [&:fullscreen]:bg-white"
    >
      <FullscreenPortalScope root={previewRoot}>
        {mountDesignerImage && circuit && (
          <div
            className={classNames(
              'absolute inset-0',
              !showDesignerImage && 'invisible pointer-events-none'
            )}
            aria-hidden={!showDesignerImage}
            inert={!showDesignerImage || undefined}
          >
            <CircuitImage
              className={className}
              circuit={circuit}
              label={AssetLabel.simulation_designer_image}
            />
          </div>
        )}
        {mountCircuitVisualization && circuit && (
          <div
            className={classNames(
              'absolute inset-0',
              !showCircuitVisualization && 'invisible pointer-events-none'
            )}
            aria-hidden={!showCircuitVisualization}
            inert={!showCircuitVisualization || undefined}
          >
            <CircuitImage
              className={className}
              circuit={circuit}
              label={AssetLabel.circuit_visualization}
            />
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
              fullscreen={{ target: previewRoot }}
            />
          </div>
        )}
      </FullscreenPortalScope>
    </div>
  );
}

export function CircuitImage({
  className,
  circuit,
  label,
}: {
  className?: string;
  circuit: ICircuit;
  label: AssetLabel;
}) {
  const { data, isLoading, error } = useCircuitImageURL(circuit.id, label);
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
          id={`scan-config-circuit-preview-${label}`}
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

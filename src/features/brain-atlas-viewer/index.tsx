'use client';

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { match } from 'ts-pattern';
import { Vector3 } from 'three';

import ViewerComposer from '@/features/brain-atlas-viewer/viewer-composer';
import FullScreen from '@/features/brain-atlas-viewer/full-screen';
import Loader from '@/components/loader';
import { log } from '@/utils/logger';

import type { TSuspenseStatus } from '@/components/suspense-with-status';

/**
 * CameraController synchronizes the camera's zoom level with external state and detects user-initiated zoom changes.
 *
 * @param zoom - The current zoom level to apply to the camera when not being changed by the user.
 * @param onUserZoomChange - Callback invoked when the user manually changes the camera's zoom.
 * @param isUserZooming - Flag indicating whether the user is currently interacting with the zoom.
 * @param setIsUserZooming - Setter to update the user zooming state.
 *
 * This component uses Three.js's camera and monitors its zoom property. When the zoom prop changes and the user is not zooming,
 * it updates the camera's zoom. It also polls for manual zoom changes and triggers the appropriate callbacks and state updates.
 *
 * Returns `null` as it does not render any JSX.
 */
function CameraController({
  zoom,
  onUserZoomChange,
  isUserZooming,
  setIsUserZooming,
}: {
  zoom: number;
  onUserZoomChange: (zoom: number) => void;
  isUserZooming: boolean;
  setIsUserZooming: (zooming: boolean) => void;
}) {
  const { camera, invalidate } = useThree();
  const lastCameraZoom = useRef<number>(zoom);

  useEffect(() => {
    if (camera && 'zoom' in camera) {
      // only update camera zoom if it's not from user interaction
      if (!isUserZooming) {
        camera.zoom = zoom;
        camera.updateProjectionMatrix();
        invalidate();
        lastCameraZoom.current = zoom;
      }
    }
  }, [zoom, camera, invalidate, isUserZooming]);

  // track manual zoom changes
  useEffect(() => {
    const checkZoomChange = () => {
      if (camera && 'zoom' in camera) {
        const currentZoom = camera.zoom;
        const threshold = 0.01; // small threshold to avoid noise

        if (Math.abs(currentZoom - lastCameraZoom.current) > threshold) {
          setIsUserZooming(true);
          onUserZoomChange(currentZoom);
          lastCameraZoom.current = currentZoom;

          // reset user zooming flag after a delay
          setTimeout(() => setIsUserZooming(false), 500);
        }
      }
    };

    const interval = setInterval(checkZoomChange, 100);
    return () => clearInterval(interval);
  }, [camera, onUserZoomChange, setIsUserZooming]);

  return null;
}

export function AtlasViewer({ dataKey, children }: { dataKey: string; children?: ReactNode }) {
  const threeDRef = useRef<HTMLDivElement>(null);
  const [meshLoadingStatus, setMeshLoadingStatus] = useState<TSuspenseStatus>('pending');
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [pointCloudLoadingStatus, setPointCloudLoadingStatus] =
    useState<TSuspenseStatus>('pending');

  // track user's manual zoom level
  const [userBaseZoom, setUserBaseZoom] = useState<number>(1.3);
  const [isUserZooming, setIsUserZooming] = useState<boolean>(false);

  // track container size using `ResizeObserver` to ensure the Canvas always fits its parent
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const updateSize = useCallback(() => {
    const element = threeDRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const newWidth = Math.max(0, Math.floor(rect.width) - 10);
    const newHeight = Math.max(0, Math.floor(rect.height));

    setContainerSize((prev) => {
      // only update if size actually changed to avoid unnecessary re-renders
      if (prev.width !== newWidth || prev.height !== newHeight) {
        return { width: newWidth, height: newHeight };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const element = threeDRef.current;
    if (!element) return;
    updateSize();

    // observe size changes with debouncing for better performance
    let timeoutId: NodeJS.Timeout;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        const { width, height } = entry.contentRect;
        const newWidth = Math.max(0, Math.floor(width) - 10);
        const newHeight = Math.max(0, Math.floor(height));

        setContainerSize((prev) => {
          if (prev.width !== newWidth || prev.height !== newHeight) {
            return { width: newWidth, height: newHeight };
          }
          return prev;
        });
      }, 8);
    });

    observer.observe(element);

    const handleWindowResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateSize, 8);
    };

    // monitor `ai` container state changes via MutationObserver
    const aiContainer = document.getElementById('workspace-ai');
    let mutationObserver: MutationObserver | null = null;

    if (aiContainer) {
      mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            setTimeout(() => {
              updateSize();
            }, 100);
          }
        });
      });

      mutationObserver.observe(aiContainer, {
        attributes: true,
        attributeFilter: ['style'],
      });
    }

    window.addEventListener('resize', handleWindowResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      if (mutationObserver) {
        mutationObserver.disconnect();
      }
      clearTimeout(timeoutId);
    };
  }, [isFullScreen, updateSize]);

  const onMeshLoadingStatusChange = useCallback((status: TSuspenseStatus) => {
    setMeshLoadingStatus(status);
  }, []);

  const onPointCloudLoadingStatusChange = useCallback((status: TSuspenseStatus) => {
    setPointCloudLoadingStatus(status);
  }, []);

  const handleFullScreenToggle = () => {
    setIsFullScreen((prev) => !prev);
  };

  const isLoading = meshLoadingStatus === 'pending' || pointCloudLoadingStatus === 'pending';

  const handleUserZoomChange = useCallback((newZoom: number) => {
    setUserBaseZoom(newZoom);
  }, []);

  const containerScaleFactor = useMemo(() => {
    if (!containerSize.width || !containerSize.height) {
      return 1.0;
    }

    // base reference size (what was good for the original 1.3 zoom)
    const baseWidth = 800;
    const baseHeight = 600;

    // calculate scaling based on the limiting dimension to ensure content fits
    const widthRatio = containerSize.width / baseWidth;
    const heightRatio = containerSize.height / baseHeight;

    // use the smaller ratio to ensure content fits entirely (no cutting)
    const limitingScale = Math.min(widthRatio, heightRatio);

    // add safety margin to prevent any edge cutting
    const safetyMargin = 0.9; // 10% safety margin
    const safeScale = limitingScale * safetyMargin;

    // apply additional scaling for very small containers to maintain visibility
    const minDimension = Math.min(containerSize.width, containerSize.height);
    let visibilityBoost = 1;

    if (minDimension < 400) {
      // boost zoom for very small containers to keep brain visible
      const smallRatio = minDimension / 400;
      visibilityBoost = 0.8 + smallRatio * 0.4; // Scale from 0.8 to 1.2
    }

    // apply aspect ratio penalty for very wide or very narrow containers
    const containerAspectRatio = containerSize.width / containerSize.height;
    let aspectPenalty = 1;

    if (containerAspectRatio > 3 || containerAspectRatio < 0.5) {
      // reduce zoom significantly for extreme aspect ratios to prevent cutting
      aspectPenalty = 0.6;
    } else if (containerAspectRatio > 2.5 || containerAspectRatio < 0.7) {
      aspectPenalty = 0.7;
    } else if (containerAspectRatio > 2 || containerAspectRatio < 0.8) {
      aspectPenalty = 0.85;
    }

    // special handling for AI assistant open (narrow containers)
    let aiAssistantPenalty = 1;
    if (containerSize.width < 600) {
      // very aggressive zoom out when AI assistant is likely open
      const narrowRatio = containerSize.width / 600;
      aiAssistantPenalty = 0.5 + narrowRatio * 0.3; // Scale from 0.5 to 0.8
    }

    // calculate final scale factor
    const finalScale = safeScale * visibilityBoost * aspectPenalty * aiAssistantPenalty;
    const clampedScale = Math.max(0.15, Math.min(3.0, finalScale));

    // keep this for debugging AI assistant behavior
    if (containerSize.width < 600) {
      log('warn', '🧠 brain zoom adjusted for narrow container:', {
        containerWidth: containerSize.width,
        finalScale: clampedScale,
      });
    }

    return clampedScale;
  }, [containerSize.width, containerSize.height]);

  // calculate final zoom by applying scale factor to user's base zoom
  const finalZoom = useMemo(() => {
    const result = userBaseZoom * containerScaleFactor;
    const clampedResult = Math.max(0.1, Math.min(8.0, result));
    return clampedResult;
  }, [userBaseZoom, containerScaleFactor]);

  const renderViewer = useMemo(
    () => (
      <>
        <Canvas
          dpr={[1, 2]}
          style={{
            width: containerSize.width || '100%',
            height: containerSize.height || '100%',
            display: 'block',
            transition: 'width 0.3s ease-out, height 0.3s ease-out',
            willChange: 'width',
          }}
          camera={{
            position: [2000, 1683.079, -14311.903],
            up: [0, -1, 0],
            fov: 55,
            far: 100000,
            zoom: finalZoom,
            type: 'PerspectiveCamera',
          }}
          resize={{ debounce: 16 }}
        >
          <CameraController
            zoom={finalZoom}
            onUserZoomChange={handleUserZoomChange}
            isUserZooming={isUserZooming}
            setIsUserZooming={setIsUserZooming}
          />
          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            enableDamping
            zoomSpeed={0.3}
            dampingFactor={0.05}
            target={new Vector3(6612.504, 3938.164, 5712.791)}
          />
          <ViewerComposer
            dataKey={dataKey}
            onMeshLoadingStatusChange={onMeshLoadingStatusChange}
            onPointCloudLoadingStatusChange={onPointCloudLoadingStatusChange}
          />
        </Canvas>
      </>
    ),
    [
      dataKey,
      onMeshLoadingStatusChange,
      onPointCloudLoadingStatusChange,
      containerSize.width,
      containerSize.height,
      finalZoom,
      handleUserZoomChange,
      isUserZooming,
      setIsUserZooming,
    ]
  );

  return match(isFullScreen)
    .with(true, () => {
      return (
        <div className="fixed inset-0 z-[9999] bg-black">
          <FullScreen isFullScreen={isFullScreen} onToggle={handleFullScreenToggle} />
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/5">
              <Loader className="text-neutral-3" />
            </div>
          )}
          <div ref={threeDRef} className="relative h-full w-full">
            {renderViewer}
          </div>
        </div>
      );
    })
    .otherwise(() => {
      return (
        <div className="@container relative flex h-full max-h-full w-full max-w-full flex-col items-start lg:flex-row">
          <FullScreen isFullScreen={isFullScreen} onToggle={handleFullScreenToggle} />
          <div
            ref={threeDRef}
            className="relative h-1/2 w-full min-w-0 rounded-2xl lg:h-full lg:min-h-0 lg:flex-[2]"
          >
            {isLoading && (
              <div className="bg-primary-9/40 absolute inset-0 z-10 flex items-center justify-center rounded-2xl">
                <Loader className="text-neutral-3" />
              </div>
            )}
            {renderViewer}
          </div>
          <div className="relative h-1/2 w-full min-w-0 lg:h-full lg:min-h-0 lg:flex-1">
            {children}
          </div>
        </div>
      );
    });
}

export default AtlasViewer;

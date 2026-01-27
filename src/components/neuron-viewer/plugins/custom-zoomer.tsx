import { ConfigProvider } from 'antd';
import { type RefObject, useEffect, useState } from 'react';
import { Zoomer } from '@/components/neuron-viewer/plugins/zoomer';
import type { NeuronViewerRenderer } from '@/services/bluenaas-single-cell/renderer';
import { cn } from '@/utils/css-class';

type Props = {
  placement?: 'left' | 'right';
  renderer: RefObject<NeuronViewerRenderer | null>;
};

export function CustomZoomer({ renderer, placement = 'left' }: Props) {
  const [value, setValue] = useState(0);

  const onChange = (zoomValue: number) => {
    setValue(zoomValue);
    const activeRenderer = renderer.current;
    if (activeRenderer) {
      activeRenderer._camera.zoom = zoomValue;
      activeRenderer._camera.updateProjectionMatrix();
    }
  };

  const onZoomIn = () => {
    const activeRenderer = renderer.current;
    if (activeRenderer) {
      const currentZoom = Math.min(value + 0.1, 5);
      activeRenderer._camera.zoom = currentZoom;
      activeRenderer._camera.updateProjectionMatrix();
      setValue(currentZoom);
    }
  };

  const onZoomOut = () => {
    const activeRenderer = renderer.current;
    if (activeRenderer) {
      const currentZoom = Math.max(value - 0.1, 1);
      activeRenderer._camera.zoom = currentZoom;
      activeRenderer._camera.updateProjectionMatrix();
      setValue(currentZoom);
    }
  };

  useEffect(() => {
    const activeRenderer = renderer.current;

    function updateZoom(e: WheelEvent) {
      if (activeRenderer) {
        let zoomValue = activeRenderer._camera.zoom;
        activeRenderer._orbitControl.enabled = true;
        if (e.deltaY < 0) {
          zoomValue = Math.min(zoomValue + 0.1, 5);
        } else {
          zoomValue = Math.max(zoomValue - 0.1, 1);
        }
        if (zoomValue < 5 && zoomValue > 1) {
          setValue(zoomValue);
          activeRenderer._camera.zoom = zoomValue;
          activeRenderer._camera.updateProjectionMatrix();
        } else {
          activeRenderer._orbitControl.enabled = false;
          e.preventDefault();
        }
      }
    }

    if (renderer.current) {
      setValue(renderer.current._camera.zoom);
      renderer.current._renderer.domElement.addEventListener('wheel', updateZoom, {
        passive: false,
      });
    }

    return () => {
      if (activeRenderer) {
        activeRenderer._renderer.domElement.removeEventListener('wheel', updateZoom);
      }
    };
  }, [renderer]);

  return (
    <div className={cn('absolute bottom-4 z-50', placement === 'left' ? 'left-6' : 'right-6')}>
      <ConfigProvider
        theme={{
          components: {
            Slider: {
              controlSize: 22,
              railBg: '#595959',
              railHoverBg: '#FFFFFF',
              trackBg: '#FFFFFF',
              trackHoverBg: '#595959',
              railSize: 1,
              handleSize: 10,
              handleSizeHover: 12,
              handleColor: '#003A8C',
              dotActiveBorderColor: '#003A8C',
              handleLineWidth: 1,
              handleLineWidthHover: 1.4,
            },
          },
        }}
      >
        <Zoomer
          className="h-48"
          value={value}
          onChange={onChange}
          onZoomOut={onZoomOut}
          onZoomIn={onZoomIn}
        />
      </ConfigProvider>
    </div>
  );
}

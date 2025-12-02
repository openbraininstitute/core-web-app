import { RefObject, useEffect } from 'react';
import {
  NeuronViewerRenderer,
  TNeuronViewerClickData,
  TNeuronViewerHoverData,
} from '@/services/bluenaas-single-cell/renderer';

export function useNeuronViewerActions({
  renderer,
  useActions = false,
  actions,
}: {
  useActions?: boolean;
  renderer: RefObject<NeuronViewerRenderer | null>;
  actions?: {
    onClick?: (data: TNeuronViewerClickData) => void;
    onHover?: (data: TNeuronViewerHoverData) => void;
    onHoverEnd?: (data: TNeuronViewerHoverData) => void;
    onZoom?: (data: TNeuronViewerHoverData) => void;
  };
}) {
  useEffect(() => {
    if (!useActions) return;
    if (renderer.current) {
      if (actions?.onClick) {
        renderer.current.configOnClick = actions.onClick;
      }
      if (actions?.onHover) {
        renderer.current.configOnHover = actions.onHover;
      }
      if (actions?.onHoverEnd) {
        renderer.current.configOnHoverEnd = actions.onHoverEnd;
      }
    }
  }, [actions?.onClick, actions?.onHover, actions?.onHoverEnd, renderer, useActions]);
}

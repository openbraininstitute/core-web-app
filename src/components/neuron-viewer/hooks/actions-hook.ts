import { type RefObject, useEffect } from 'react';
import type {
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
        // eslint-disable-next-line no-param-reassign
        renderer.current.configOnClick = actions.onClick;
      }
      if (actions?.onHover) {
        // eslint-disable-next-line no-param-reassign
        renderer.current.configOnHover = actions.onHover;
      }
      if (actions?.onHoverEnd) {
        // eslint-disable-next-line no-param-reassign
        renderer.current.configOnHoverEnd = actions.onHoverEnd;
      }
    }
  }, [actions?.onClick, actions?.onHover, actions?.onHoverEnd, renderer, useActions]);
}

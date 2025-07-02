import React from 'react';

import { classNames } from '@/util/utils';

import styles from './zoomable-image.module.css';

export interface ZoomableImageProps {
  className?: string;
  src?: string;
}

export default function ZoomableImage({ className, src }: ZoomableImageProps) {
  const refImageSize = React.useRef([1, 1]);
  const [width, height] = refImageSize.current;
  const [x, setX] = React.useState(0.5);
  const [y, setY] = React.useState(0.5);
  const [zoom, setZoom] = React.useState(1);
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.src = src;
    img.onload = () => {
      refImageSize.current = [img.width, img.height];
      setLoaded(true);
    };
  }, [src]);
  const styleImage: React.CSSProperties = {
    backgroundImage: `url(${src})`,
    transform: `scale(${zoom})`,
    transformOrigin: `${x * 100}% ${y * 100}`,
  };
  const handleDoubleClick = (evt: React.MouseEvent) => {
    if (zoom > 1) {
      setX(0.5);
      setY(0.5);
      setZoom(1);
    } else {
      const { clientX, clientY } = evt;
      console.log('🚀 [zoomable-image] clientX, clientY =', clientX, clientY); // @FIXME: Remove this line written on 2025-07-02 at 09:48
      setZoom(2);
    }
  };

  return (
    <div
      className={classNames(className, styles.zoomableImageContainer, loaded && styles.show)}
      onDoubleClick={handleDoubleClick}
    >
      <div className={classNames(className, styles.zoomableImage)} style={styleImage} />
    </div>
  );
}

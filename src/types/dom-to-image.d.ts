declare module 'dom-to-image' {
  interface Options {
    quality?: number;
    width?: number;
    height?: number;
    filter?: (node: Node) => boolean;
    bgcolor?: string;
    style?: Record<string, string>;
    imagePlaceholder?: string;
    cacheBust?: boolean;
  }

  export function toPng(node: HTMLElement, options?: Options): Promise<string>;
  export function toJpeg(node: HTMLElement, options?: Options): Promise<string>;
  export function toBlob(node: HTMLElement, options?: Options): Promise<Blob>;
  export function toPixelData(node: HTMLElement, options?: Options): Promise<Uint8ClampedArray>;
  export function toSvg(node: HTMLElement, options?: Options): Promise<string>;
}


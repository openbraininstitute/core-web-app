import dynamic from 'next/dynamic';

const DevToolsDynamic =
  process.env.NEXT_PUBLIC_ENABLE_JOTAI_DEVTOOLS === 'true'
    ? dynamic(() => import('./jotai-devtools').then((mod) => ({ default: mod.DevTools })), {
        ssr: false,
      })
    : null;

export function JotaiDevTools() {
  return DevToolsDynamic ? <DevToolsDynamic position="bottom-right" /> : null;
}

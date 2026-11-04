import { type ComponentType, lazy, Suspense } from 'react';

/** `next/dynamic` for `vi.mock('next/dynamic', () => import('@/__tests__/viewer-3d/lazy-next-dynamic'))`. */
export default function dynamic(load: () => Promise<ComponentType<object>>) {
  const Lazy = lazy(() => load().then((component) => ({ default: component })));
  return (props: object) => (
    <Suspense fallback={null}>
      <Lazy {...props} />
    </Suspense>
  );
}

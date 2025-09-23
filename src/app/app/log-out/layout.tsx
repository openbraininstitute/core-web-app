import { SharedLayout } from '@/ui/layouts/shared-layout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SharedLayout>{children}</SharedLayout>;
}

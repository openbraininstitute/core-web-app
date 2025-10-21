import HeaderSFN2025 from '@/ui/segments/sfn-2025/header';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full">
      <HeaderSFN2025 />
      {children}
    </div>
  );
}

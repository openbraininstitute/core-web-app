import Link from 'next/link';

import ObiLogo from '@/features/learn/components/ui/ObiLogo';

/**
 * The OBI theme's header: the logo, top left, in OBI navy, leading back to the
 * Learn page. Always rendered and shown by CSS (`.obi-only`), so in that theme
 * it is there on the first paint instead of appearing once React has loaded.
 */
export default function SiteBar({ home }: { home: string }) {
  return (
    <header className="obi-only h-(--chrome-h) shrink-0 items-center border-b border-slate-800 bg-white px-5 sm:px-8">
      <Link href={home} aria-label="Back to Learn" className="text-[#002766]">
        <ObiLogo className="h-10 w-auto" />
      </Link>
    </header>
  );
}

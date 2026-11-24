'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

import { Skeleton } from '@/ui/molecules/skeleton';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const DOCUMENT_OPTIONS = { standardFontDataUrl: '/standard_fonts/' };
/** Drawn larger than it is shown, so it stays sharp at the card's full width. */
const DRAWN_WIDTH = 1400;

/** A walkthrough's PDF, its pages one after another to the right, each as tall as there is room for. */
export default function WalkthroughPdfView({ url }: { url: string }) {
  const [pages, setPages] = useState(0);
  return (
    <Document
      file={url}
      options={DOCUMENT_OPTIONS}
      onLoadSuccess={({ numPages }) => setPages(numPages)}
      loading={<Skeleton className="aspect-[842/595] w-full rounded-[14px]" />}
      error={
        <p className="p-10 text-center text-[15px] text-[#8c8c8c]">The PDF could not be shown.</p>
      }
      className="secondary-scrollbar flex snap-x gap-[14px] overflow-x-auto pb-[10px] lg:h-[100cqh] [&_canvas]:h-auto! [&_canvas]:w-full!"
    >
      {Array.from({ length: pages }, (_, i) => (
        <Page
          // biome-ignore lint/suspicious/noArrayIndexKey: the page number is the identity here
          key={i}
          pageNumber={i + 1}
          width={DRAWN_WIDTH}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="aspect-[842/595] w-[min(100%,calc((100cqh_-_18px)*842/595))] min-w-0! shrink-0 snap-center self-start overflow-hidden rounded-[14px] border border-[#e8e8e8]"
        />
      ))}
    </Document>
  );
}

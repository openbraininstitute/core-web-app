import type { LinkAndDownloadArtifactProps } from '@/ui/segments/reports/obi-showcases/showcase-type';

export default function SingleArtifact({ content }: { content: LinkAndDownloadArtifactProps }) {
  return content._type === 'artifactDownload' ? (
    <div className="relative flex w-full flex-col items-start">
      <header className="text-primary-9 relative flex w-full flex-row items-center justify-between">
        <div className="text-[24px] font-bold">{content.title}</div>
        {content.file && (
          <a
            href={content.file}
            className="border-primary-9 hover:bg-primary-9 border border-solid bg-white px-6 py-3 text-lg transition-colors duration-300 hover:text-white"
            download
            target="_blank"
            rel="noopener noreferrer"
          >
            Download
          </a>
        )}
      </header>

      <div className="bg-neutral-3 mt-3 mb-5 h-px w-12" />

      <p className="w-full text-xl leading-normal">{content.description}</p>
    </div>
  ) : (
    <div className="relative flex w-full flex-col items-start">
      <header className="text-primary-9 relative flex w-full flex-row items-center justify-between">
        <div className="text-[24px] font-bold">{content.title}</div>

        <a
          href={content.url}
          className="border-primary-9 hover:bg-primary-9 border border-solid bg-white px-6 py-3 text-lg transition-colors duration-300 hover:text-white"
          target="_blank"
          rel="noopener noreferrer"
        >
          View Artifact
        </a>
      </header>

      <div className="bg-neutral-3 mt-3 mb-5 h-px w-16" />

      <p className="w-full text-xl leading-normal">{content.description}</p>
    </div>
  );
}

import { LinkAndDownloadArtifactProps } from './type';

export default function SingleArtifact({ content }: { content: LinkAndDownloadArtifactProps }) {
  return content._type === 'artifactDownload' ? (
    <div className="relative flex w-1/2 flex-col items-start">
      <header className="relative flex w-full flex-row items-center justify-between text-primary-9">
        <div className="text-[24px] font-bold">{content.title}</div>
        {content.file && (
          <a
            href={content.file}
            className="border border-solid border-primary-9 bg-white px-6 py-3 text-lg transition-colors duration-300 hover:bg-primary-9 hover:text-white"
            download
          >
            Download
          </a>
        )}
      </header>

      <div className="mb-5 mt-3 h-px w-12 bg-neutral-3" />

      <p className="w-full text-xl leading-normal">{content.description}</p>
    </div>
  ) : (
    <div className="relative flex w-1/2 flex-col items-start">
      <header className="relative flex w-full flex-row items-center justify-between text-primary-9">
        <div className="text-[24px] font-bold">{content.title}</div>

        <a
          href={content.url}
          className="border border-solid border-primary-9 bg-white px-6 py-3 text-lg transition-colors duration-300 hover:bg-primary-9 hover:text-white"
          target="_blank"
        >
          View Artifact
        </a>
      </header>

      <div className="mb-5 mt-3 h-px w-16 bg-neutral-3" />

      <p className="w-full text-xl leading-normal">{content.description}</p>
    </div>
  );
}

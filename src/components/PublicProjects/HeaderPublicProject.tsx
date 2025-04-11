import Image from 'next/image';

export default function HeaderPublicProject({
  title,
  headerImage,
}: {
  title: string;
  headerImage: string;
}) {
  return (
    <header className="bg-primary-8 relative flex h-36! min-h-36 w-full flex-col justify-center gap-1 px-8 text-white">
      <h2 className="relative z-10 text-base tracking-wider uppercase">Public Project</h2>
      <h1 className="relative z-10 text-4xl font-bold">{title}</h1>

      <div className="absolute top-0 right-0 z-0 h-full w-full overflow-hidden">
        <Image
          src={headerImage}
          width={1372}
          height={148}
          priority
          alt={`Illustrative image for ${title}`}
          className="h-auto w-full object-fill"
        />
      </div>
    </header>
  );
}

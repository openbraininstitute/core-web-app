import Image from 'next/image';
import Link from 'next/link';

type LinkButtonProps = {
  title: string;
  description: string;
  link: string;
  bgUrl: string;
};

const linkButtons: LinkButtonProps[] = [
  {
    title: 'Discover OBI',
    description: 'Explore our virtual labs and see how they work',
    link: '/',
    bgUrl: '/sfn/background_image_buttons-01.jpg',
  },

  {
    title: 'Your virtual lab',
    description:
      'Create your Virtual Lab on the Open Brain Platform and join a global network accelerating open neuroscience.',
    link: '/app/virtual-lab',
    bgUrl: '/sfn/background_image_buttons-02.jpg',
  },
];

function LinkButton({ title, description, link, bgUrl }: LinkButtonProps) {
  return (
    <Link href={link} className="relative flex h-[80vh] w-1/2 flex-row gap-x-4">
      <div className="text-primary-9 relative z-10 bg-white p-12">
        <div className="font-serif text-6xl!">{title}</div>
        <p className="font-title text-xl!">{description}</p>
      </div>
      <Image
        src={bgUrl}
        alt={title}
        width={1000}
        height={1000}
        className="absolute inset-0 object-cover"
      />
    </Link>
  );
}

export default function SFNDoubleButton() {
  return (
    <div className="flex flex-row gap-x-4">
      {linkButtons.map((button) => (
        <LinkButton
          key={button.title}
          title={button.title}
          description={button.description}
          link={button.link}
          bgUrl={button.bgUrl}
        />
      ))}
    </div>
  );
}

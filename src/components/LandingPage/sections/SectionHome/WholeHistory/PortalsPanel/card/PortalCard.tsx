
import Image from "next/image";
import Link from "next/link";

export type PortalCardProps = {
    title: string;
    content: string;
    image: string;
    href: string;
}

export default function PortalCard({
    title, 
    content,
    image,
    href,
}:PortalCardProps) {
    return (
        <Link key={title} href={href} className="flex flex-row flex-nowrap w-full border-y border-l border-neutral-2 border-solid">
                <div className="w-3/4 p-4 flex flex-col">
                  <div className="text-base uppercase tracking-wider">Portal</div>
                  <h2 className="font-serif text-3xl font-normal leading-tight mb-12">{title}</h2>
                  <div>{content}</div>
                </div>
                <div className="w-1/4 h-full overflow-hidden">
                    <Image src={image} alt={title} width="800" height="800" className="w-full h-full object-cover" />
                </div>
            </Link>
    )
}
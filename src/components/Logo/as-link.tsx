import { classNames } from "@/util/utils";
import Link from "next/link";
import Logo from "@/components/Logo/as-component";


type Props = {
    href?: string;
    color?: string;
    className?: string;
}

export default function ObpLogoLink({
    href = "/",
    color = 'text-white',
    className,
}: Props) {
    return (
        <Link
            href={href}
            className={classNames(
                'z-10 flex h-auto flex-col justify-center pr-4 outline-none',
                color,
                className
            )}
        >
            <Logo />
        </Link>
    );
}
import Link from 'next/link';

export default function Header() {
  return (
    <div className="relative z-10">
      <div className="absolute top-0 p-[19px] text-white md:p-[19px]">
        <Link href="/" className="max-w-[8em] flex-none font-serif text-[28.5px]">
          <h2 className="relative text-balance text-right leading-[0.8]">
            Open Brain <br /> Institute
          </h2>
        </Link>
      </div>
    </div>
  );
}

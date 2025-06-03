import LogoAsLink from '@/components/logo/as-link';

export default function DocumentationSideBloc() {
  return (
    <nav className="fixed left-5 top-5 w-[235px] text-white">
      <LogoAsLink />
      <div>Left Column</div>
    </nav>
  );
}

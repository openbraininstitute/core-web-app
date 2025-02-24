import PrimaryButtonHome from '@/components/home/PrimaryButtonHome';

export default function MobileMenu({ style }: { style: React.CSSProperties }) {
  return (
    <nav
      className="fixed top-0 z-[200] flex h-screen w-screen flex-col gap-y-2 bg-primary-9 px-6 py-24 transition-left duration-500 ease-out-expo"
      style={style}
    >
      <PrimaryButtonHome
        label="BlueBrain Github"
        url="https://github.com/BlueBrain"
        hasIcon
        theme="dark"
      />
      <PrimaryButtonHome label="About" url="/about" hasIcon={false} theme="dark" />
      {/* <PrimaryButtonHome label="Log in" url="/app/log-in" hasIcon={false} theme="light" /> */}
    </nav>
  );
}

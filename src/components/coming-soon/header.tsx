import LogoAsLink from '@/components/logo/as-link';
import { classNames } from '@/util/utils';

// const links = [
//   { to: '/about', text: 'About' },
//   { to: '/mission', text: 'Mission' },
//   { to: '/news', text: 'News' },
//   { to: '/pricing', text: 'Pricing' },
//   { to: '/team', text: 'Team' },
//   { to: '/repositories', text: 'Repositories' },
//   { to: '/contact', text: 'Contact' },
// ];

// const linkClasses = classNames(
//   'text-2xl md:text-lg lg:text-xl hover:text-primary-5 relative transition-colors',
//   'py-2 md:py-0 font-bold md:font-semibold w-max',
//   'after:absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-white',
//   'after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300'
// );

export default function Header() {
  return (
    <header className={classNames('absolute top-0 z-50 w-full px-6 py-8 md:px-12')}>
      <nav className="mx-auto flex items-center justify-between gap-10">
        <div className="md flex w-full items-center justify-between">
          <LogoAsLink type="svg" />
          {/* <Button
            type="text"
            htmlType="button"
            className=" h-14 font-bold text-white hover:!text-primary-5 md:hidden"
            aria-label="open-menu"
            onClick={onOpenMenu}
          >
            <span className="ml-2 text-lg">Menu</span>
            <MenuOutlined className="!text-3xl" />
          </Button> */}
        </div>
        {/* <div
          className={classNames(
            openMenu ? 'flex' : 'hidden md:flex',
            'absolute left-0 top-0 z-50 h-svh w-svw md:relative md:z-0 md:h-max ',
            'flex flex-col items-center justify-center md:w-full md:flex-row md:items-end md:justify-end',
            'bg-white md:bg-transparent',
            'px-8 py-4 md:p-0'
          )}
        >
          <div
            className={classNames(
              'relative h-[calc(100%-2rem)] w-full',
              'border border-gray-300 md:border-0',
              'flex flex-col md:flex-row md:items-end md:justify-end md:gap-7',
              'bg-white text-primary-8 md:bg-transparent  md:text-white',
              'm-8 p-8 md:m-0 md:h-max md:p-0'
            )}
          >
            <Button
              type="text"
              size="large"
              htmlType="button"
              className="absolute right-3 top-3 md:hidden"
              icon={<CloseOutlined />}
              onClick={onCloseMenu}
              aria-label="close-menu"
            />
            {links.map((link) => (
              <Link key={link.to} href={link.to} className={linkClasses}>
                {link.text}
              </Link>
            ))}
          </div>
        </div> */}
      </nav>
    </header>
  );
}

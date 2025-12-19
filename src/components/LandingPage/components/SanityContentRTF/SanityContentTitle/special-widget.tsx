import { styleBlockSmall } from '@/components/LandingPage/styles';
import { TemporaryGoToLabButton } from '../../TemporaryGoToLabButton';

const RX_CODE = /^[ \t]*\{\{([a-zA-Z0-9-]+)\}/g;

export function makeSpecialWidget(rawCode: string) {
  const code = rawCode.trim();
  RX_CODE.lastIndex = -1;
  const m = RX_CODE.exec(code);
  if (!m) return null;

  const [all, name] = m;
  const rest = code.slice(all.length, -1).trim().slice(1, -1);
  const args = rest.split(/\s*\}\s*\{\s*/);
  switch (name) {
    case 'button': {
      const [href, title, subTitle] = args;
      return (
        <TemporaryGoToLabButton
          title={title}
          subTitle={subTitle ?? 'Start exploring, discover public projects, and more'}
          href={href}
        />
      );
    }
    default:
      return (
        <div className={styleBlockSmall}>
          <pre>
            {JSON.stringify(
              {
                name,
                args,
              },
              null,
              '  ',
            )}
          </pre>
        </div>
      );
  }
}

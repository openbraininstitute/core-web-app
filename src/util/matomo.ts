interface HTMLTrustedScriptElement extends Omit<HTMLScriptElement, 'src'> {
  src: TrustedScriptURL | string;
}

interface InitSettings {
  url: string;
  cdnUrl: string;
  siteId: string;
  jsTrackerFile?: string;
  phpTrackerFile?: string;
  disableCookies?: boolean;
  onScriptInitError?: () => void;
  nonce?: string;
  trustedPolicyName?: string;
}

// to push custom events
export function push(args: (number[] | string[] | number | string | null | undefined)[]): void {
  if (!window._paq) {
    window._paq = [];
  }
  window._paq.push(args);
}

const trustedPolicyHooks: TrustedTypePolicyOptions = {
  createScript: (script) => script,
  createScriptURL: (script) => script,
};

// initialize the tracker
export function init({
  url,
  cdnUrl,
  siteId,
  jsTrackerFile = 'matomo.js',
  phpTrackerFile = 'matomo.php',
  disableCookies = false,
  onScriptInitError = undefined,
  nonce,
  trustedPolicyName = 'matomo-next',
}: InitSettings): void {
  window._paq = window._paq !== null ? window._paq : [];
  if (!url) {
    // eslint-disable-next-line no-console
    console.warn('Matomo disabled, please provide matomo url');
    return;
  }

  const sanitizer =
    window.trustedTypes?.createPolicy(trustedPolicyName, trustedPolicyHooks) ?? trustedPolicyHooks;

  push(['trackPageView']);

  if (disableCookies) {
    push(['disableCookies']);
  }

  push(['enableLinkTracking']);
  push(['enableHeartBeatTimer']);
  push(['rememberCookieConsentGiven']);
  push(['setTrackerUrl', `${url}/${phpTrackerFile}`]);
  push(['setSiteId', siteId]);

  /**
   * for initial loading we use the location.pathname
   * as the first url visited.
   * Once user navigate across the site,
   * we rely on next/navigation usePathname hook
   */

  const scriptElement: HTMLTrustedScriptElement = document.createElement('script');
  const refElement = document.getElementsByTagName('script')[0];
  if (nonce) {
    scriptElement.setAttribute('nonce', nonce);
  }
  scriptElement.type = 'text/javascript';
  scriptElement.async = true;
  scriptElement.defer = true;
  const fullUrl = `${cdnUrl}/${jsTrackerFile}`;
  scriptElement.src = sanitizer.createScriptURL?.(`${cdnUrl}/${jsTrackerFile}`) ?? fullUrl;
  if (onScriptInitError) {
    scriptElement.onerror = () => {
      onScriptInitError();
    };
  }
  if (refElement.parentNode) {
    refElement.parentNode.insertBefore(scriptElement, refElement);
  }
}

export default init;

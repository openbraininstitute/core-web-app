import { isBrowser } from '@/utils/environment';

export function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/(Chrome|CriOS|Android)/i.test(ua);
}

export function browserPush(state: any, url: string) {
  if (isBrowser()) window.history.pushState(state, '', url);
}

export function browserReplace(state: any, url: string) {
  if (isBrowser()) window.history.replaceState(state, '', url);
}

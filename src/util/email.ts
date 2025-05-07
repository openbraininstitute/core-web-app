const RX_EMAIL = /^[^@]+@[^@]+\.[^@.]+$/gi;

/**
 * This function is not accurate but at least it does not reject valid addresses,
 * and if it returns `false` you can be sure the address is invalid.
 *
 * But it can return `true` for invalid addresses. In the end, only the mail server
 * can tell.
 *
 * So this function is just an help for the user to avoid common mistakes.
 */
export function isValidEMail(email: string): boolean {
  RX_EMAIL.lastIndex = -1;
  return RX_EMAIL.test(email);
}

const FORBIDDEN_COUNTRIES: Record<string, string> = {
  af: 'Afghanistan',
  by: 'Belarus',
  cu: 'Cuba',
  ir: 'Iran',
  mm: 'Myanmar',
  kp: 'North Korea',
  ru: 'Russia',
  sy: 'Syria',
  ua: 'Ukraine',
  ve: 'Venezuela',
};

/**
 * Some countries are not allowed by the insurance.
 * This function checks the last part of an email to
 * know if it's from a forbidden country.
 * @returns The name of the country if it's a forbidden one, or `false` otherwise.
 */
export function isEMailFromForbiddenCountry(email: string): false | string {
  const countryCode = extractCountryCode(email) ?? '';
  const forbiddenCountry: string | undefined = FORBIDDEN_COUNTRIES[countryCode];
  return typeof forbiddenCountry === 'string' ? forbiddenCountry : false;
}

function extractCountryCode(email: string) {
  return email.trim().split('.').pop();
}

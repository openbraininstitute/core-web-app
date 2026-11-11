export function slugifyForUrl(text: string): string {
  return text
    .replace(/\s+/g, '-') // Replace one or more spaces with a single hyphen
    .replace(/\+/g, '~'); // Replace + with tilde
}

export function unslugify(slug: string): string {
  return slug
    .replace(/-/g, ' ') // Replace hyphen with a single space
    .replace(/~/g, '+'); // Replace tilde with +
}

export default function Slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '');
}

export function extractInitials(input?: string | null): string {
  if (!input) return '';
  const inputSanitized = input.replace(/[^a-zA-Z\s._-]/g, '');
  const parts = inputSanitized.split(/[\s._-]+/).filter(Boolean);

  const initials = parts
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2);

  return initials || 'N/A';
}

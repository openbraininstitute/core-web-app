import { describe, expect, it } from 'vitest';

import { hasSubSupMarkup, sanitizeSubSupHtml, stripHtmlTags } from '@/utils/safe-html-markup';

describe('safe-html-markup', () => {
  it('strips IUPHAR sub/sup tags to the plain channel name', () => {
    expect(stripHtmlTags('K<SUB>v</SUB>10.1')).toBe('Kv10.1');
    expect(stripHtmlTags('K<sub>Ca</sub>1.1')).toBe('KCa1.1');
    expect(stripHtmlTags('Homo sapiens')).toBe('Homo sapiens');
  });

  it('keeps only sub/sup and escapes other tags', () => {
    expect(sanitizeSubSupHtml('K<SUB>v</SUB>10.1')).toBe('K<sub>v</sub>10.1');
    expect(sanitizeSubSupHtml('K<sub>Ca</sub>1.1')).toBe('K<sub>Ca</sub>1.1');
    expect(sanitizeSubSupHtml('a<script>alert(1)</script>b')).toBe(
      'a&lt;script&gt;alert(1)&lt;/script&gt;b'
    );
    expect(sanitizeSubSupHtml('x<img src=x onerror=alert(1)>y')).toBe(
      'x&lt;img src=x onerror=alert(1)&gt;y'
    );
  });

  it('detects sub/sup markup', () => {
    expect(hasSubSupMarkup('K<SUB>v</SUB>10.1')).toBe(true);
    expect(hasSubSupMarkup('Kv10.1')).toBe(false);
  });
});

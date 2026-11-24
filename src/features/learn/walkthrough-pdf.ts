import { type IWalkthrough, WALKTHROUGH_SHOT } from '@/features/learn/walkthroughs';

/** A4 on its side, pt. */
const PAGE = { w: 842, h: 595 };
const MARGIN = 40;
const IMAGE = {
  w: PAGE.w - 2 * MARGIN,
  h: ((PAGE.w - 2 * MARGIN) * WALKTHROUGH_SHOT.h) / WALKTHROUGH_SHOT.w,
  y: 26,
};
const SCALE = IMAGE.w / WALKTHROUGH_SHOT.w;
const GREEN = '0.22 0.62 0.05';
const NAVY = '0 0.153 0.4';
const GREY = '0.45 0.45 0.45';
/** How far a circle's Bezier handles reach, of its radius. */
const ROUND = 0.5523;

const n = (value: number) => value.toFixed(2);

/** Text for a PDF string in WinAnsi: what it has no letter for left as a question mark. */
function pdfText(value: string): string {
  return [...value]
    .map((ch) => (ch.charCodeAt(0) > 255 ? '?' : ch))
    .join('')
    .replace(/[\\()]/g, (ch) => `\\${ch}`);
}

const text = (
  value: string,
  x: number,
  y: number,
  size: number,
  font: 'F1' | 'F2',
  colour: string
) => `BT /${font} ${size} Tf ${colour} rg ${n(x)} ${n(y)} Td (${pdfText(value)}) Tj ET`;

function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const k = r * ROUND;
  return [
    `${n(x + r)} ${n(y)} m`,
    `${n(x + w - r)} ${n(y)} l`,
    `${n(x + w - r + k)} ${n(y)} ${n(x + w)} ${n(y + r - k)} ${n(x + w)} ${n(y + r)} c`,
    `${n(x + w)} ${n(y + h - r)} l`,
    `${n(x + w)} ${n(y + h - r + k)} ${n(x + w - r + k)} ${n(y + h)} ${n(x + w - r)} ${n(y + h)} c`,
    `${n(x + r)} ${n(y + h)} l`,
    `${n(x + r - k)} ${n(y + h)} ${n(x)} ${n(y + h - r + k)} ${n(x)} ${n(y + h - r)} c`,
    `${n(x)} ${n(y + r)} l`,
    `${n(x)} ${n(y + r - k)} ${n(x + r - k)} ${n(y)} ${n(x + r)} ${n(y)} c h`,
  ].join(' ');
}

/** A page for every screenshot of every step, in order, with the clicks on it. */
export function walkthroughPages(walkthrough: IWalkthrough) {
  return walkthrough.steps.flatMap((step, s) => {
    const numbered = step.clicks.map((click, c) => ({
      ...click,
      image: click.image ?? step.image,
      number: c + 1,
    }));
    return [...new Set(numbered.map((click) => click.image))].map((image) => ({
      step: s,
      title: step.title,
      image,
      clicks: numbered.filter((click) => click.image === image),
    }));
  });
}

type TPage = ReturnType<typeof walkthroughPages>[number];

function pageContent(walkthrough: IWalkthrough, page: TPage, at: number, of: number): string {
  const top = IMAGE.y + IMAGE.h;
  const marks = page.clicks.map(({ box, radius, number }) => {
    const w = box.w * SCALE;
    const h = box.h * SCALE;
    const x = MARGIN + box.x * SCALE;
    const y = top - box.y * SCALE - h;
    const r = Math.min(w / 2, h / 2, radius === undefined ? Infinity : radius * SCALE);
    const badge = 8;
    const bx = Math.max(x, MARGIN + badge);
    const by = Math.min(y + h, top - badge);
    return [
      `q ${GREEN} RG 2 w ${roundedRect(x, y, w, h, r)} S Q`,
      `q ${GREEN} rg ${roundedRect(bx - badge, by - badge, 2 * badge, 2 * badge, badge)} f Q`,
      text(String(number), bx - 2.8, by - 3.5, 10, 'F2', '1 1 1'),
    ].join('\n');
  });
  return [
    text(walkthrough.title, MARGIN, PAGE.h - 42, 11, 'F1', GREY),
    text(`${at} / ${of}`, PAGE.w - MARGIN - 34, PAGE.h - 42, 11, 'F1', GREY),
    text(`Step ${page.step + 1}. ${page.title}`, MARGIN, PAGE.h - 68, 20, 'F2', NAVY),
    ...page.clicks.map((click, i) =>
      text(
        `${click.number}. ${click.text}`,
        MARGIN,
        PAGE.h - 88 - i * 15,
        11.5,
        'F1',
        '0.15 0.15 0.15'
      )
    ),
    `q ${n(IMAGE.w)} 0 0 ${n(IMAGE.h)} ${MARGIN} ${IMAGE.y} cm /Im Do Q`,
    `q 0.85 0.85 0.85 RG 0.75 w ${roundedRect(MARGIN, IMAGE.y, IMAGE.w, IMAGE.h, 0)} S Q`,
    ...marks,
  ].join('\n');
}

const latin1 = (value: string) => Uint8Array.from(value, (ch) => ch.charCodeAt(0) & 0xff);

/** The walkthrough as a PDF; `jpegs` holds the bytes of each of its screenshots. */
export function walkthroughPdf(
  walkthrough: IWalkthrough,
  jpegs: ReadonlyMap<string, Uint8Array>
): Uint8Array<ArrayBuffer> {
  const pages = walkthroughPages(walkthrough);
  const images = [...new Set(pages.map((page) => page.image))];
  // objects: 1 catalog, 2 page tree, 3 and 4 fonts, then the images, then a page and its content each
  const imageId = (image: string) => 5 + images.indexOf(image);
  const pageId = (i: number) => 5 + images.length + 2 * i;

  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (bytes: Uint8Array) => {
    parts.push(bytes);
    length += bytes.length;
  };
  const object = (id: number, ...body: (string | Uint8Array)[]) => {
    offsets[id] = length;
    push(latin1(`${id} 0 obj\n`));
    for (const part of body) push(typeof part === 'string' ? latin1(part) : part);
    push(latin1('\nendobj\n'));
  };
  const font = (name: string) =>
    `<< /Type /Font /Subtype /Type1 /BaseFont /${name} /Encoding /WinAnsiEncoding >>`;

  push(latin1('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'));
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(
    2,
    `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${pageId(i)} 0 R`).join(' ')}] >>`
  );
  object(3, font('Helvetica'));
  object(4, font('Helvetica-Bold'));
  for (const image of images) {
    const bytes = jpegs.get(image);
    if (!bytes) throw new Error(`No screenshot for ${image}`);
    object(
      imageId(image),
      `<< /Type /XObject /Subtype /Image /Width ${WALKTHROUGH_SHOT.w} /Height ${WALKTHROUGH_SHOT.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`,
      bytes,
      '\nendstream'
    );
  }
  pages.forEach((page, i) => {
    const content = latin1(pageContent(walkthrough, page, i + 1, pages.length));
    object(
      pageId(i),
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.w} ${PAGE.h}] /Contents ${pageId(i) + 1} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Im ${imageId(page.image)} 0 R >> >> >>`
    );
    object(pageId(i) + 1, `<< /Length ${content.length} >>\nstream\n`, content, '\nendstream');
  });

  const xref = length;
  const size = offsets.length;
  const rows = Array.from(
    { length: size - 1 },
    (_, i) => `${String(offsets[i + 1]).padStart(10, '0')} 00000 n \n`
  );
  push(latin1(`xref\n0 ${size}\n0000000000 65535 f \n${rows.join('')}`));
  push(latin1(`trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));

  const pdf = new Uint8Array(length);
  let at = 0;
  for (const part of parts) {
    pdf.set(part, at);
    at += part.length;
  }
  return pdf;
}

/** Makes the walkthrough's PDF in the browser and saves it. */
export async function downloadWalkthroughPdf(walkthrough: IWalkthrough) {
  const images = [...new Set(walkthroughPages(walkthrough).map((page) => page.image))];
  const jpegs = new Map(
    await Promise.all(
      images.map(async (image) => {
        const response = await fetch(image);
        if (!response.ok) throw new Error(`Could not load ${image}`);
        return [image, new Uint8Array(await response.arrayBuffer())] as const;
      })
    )
  );
  const url = URL.createObjectURL(
    new Blob([walkthroughPdf(walkthrough, jpegs)], { type: 'application/pdf' })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `${walkthrough.id}.pdf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

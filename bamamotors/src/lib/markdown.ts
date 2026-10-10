import { Marked, type Tokens } from 'marked';
import { escapeHtml } from './security';
import { slugify } from './slug';

export interface TocItem { id: string; text: string; }

/**
 * Renders trusted-author markdown. Raw HTML in the source is escaped (never executed),
 * H1s are demoted to H2 so each page keeps a single <h1>, headings get anchor ids,
 * and external links open safely.
 */
export function renderMarkdown(src: string, siteHost = 'bamamotors.com'): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const used = new Set<string>();
  const marked = new Marked({ gfm: true, breaks: false });
  marked.use({
    renderer: {
      html(token: Tokens.HTML | Tokens.Tag) {
        return escapeHtml(token.text);
      },
      heading(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token: Tokens.Heading) {
        const depth = Math.min(4, Math.max(2, token.depth));
        const text = this.parser.parseInline(token.tokens);
        let id = slugify(token.text) || 'section';
        while (used.has(id)) id = `${id}-x`;
        used.add(id);
        if (depth === 2) toc.push({ id, text: token.text.replace(/[*_`]/g, '') });
        return `<h${depth} id="${id}">${text}</h${depth}>\n`;
      },
      link(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token: Tokens.Link) {
        const href = token.href || '';
        const text = this.parser.parseInline(token.tokens);
        if (!/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(href)) return text;
        const external = /^https?:\/\//i.test(href) && !href.includes(siteHost);
        const title = token.title ? ` title="${escapeHtml(token.title)}"` : '';
        return `<a href="${escapeHtml(href)}"${title}${external ? ' rel="noopener" target="_blank"' : ''}>${text}</a>`;
      },
      image(token: Tokens.Image) {
        if (!/^(https:\/\/|\/)/i.test(token.href)) return '';
        return `<img src="${escapeHtml(token.href)}" alt="${escapeHtml(token.text)}" loading="lazy" decoding="async">`;
      },
      table(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token: Tokens.Table) {
        const head = token.header.map((c) => `<th scope="col">${this.parser.parseInline(c.tokens)}</th>`).join('');
        const rows = token.rows
          .map((r) => `<tr>${r.map((c) => `<td>${this.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`)
          .join('');
        return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
      },
    },
  });
  const html = marked.parse(src, { async: false }) as string;
  return { html, toc };
}

export function readingMinutes(src: string): number {
  return Math.max(1, Math.round(src.split(/\s+/).length / 225));
}

export interface Faq { q: string; a: string; }

export function parseFaq(json: string | null | undefined): Faq[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((x) => x && typeof x.q === 'string' && typeof x.a === 'string') : [];
  } catch {
    return [];
  }
}

/** "Q: …\nA: …" text format used in admin forms ⇄ JSON. */
export function faqFromText(text: string): Faq[] {
  const out: Faq[] = [];
  let cur: Faq | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^q:/i.test(line)) {
      if (cur && cur.q && cur.a) out.push(cur);
      cur = { q: line.slice(2).trim(), a: '' };
    } else if (/^a:/i.test(line) && cur) {
      cur.a = line.slice(2).trim();
    } else if (line && cur && cur.a) {
      cur.a += ` ${line}`;
    }
  }
  if (cur && cur.q && cur.a) out.push(cur);
  return out.slice(0, 30);
}

export const faqToText = (faq: Faq[]): string => faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n\n');

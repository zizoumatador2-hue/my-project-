/** Shared browser helpers for the calculators (formatting, parsing, binding, shareable URLs). */

export const usd = (n: number, cents = false) =>
  Number.isFinite(n)
    ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })
    : '—';
export const pct = (n: number, digits = 1) => (Number.isFinite(n) ? `${n.toFixed(digits)}%` : '—');
export const months = (m: number) => {
  if (!Number.isFinite(m)) return 'Never';
  const y = Math.floor(m / 12);
  const r = m % 12;
  const parts = [];
  if (y) parts.push(`${y} yr${y === 1 ? '' : 's'}`);
  if (r || !y) parts.push(`${r} mo`);
  return parts.join(' ');
};

export function parseNum(raw: string): number {
  const cleaned = raw.replace(/[$,%\s]/g, '');
  if (cleaned === '') return NaN;
  return Number(cleaned);
}

export type Values = Record<string, number>;

/**
 * Wire a calculator form: reads every text input, validates ranges,
 * recalculates on input, restores/saves values in the URL query string.
 */
export function bindCalculator(form: HTMLFormElement, name: string, render: (v: Values) => void) {
  const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[inputmode="decimal"]'));
  const params = new URLSearchParams(location.search);
  for (const input of inputs) {
    const q = params.get(input.name);
    if (q !== null && !Number.isNaN(parseNum(q))) input.value = q;
  }
  let tracked = false;
  let frame = 0;

  const read = (): Values | null => {
    const v: Values = {};
    let ok = true;
    for (const input of inputs) {
      const n = parseNum(input.value);
      const min = input.dataset.min !== undefined && input.dataset.min !== '' ? Number(input.dataset.min) : -Infinity;
      const max = input.dataset.max !== undefined && input.dataset.max !== '' ? Number(input.dataset.max) : Infinity;
      const bad = Number.isNaN(n) || n < min || n > max;
      input.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (bad) ok = false;
      v[input.name] = n;
    }
    // radio groups / selects
    form.querySelectorAll<HTMLInputElement>('input[type="radio"]:checked').forEach((r) => (v[r.name] = Number(r.value)));
    form.querySelectorAll<HTMLSelectElement>('select').forEach((s) => (v[s.name] = Number(s.value)));
    return ok ? v : null;
  };

  const warn = (form.closest('.calc') ?? document).querySelector<HTMLElement>('[data-invalid-msg]');
  const run = (fromUser: boolean) => {
    const v = read();
    if (warn) warn.hidden = v !== null;
    if (!v) return;
    render(v);
    if (fromUser) {
      const qs = new URLSearchParams();
      for (const [k, val] of Object.entries(v)) qs.set(k, String(val));
      history.replaceState(null, '', `${location.pathname}?${qs.toString()}`);
      if (!tracked) {
        tracked = true;
        window.ffTrack?.('calculator_use', { calculator: name });
      }
    }
  };

  form.addEventListener('input', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => run(true));
  });
  form.addEventListener('change', () => run(true));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    run(true);
  });
  for (const input of inputs) {
    if (input.dataset.money === undefined) continue;
    input.addEventListener('blur', () => {
      const n = parseNum(input.value);
      if (Number.isFinite(n)) input.value = n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    });
  }
  run(false);
  return { rerun: () => run(true) };
}

export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel)!;
export const setText = (sel: string, text: string, root: ParentNode = document) => {
  const el = root.querySelector(sel);
  if (el) el.textContent = text;
};

export function bars(container: HTMLElement, rows: { label: string; value: number; max: number; cls?: string; display?: string }[]) {
  container.replaceChildren(
    ...rows.map((r) => {
      const row = document.createElement('div');
      row.className = 'bar-row';
      const lbl = document.createElement('div');
      lbl.className = 'lbl';
      const a = document.createElement('span');
      a.textContent = r.label;
      const b = document.createElement('span');
      b.textContent = r.display ?? usd(r.value);
      lbl.append(a, b);
      const track = document.createElement('div');
      track.className = 'bar-track';
      const fill = document.createElement('div');
      fill.className = `bar-fill ${r.cls ?? ''}`;
      fill.style.width = `${r.max > 0 ? Math.max(0, Math.min(100, (r.value / r.max) * 100)) : 0}%`;
      track.append(fill);
      row.append(lbl, track);
      return row;
    }),
  );
}

export function table(tbody: HTMLElement, rows: (string | number)[][]) {
  tbody.replaceChildren(
    ...rows.map((cells) => {
      const tr = document.createElement('tr');
      for (const c of cells) {
        const td = document.createElement('td');
        td.textContent = String(c);
        tr.append(td);
      }
      return tr;
    }),
  );
}

/** Save/unsave vehicles. Anonymous visitors are sent to sign in first. */
export function initSaveButtons(): void {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-save]:not([data-save-init])'));
  if (!buttons.length) return;
  const authed = document.body.dataset.auth === '1';
  buttons.forEach((b) => b.setAttribute('data-save-init', ''));
  if (authed) {
    fetch('/api/saved', { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : { ids: [] }))
      .then((d: { ids: number[] }) => {
        const set = new Set(d.ids.map(String));
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(set.has(b.dataset.save!))));
      })
      .catch(() => {});
  }
  buttons.forEach((b) =>
    b.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!authed) {
        location.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}&reason=save`;
        return;
      }
      const pressed = b.getAttribute('aria-pressed') === 'true';
      b.setAttribute('aria-pressed', String(!pressed));
      const body = new FormData();
      body.set('vehicle_id', b.dataset.save!);
      body.set('action', pressed ? 'remove' : 'add');
      const res = await fetch('/api/saved', { method: 'POST', body, headers: { Accept: 'application/json' } }).catch(() => null);
      if (!res || !res.ok) b.setAttribute('aria-pressed', String(pressed));
      else toast(pressed ? 'Removed from saved vehicles' : 'Saved — find it in My Account');
    }),
  );
}

export function toast(text: string): void {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

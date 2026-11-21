export function initLeadForms(): void {
  document.querySelectorAll<HTMLFormElement>('[data-lead-form]:not([data-init])').forEach((form) => {
    form.setAttribute('data-init', '');
    const typeInput = form.querySelector<HTMLInputElement>('input[name="type"]')!;
    const message = form.querySelector<HTMLTextAreaElement>('textarea[name="message"]');
    const dateField = form.querySelector<HTMLElement>('[data-date-field]');
    const tabs = Array.from(form.querySelectorAll<HTMLButtonElement>('[data-lead-type]'));
    const defaults = new Set(tabs.map((t) => t.dataset.defaultMsg ?? ''));

    const select = (type: string) => {
      const tab = tabs.find((t) => t.dataset.leadType === type);
      if (!tab) return;
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      typeInput.value = type;
      if (dateField) dateField.hidden = type !== 'test_drive';
      if (message && (message.value.trim() === '' || defaults.has(message.value))) message.value = tab.dataset.defaultMsg ?? '';
    };
    tabs.forEach((tab) => tab.addEventListener('click', () => select(tab.dataset.leadType!)));
    // Other CTAs on the page can pre-select a tab: <a href="#lead-form" data-open-lead="price">
    document.querySelectorAll<HTMLElement>('[data-open-lead]').forEach((el) =>
      el.addEventListener('click', () => select(el.dataset.openLead!)),
    );

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = form.querySelector<HTMLElement>('[data-lead-error]')!;
      const btn = form.querySelector<HTMLButtonElement>('[data-lead-submit]')!;
      err.hidden = true;
      if (!form.checkValidity()) {
        const bad = form.querySelector<HTMLInputElement>(':invalid');
        err.textContent = bad?.name === 'consent' ? 'Please check the consent box so the dealer can reply.' : 'Please fill in your name and a valid email.';
        err.hidden = false;
        bad?.focus();
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Sending…';
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) throw new Error(data.error || 'We could not send your request. Please try again.');
        form.hidden = true;
        const ok = form.parentElement!.querySelector<HTMLElement>('[data-lead-success]')!;
        ok.hidden = false;
        ok.focus();
        (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', 'generate_lead', { lead_type: typeInput.value });
      } catch (ex) {
        err.textContent = (ex as Error).message;
        err.hidden = false;
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send request';
      }
    });
  });
}

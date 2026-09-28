/** Dependent make → model select, "near me" geolocation, and clean GET URLs (no empty params). */
export function initSearchForms(): void {
  document.querySelectorAll<HTMLFormElement>('[data-search-form]:not([data-init])').forEach((form) => {
    form.setAttribute('data-init', '');
    const make = form.querySelector<HTMLSelectElement>('[data-make]');
    const model = form.querySelector<HTMLSelectElement>('[data-model]');
    make?.addEventListener('change', async () => {
      if (!model) return;
      model.innerHTML = '<option value="">Any model</option>';
      if (!make.value) return;
      model.disabled = true;
      try {
        const res = await fetch(`/api/models?make=${encodeURIComponent(make.value)}`);
        const data = (await res.json()) as { models: { slug: string; name: string }[] };
        for (const m of data.models) model.add(new Option(m.name, m.slug));
      } finally {
        model.disabled = false;
      }
    });

    form.querySelector('[data-near-me]')?.addEventListener('click', () => {
      const status = form.querySelector<HTMLElement>('[data-near-status]');
      const zip = form.querySelector<HTMLInputElement>('[data-zip]');
      if (!navigator.geolocation) { if (status) status.textContent = 'Location is not available in this browser.'; return; }
      if (status) status.textContent = 'Finding your location…';
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const res = await fetch(`/api/nearest-zip?lat=${pos.coords.latitude.toFixed(4)}&lng=${pos.coords.longitude.toFixed(4)}`);
          const d = (await res.json()) as { zip?: string; city?: string };
          if (d.zip && zip) {
            zip.value = d.zip;
            const city = form.querySelector<HTMLSelectElement>('select[name="city"]');
            if (city) city.value = '';
            const sort = form.querySelector<HTMLInputElement>('[data-sort-hidden]');
            if (sort) sort.value = 'distance';
            if (status) status.textContent = `Searching near ${d.city} (${d.zip})`;
            form.requestSubmit();
          } else if (status) status.textContent = 'We could not match your location to an Alabama ZIP code.';
        },
        () => { if (status) status.textContent = 'Location permission was denied. Enter a ZIP code instead.'; },
        { timeout: 10000, maximumAge: 600000 },
      );
    });

    form.addEventListener('submit', () => {
      form.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[name], select[name]').forEach((el) => {
        if (!el.value) el.disabled = true;
      });
      // Radius only matters with a ZIP or city.
      const hasPlace = (form.querySelector<HTMLInputElement>('[data-zip]')?.value || form.querySelector<HTMLSelectElement>('select[name="city"]')?.value);
      const radius = form.querySelector<HTMLSelectElement>('select[name="radius"]');
      if (radius && !hasPlace) radius.disabled = true;
      setTimeout(() => form.querySelectorAll<HTMLElement>('[disabled]').forEach((el) => el.removeAttribute('disabled')), 0);
    });
  });
}

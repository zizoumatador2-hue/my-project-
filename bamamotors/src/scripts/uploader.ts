/** Client-side resize (≈1600px + 640px WebP/JPEG) then upload each photo; reloads when done. */
async function resize(file: File, max: number): Promise<{ blob: Blob; w: number; h: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const toBlob = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
  let blob = await toBlob('image/webp', 0.82);
  if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg', 0.85); // Safari fallback
  if (!blob) throw new Error('Could not process image');
  return { blob, w, h };
}

export function initUploader(): void {
  const zone = document.querySelector<HTMLElement>('[data-dropzone]');
  if (!zone) return;
  const input = zone.querySelector<HTMLInputElement>('[data-files]')!;
  const status = zone.querySelector<HTMLElement>('[data-upload-status]')!;
  const bar = zone.querySelector<HTMLElement>('[data-upload-progress]')!;
  const action = zone.querySelector<HTMLFormElement>('[data-upload-form]')!.action;

  const run = async (files: File[]) => {
    const imgs = files.filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
    if (!imgs.length) { status.textContent = 'Please choose JPEG, PNG or WebP images.'; return; }
    bar.hidden = false;
    let done = 0;
    const errors: string[] = [];
    for (const file of imgs) {
      status.textContent = `Uploading ${done + 1} of ${imgs.length}…`;
      try {
        const large = await resize(file, 1600);
        const small = await resize(file, 640);
        const ext = large.blob.type === 'image/webp' ? 'webp' : 'jpg';
        const fd = new FormData();
        fd.set('large', large.blob, `photo.${ext}`);
        fd.set('small', small.blob, `thumb.${ext}`);
        fd.set('width', String(large.w));
        fd.set('height', String(large.h));
        const res = await fetch(action, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) throw new Error(data.error || `Upload failed (${res.status})`);
      } catch (e) {
        errors.push(`${file.name}: ${(e as Error).message}`);
      }
      done++;
      (bar.firstElementChild as HTMLElement).style.width = `${(done / imgs.length) * 100}%`;
    }
    status.textContent = errors.length ? `Uploaded ${imgs.length - errors.length} of ${imgs.length}. ${errors.join(' ')}` : 'Upload complete — refreshing…';
    if (!errors.length || errors.length < imgs.length) setTimeout(() => location.reload(), errors.length ? 2500 : 400);
  };

  input.addEventListener('change', () => run(Array.from(input.files ?? [])));
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('drag'); run(Array.from(e.dataTransfer?.files ?? [])); });
}

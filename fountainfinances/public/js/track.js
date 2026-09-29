/* Event tracking hooks. Events go nowhere unless analytics is configured AND the visitor has opted in. */
(function () {
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-track], button[data-track]');
    if (!a || typeof window.ffTrack !== 'function') return;
    window.ffTrack(a.getAttribute('data-track'), {
      link_text: (a.textContent || '').trim().slice(0, 80),
      link_url: a.href || '',
      provider: a.getAttribute('data-provider') || undefined,
      product_id: a.getAttribute('data-product') || undefined,
      placement: a.getAttribute('data-placement') || undefined,
    });
  });
})();

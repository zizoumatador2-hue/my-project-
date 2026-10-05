/* Cinematic effects: scroll reveal, card spotlight and header parallax. Disabled for reduced motion. */
(function () {
  var root = document.documentElement;
  if (!root.classList.contains('fx')) return;
  root.classList.add('fx-ready');

  // Scroll reveal: hero items are tagged in markup; content below the fold is tagged here, so nothing visible flickers.
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  var fold = window.innerHeight;
  var auto = '.section-head, .grid > *, .stat, .prose > h2, .prose > figure, .prose > .table-scroll, .faq details, .cta-band, .hub-block, .product, .calc-card';
  document.querySelectorAll(auto).forEach(function (el) {
    if (!el.hasAttribute('data-reveal') && el.getBoundingClientRect().top > fold) el.setAttribute('data-reveal', '');
  });
  var groups = new Map();
  document.querySelectorAll('[data-reveal]').forEach(function (el) {
    var p = el.parentElement;
    var i = groups.get(p) || 0;
    groups.set(p, i + 1);
    if (i) el.style.setProperty('--d', Math.min(i, 6) * 0.08 + 's');
    io.observe(el);
  });

  // Spotlight that follows the pointer on cards
  if (matchMedia('(hover: hover)').matches) {
    document.addEventListener('pointermove', function (e) {
      var c = e.target.closest && e.target.closest('.card');
      if (!c) return;
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', e.clientX - r.left + 'px');
      c.style.setProperty('--my', e.clientY - r.top + 'px');
    }, { passive: true });
  }

  // Parallax on photo headers
  var layers = [].slice.call(document.querySelectorAll('[data-parallax]'));
  if (layers.length) {
    var ticking = false;
    var update = function () {
      ticking = false;
      layers.forEach(function (el) {
        var r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        el.style.transform = 'translate3d(0,' + (-r.top * 0.25).toFixed(1) + 'px,0)';
      });
    };
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }
})();

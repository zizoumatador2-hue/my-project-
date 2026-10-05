/* Cinematic effects: scroll reveal, progress bar, card spotlight and tilt, hero glow and header parallax.
   With reduced motion, reveals become plain fades (CSS) and movement effects are skipped. */
(function () {
  var root = document.documentElement;
  if (!root.classList.contains('fx')) return;
  root.classList.add('fx-ready');
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Reading progress bar and header shadow
  var bar = document.createElement('div');
  bar.className = 'progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  var header = document.querySelector('.site-header');
  var onScroll = function () {
    var max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
    if (header) header.classList.toggle('scrolled', scrollY > 8);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

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

  // Spotlight that follows the pointer on cards, with a slight 3D tilt
  if (hover) {
    var tilted = null;
    document.addEventListener('pointermove', function (e) {
      var c = e.target.closest && e.target.closest('.card');
      if (tilted && tilted !== c) { tilted.style.transform = ''; tilted.classList.remove('tilt'); tilted = null; }
      if (!c) return;
      var r = c.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      c.style.setProperty('--mx', x + 'px');
      c.style.setProperty('--my', y + 'px');
      if (!still) {
        c.classList.add('tilt');
        c.style.transform = 'perspective(800px) rotateX(' + ((0.5 - y / r.height) * 6).toFixed(2) + 'deg) rotateY(' + ((x / r.width - 0.5) * 6).toFixed(2) + 'deg) translateY(-4px)';
        tilted = c;
      }
    }, { passive: true });
  }

  // Soft light that follows the pointer across the hero
  var glow = document.querySelector('[data-glow]');
  if (glow && hover) {
    glow.addEventListener('pointermove', function (e) {
      var r = glow.getBoundingClientRect();
      glow.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      glow.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    }, { passive: true });
  }

  // Parallax on photo headers
  var layers = still ? [] : [].slice.call(document.querySelectorAll('[data-parallax]'));
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

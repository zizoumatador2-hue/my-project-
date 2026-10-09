/* MarketTriggers — lightweight interaction effects (vanilla JS, no dependencies).
   Respects prefers-reduced-motion. Loaded with `defer`. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Reading progress bar */
  var bar = document.querySelector('.progress-bar');
  if (bar) {
    var ticking = false;
    var update = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
      bar.style.transform = 'scaleX(' + pct / 100 + ')';
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* Back to top button */
  var top = document.querySelector('.to-top');
  if (top) {
    window.addEventListener('scroll', function () {
      top.classList.toggle('is-visible', window.scrollY > 900);
    }, { passive: true });
    top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  if (reduce) {
    document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('is-revealed'); });
    return;
  }

  /* Scroll reveal (fade + rise) */
  var revealEls = document.querySelectorAll('[data-reveal], .pillar-body h2, .pillar-body table, .pillar-body .callout');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealEls.forEach(function (el) { el.classList.add('reveal'); io.observe(el); });
  }

  /* Spotlight cards: radial glow follows the cursor */
  document.querySelectorAll('.card, .spotlight').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* Click spark on buttons and links in the hero */
  document.querySelectorAll('[data-spark]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      for (var i = 0; i < 8; i++) {
        var s = document.createElement('span');
        s.className = 'spark';
        s.style.left = e.clientX + 'px';
        s.style.top = e.clientY + 'px';
        s.style.setProperty('--a', (i * 45) + 'deg');
        document.body.appendChild(s);
        setTimeout(function (n) { return function () { n.remove(); }; }(s), 600);
      }
    });
  });
})();

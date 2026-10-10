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

  /* Let readers select text inside linked cards: a click that ends a text
     selection does not follow the link (a normal click still does). */
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a.card');
    if (!link) return;
    var sel = window.getSelection && window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim() && link.contains(sel.anchorNode)) {
      e.preventDefault();
    }
  });

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

  /* Cookie choice: shown once; "Accept all" upgrades Consent Mode, "Essential only" keeps ads non-personalized */
  var bar2 = document.getElementById('cookie-bar');
  var choice = null;
  try { choice = localStorage.getItem('mt:consent'); } catch (e) {}
  if (bar2 && !choice) {
    bar2.hidden = false;
    bar2.querySelectorAll('[data-consent]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-consent');
        try { localStorage.setItem('mt:consent', v); } catch (e) {}
        if (v === 'accept' && window.gtag) {
          window.gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' });
        }
        bar2.hidden = true;
      });
    });
  }

  /* Table of contents: highlight the section being read */
  var tocLinks = document.querySelectorAll('.article-toc a');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[decodeURIComponent(a.hash.slice(1))] = a; });
    var current = null;
    var tio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          if (current) current.classList.remove('is-current');
          current = map[en.target.id]; current.classList.add('is-current');
        }
      });
    }, { rootMargin: '0px 0px -70% 0px' });
    Object.keys(map).forEach(function (id) { var h = document.getElementById(id); if (h) tio.observe(h); });
    var firstH = document.getElementById(Object.keys(map)[0]);
    window.addEventListener('scroll', function () {
      if (current && firstH && firstH.getBoundingClientRect().top > window.innerHeight * 0.3) { current.classList.remove('is-current'); current = null; }
    }, { passive: true });
  }

  if (reduce) {
    document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('is-revealed'); });
    return;
  }

  /* Headline reveal: split the title into words (text stays one accessible string) */
  document.querySelectorAll('[data-split]').forEach(function (h) {
    var text = h.textContent.trim();
    h.setAttribute('aria-label', text);
    h.innerHTML = text.split(/\s+/).map(function (w, i) {
      var span = document.createElement('span');
      span.className = 'w'; span.setAttribute('aria-hidden', 'true');
      span.style.setProperty('--i', i); span.textContent = w;
      return span.outerHTML;
    }).join(' ');
  });

  /* Magnetic buttons: drift a few pixels toward the cursor (desktop pointers only) */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.btn').forEach(function (b) {
      b.classList.add('is-magnetic');
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        b.style.transform = 'translate(' + (dx * 0.18) + 'px,' + (dy * 0.28) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  /* Scroll-velocity ticker: drifts slowly, speeds up with scroll speed and direction */
  var track = document.querySelector('.ticker__track');
  if (track) {
    var x = 0, last = window.scrollY, boost = 0, half = 0;
    var measure = function () { var g = track.querySelector('.ticker__group'); half = g ? g.offsetWidth : 0; };
    measure(); window.addEventListener('resize', measure);
    var visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(track);
    }
    var step = function () {
      var y = window.scrollY, dy = y - last; last = y;
      boost = boost * 0.9 + dy * 0.35;
      if (visible && half) {
        x -= 0.45 + boost;
        if (x <= -half) x += half;
        if (x > 0) x -= half;
        track.style.transform = 'translate3d(' + x + 'px,0,0)';
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* Tilted photos on hover (desktop pointers only) */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.photo img').forEach(function (img) {
      img.addEventListener('pointermove', function (e) {
        var r = img.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        img.style.transform = 'perspective(900px) rotateX(' + (-py * 5) + 'deg) rotateY(' + (px * 6) + 'deg) scale(1.015)';
        img.style.boxShadow = '0 18px 40px rgba(15,23,42,.18)';
      });
      img.addEventListener('pointerleave', function () { img.style.transform = ''; img.style.boxShadow = ''; });
    });
  }

  /* Scroll reveal (fade + rise) */
  var revealEls = document.querySelectorAll('[data-reveal], .pillar-body h2, .pillar-body table, .pillar-body .callout, .article-body table, .article-body .callout, .related .card');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
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

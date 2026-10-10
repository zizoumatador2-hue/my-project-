(function () {
  var KEY = 'ff-consent';
  var banner = document.getElementById('consent');
  if (!banner || !window.__ffGA) return;
  var loaded = false;
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function load() {
    if (loaded) return;
    loaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(window.__ffGA);
    document.head.appendChild(s);
  }
  function apply(v) {
    var granted = v === 'granted';
    window.gtag('consent', 'update', { analytics_storage: granted ? 'granted' : 'denied' });
    if (granted) load();
  }
  var gpc = navigator.globalPrivacyControl === true;
  var current = gpc ? 'denied' : get();
  if (current === 'granted' || current === 'denied') apply(current);
  else banner.hidden = false;
  banner.addEventListener('click', function (e) {
    var b = e.target.closest('[data-consent]');
    if (!b) return;
    var v = b.getAttribute('data-consent');
    set(v);
    apply(v);
    banner.hidden = true;
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-consent-open]')) { banner.hidden = false; banner.querySelector('button').focus(); }
  });
})();

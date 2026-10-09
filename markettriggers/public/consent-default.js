/* Google Consent Mode v2 defaults. Loaded in <head> before the AdSense tag so ads start
   non-personalized; a returning visitor who chose "Accept all" (stored as mt:consent) is upgraded at once. */
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 });
try {
  if (localStorage.getItem('mt:consent') === 'accept') {
    window.gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' });
  }
} catch (e) { /* storage unavailable: keep the denied defaults */ }

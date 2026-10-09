(() => {
  const codes = ['bs', 'sr', 'hr', 'en', 'de', 'fr', 'it', 'es'];
  const cookieName = 'gymleader-language';
  const localKey = 'gymleader-site-language';
  const valid = code => codes.includes(code) ? code : '';
  const sharedDomain = location.protocol === 'https:' && /(^|\.)gymleader\.app$/.test(location.hostname);
  function readCookie() {
    if (!sharedDomain) return '';
    try {
      return valid(document.cookie.split(';').map(part => part.trim())
        .find(part => part.startsWith(cookieName + '='))?.slice(cookieName.length + 1));
    } catch { return ''; }
  }
  function readLocal() {
    try { return valid(localStorage.getItem(localKey)); } catch { return ''; }
  }
  function remember(code) {
    if (!valid(code)) return;
    try { localStorage.setItem(localKey, code); } catch { /* Preference storage is optional. */ }
    if (sharedDomain) {
      try { document.cookie = `${cookieName}=${code}; Domain=gymleader.app; Path=/; Max-Age=31536000; SameSite=Lax; Secure`; } catch { /* Keep the page usable. */ }
    }
  }
  function preferred() {
    const saved = readCookie() || readLocal();
    if (saved) return saved;
    for (const language of navigator.languages || [navigator.language]) {
      const code = valid(String(language || '').toLowerCase().replace(/_/g, '-').split('-')[0]);
      if (code) return code;
    }
    return 'bs';
  }
  // Explicit language URLs always retain their language, even with a cookie.
  if (document.documentElement.dataset.autoLanguage === 'true') {
    const kind = document.documentElement.dataset.page;
    const filename = kind === 'index' ? '' : kind + '.html';
    const target = new URL(`${preferred()}/${filename}`, new URL('./', location.href));
    target.search = location.search;
    target.hash = location.hash;
    location.replace(target.href);
  }
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[data-language]');
    if (link) remember(link.dataset.language);
    const destination = event.target.closest?.('a[href]');
    if (destination?.href === 'https://gymleader.app/') remember(document.documentElement.lang);
  });
})();

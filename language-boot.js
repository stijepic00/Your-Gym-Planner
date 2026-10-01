(() => {
  const loadingCopy = {
    sr: { title: 'Učitavanje GymLeadera…', message: 'Pripremamo tvoj trening.', offline: 'Nema internet veze. Čim se veza vrati, možeš nastaviti gdje si stao.', retry: 'Pokušaj ponovo' },
    en: { title: 'Loading GymLeader…', message: 'Getting your workout ready.', offline: 'You are offline. Reconnect to continue where you left off.', retry: 'Try again' },
    de: { title: 'GymLeader wird geladen…', message: 'Dein Training wird vorbereitet.', offline: 'Du bist offline. Stelle die Verbindung wieder her, um fortzufahren.', retry: 'Erneut versuchen' }
  };
  const supportedLanguages = ['sr', 'en', 'de'];
  const savedLanguage = localStorage.getItem('gym-language');
  let language = supportedLanguages.includes(savedLanguage) ? savedLanguage : '';

  if (!language) {
    const preferences = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language].filter(Boolean);
    for (const preference of preferences) {
      const code = String(preference || '').trim().toLowerCase().replace(/_/g, '-').split('-')[0];
      if (['sr', 'en', 'de'].includes(code)) {
        language = code;
        break;
      }
      if (['hr', 'bs', 'cnr'].includes(code)) {
        language = 'sr';
        break;
      }
    }
    language ||= 'en';
    localStorage.setItem('gym-language', language);
    localStorage.setItem('gym-language-source', 'device');
  }

  const copy = loadingCopy[language] || loadingCopy.sr;
  const bootText = document.getElementById('auth-boot-text');
  const bootScreen = document.getElementById('auth-boot-screen');
  if (bootText) bootText.textContent = copy.message;
  if (bootScreen) bootScreen.setAttribute('aria-label', copy.title);
  const retryButton = document.getElementById('auth-boot-retry');
  const showOfflineState = () => {
    if (navigator.onLine) return;
    if (bootText) bootText.textContent = copy.offline;
    if (bootScreen) {
      bootScreen.classList.add('is-offline');
      bootScreen.setAttribute('aria-label', copy.offline);
    }
    if (retryButton) {
      retryButton.hidden = false;
      retryButton.textContent = copy.retry;
    }
  };
  const clearOfflineState = () => {
    if (bootScreen) bootScreen.classList.remove('is-offline');
    if (retryButton) retryButton.hidden = true;
    if (bootText) bootText.textContent = copy.message;
  };
  retryButton?.addEventListener('click', () => window.location.reload());
  window.addEventListener('offline', showOfflineState);
  window.addEventListener('online', clearOfflineState);
  if (!navigator.onLine) window.setTimeout(showOfflineState, 250);
  window.GymLeaderLoadingCopy = loadingCopy;
})();

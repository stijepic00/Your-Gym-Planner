(() => {
  const loadingCopy = {
    sr: { title: 'Učitavanje GymLeadera…', message: 'Pripremamo tvoj trening.' },
    en: { title: 'Loading GymLeader…', message: 'Getting your workout ready.' },
    de: { title: 'GymLeader wird geladen…', message: 'Dein Training wird vorbereitet.' }
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
  window.GymLeaderLoadingCopy = loadingCopy;
})();

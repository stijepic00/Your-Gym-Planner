(() => {
  const loadingCopy = {
    sr: { title: 'Učitavanje GymLeadera…', message: 'Pripremamo tvoj trening.', offline: 'Nema internet veze. Čim se veza vrati, možeš nastaviti gdje si stao.', offlineNoCache: 'Offline podaci za ovaj nalog nisu dostupni na uređaju. Poveži se i pokušaj ponovo.', error: 'Učitavanje nije uspjelo. Provjeri vezu i pokušaj ponovo.', retry: 'Pokušaj ponovo' },
    bs: { title: 'Učitavanje GymLeadera…', message: 'Pripremamo tvoj trening.', offline: 'Nema internet veze. Kada se veza vrati, možeš nastaviti gdje si stao.', offlineNoCache: 'Podaci za rad bez interneta za ovaj račun nisu dostupni na uređaju. Poveži se i pokušaj ponovo.', error: 'Učitavanje nije uspjelo. Provjeri vezu i pokušaj ponovo.', retry: 'Pokušaj ponovo' },
    hr: { title: 'Učitavanje GymLeadera…', message: 'Pripremamo tvoj trening.', offline: 'Nema internetske veze. Kada se veza vrati, možeš nastaviti gdje si stao.', offlineNoCache: 'Podaci za rad bez interneta za ovaj račun nisu dostupni na uređaju. Poveži se i pokušaj ponovno.', error: 'Učitavanje nije uspjelo. Provjeri vezu i pokušaj ponovno.', retry: 'Pokušaj ponovno' },
    en: { title: 'Loading GymLeader…', message: 'Getting your workout ready.', offline: 'You are offline. Reconnect to continue where you left off.', offlineNoCache: 'Offline data for this account is unavailable on this device. Reconnect and try again.', error: 'Loading failed. Check your connection and try again.', retry: 'Try again' },
    de: { title: 'GymLeader wird geladen…', message: 'Dein Training wird vorbereitet.', offline: 'Du bist offline. Stelle die Verbindung wieder her, um fortzufahren.', offlineNoCache: 'Für dieses Konto sind auf diesem Gerät keine Offline-Daten verfügbar. Verbinde dich und versuche es erneut.', error: 'Das Laden ist fehlgeschlagen. Prüfe deine Verbindung und versuche es erneut.', retry: 'Erneut versuchen' },
    fr: { title: 'Chargement de GymLeader…', message: 'Préparation de ton entraînement.', offline: 'Tu es hors ligne. Reconnecte-toi pour reprendre là où tu en étais.', offlineNoCache: 'Les données hors ligne de ce compte ne sont pas disponibles sur cet appareil. Reconnecte-toi et réessaie.', error: 'Le chargement a échoué. Vérifie ta connexion et réessaie.', retry: 'Réessayer' },
    it: { title: 'Caricamento di GymLeader…', message: 'Prepariamo il tuo allenamento.', offline: 'Sei offline. Riconnettiti per riprendere da dove eri rimasto/a.', offlineNoCache: 'I dati offline di questo account non sono disponibili su questo dispositivo. Riconnettiti e riprova.', error: 'Caricamento non riuscito. Controlla la connessione e riprova.', retry: 'Riprova' },
    es: { title: 'Cargando GymLeader…', message: 'Preparando tu entrenamiento.', offline: 'No tienes conexión. Vuelve a conectarte para continuar donde lo dejaste.', offlineNoCache: 'Los datos sin conexión de esta cuenta no están disponibles en este dispositivo. Conéctate y vuelve a intentarlo.', error: 'No se pudo cargar. Comprueba tu conexión y vuelve a intentarlo.', retry: 'Reintentar' }
  };
  const supportedLanguages = ['sr', 'bs', 'hr', 'en', 'de', 'fr', 'it', 'es'];
  const savedLanguage = localStorage.getItem('gym-language');
  let language = supportedLanguages.includes(savedLanguage) ? savedLanguage : '';

  if (!language) {
    const preferences = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language].filter(Boolean);
    for (const preference of preferences) {
      const code = String(preference || '').trim().toLowerCase().replace(/_/g, '-').split('-')[0];
      if (supportedLanguages.includes(code)) {
        language = code;
        break;
      }
      if (code === 'cnr') {
        language = 'sr';
        break;
      }
    }
    language ||= 'en';
    localStorage.setItem('gym-language', language);
    localStorage.setItem('gym-language-source', 'device');
  }

  document.documentElement.lang = language === 'sr' ? 'sr-Latn' : language;
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
    if (bootScreen?.classList.contains('is-error')) return;
    if (bootScreen) bootScreen.classList.remove('is-offline');
    if (retryButton) retryButton.hidden = true;
    if (bootText) bootText.textContent = copy.message;
  };
  retryButton?.addEventListener('click', () => {
    if (typeof window.retryGymLeaderBoot === 'function') void window.retryGymLeaderBoot();
    else window.location.reload(); // Module failed to load; no in-app retry handler exists.
  });
  window.setTimeout(() => {
    if (window.GymLeaderBootHandlerInstalled || bootScreen?.classList.contains('is-hidden')) return;
    bootScreen?.classList.add('is-error');
    if (bootText) bootText.textContent = navigator.onLine ? copy.error : copy.offlineNoCache;
    if (retryButton) retryButton.hidden = false;
  }, 15000);
  window.addEventListener('offline', showOfflineState);
  window.addEventListener('online', clearOfflineState);
  if (!navigator.onLine) window.setTimeout(showOfflineState, 250);
  window.GymLeaderLoadingCopy = loadingCopy;
})();

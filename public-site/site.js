(() => {
  const toggle = document.querySelector('.menu-toggle');
  const navigation = document.getElementById('site-navigation');
  const mobile = window.matchMedia('(max-width: 760px)');
  const languageMenus = [...document.querySelectorAll('.language-menu')];
  function closeLanguages() { languageMenus.forEach(menu => { menu.open = false; }); }
  if (toggle && navigation) {
    toggle.closest('.header-inner').classList.add('has-overlay-menu');
    function setMenu(open, returnFocus = false) {
      const expanded = mobile.matches && open;
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.setAttribute('aria-label', expanded ? toggle.dataset.closeLabel : toggle.dataset.openLabel);
      navigation.classList.toggle('is-open', expanded);
      navigation.hidden = mobile.matches && !expanded;
      if (!expanded) closeLanguages();
      if (returnFocus) toggle.focus();
    }
    function syncLayout() { toggle.hidden = !mobile.matches; setMenu(false); }
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    navigation.addEventListener('click', event => {
      if (event.target.closest('a') && mobile.matches) setMenu(false, true);
    });
    document.addEventListener('click', event => { if (!event.target.closest('.header-inner') || event.target.closest('.header-inner a')) setMenu(false); });
    document.addEventListener('focusin', event => { if (!event.target.closest('.header-inner')) setMenu(false); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !languageMenus.some(menu => menu.open) && toggle.getAttribute('aria-expanded') === 'true') setMenu(false, true);
    });
    mobile.addEventListener('change', syncLayout);
    syncLayout();
  }
  document.addEventListener('click', event => { if (!event.target.closest('.language-menu')) closeLanguages(); });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const openMenu = languageMenus.find(menu => menu.open);
    if (openMenu) { closeLanguages(); openMenu.querySelector('summary').focus(); }
  });
  document.addEventListener('focusin', event => {
    languageMenus.forEach(menu => { if (!menu.contains(event.target)) menu.open = false; });
  });

  const frames = [...document.querySelectorAll('.hero-frame')];
  const phrases = [...document.querySelectorAll('.hero-phrase')];
  const pause = document.querySelector('.animation-toggle');
  if (!frames.length || !phrases.length || !pause) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  let photoIndex = 0;
  let phraseIndex = 0;
  let photoTimer, phraseTimer;
  let generation = 0;
  let preparedPhoto;
  const active = () => !paused && !reduced.matches && !document.hidden;
  function prepareNextPhoto() {
    if (!active()) return Promise.resolve(false);
    if (preparedPhoto) return preparedPhoto;
    const next = frames[1];
    const image = next.querySelector('img');
    preparedPhoto = new Promise(resolve => {
      image.addEventListener('load', () => resolve(true), { once: true });
      image.addEventListener('error', () => resolve(false), { once: true });
      next.querySelectorAll('source[data-srcset]').forEach(source => { source.srcset = source.dataset.srcset; });
      image.src = image.dataset.src;
      if (image.complete && image.naturalWidth) resolve(true);
    });
    return preparedPhoto;
  }
  async function showNextPhoto(token) {
    const ready = await prepareNextPhoto();
    const nextIndex = (photoIndex + 1) % frames.length;
    const image = frames[nextIndex].querySelector('img');
    try { await image.decode(); } catch { return; }
    if (!ready || !active() || token !== generation) return;
    frames[photoIndex].classList.remove('is-active');
    frames[nextIndex].classList.add('is-active');
    photoIndex = nextIndex;
  }
  function stop() { clearTimeout(photoTimer); clearTimeout(phraseTimer); generation++; }
  function schedulePhoto(token) {
    photoTimer = setTimeout(async () => {
      if (!active() || token !== generation) return;
      await showNextPhoto(token);
      if (active() && token === generation) schedulePhoto(token);
    }, 12000);
  }
  function schedulePhrase(token) {
    phraseTimer = setTimeout(() => {
      if (!active() || token !== generation) return;
      phrases[phraseIndex].classList.remove('is-active');
      phraseIndex = (phraseIndex + 1) % phrases.length;
      phrases[phraseIndex].classList.add('is-active');
      schedulePhrase(token);
    }, 6000);
  }
  function sync() {
    stop();
    pause.hidden = reduced.matches;
    pause.setAttribute('aria-pressed', String(paused));
    pause.setAttribute('aria-label', paused ? pause.dataset.playLabel : pause.dataset.pauseLabel);
    pause.querySelector('span').textContent = paused ? '▶' : 'Ⅱ';
    if (reduced.matches) {
      photoIndex = phraseIndex = 0;
      frames.forEach((frame, index) => frame.classList.toggle('is-active', index === 0));
      phrases.forEach((phrase, index) => phrase.classList.toggle('is-active', index === 0));
    }
    if (!active()) return;
    const token = generation;
    // Only the next responsive photo is fetched, after the critical first render.
    photoTimer = setTimeout(() => {
      if (!active() || token !== generation) return;
      void prepareNextPhoto();
      schedulePhoto(token);
    }, preparedPhoto ? 0 : 1500);
    schedulePhrase(token);
  }
  pause.addEventListener('click', () => { paused = !paused; sync(); });
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', sync);
  sync();
})();

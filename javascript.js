/*-- FIREBASE ENGINE & AUTH */
  import { TRANSLATIONS } from './translations.js?v=20261002-static-carousel-arrows-v94';
  import { EXERCISE_LIBRARY, getLibraryExerciseById, getLibraryExerciseName, getLibraryExerciseTrainingPlaces, resolveLibraryExercise } from './exercise-library.js?v=20261002-static-carousel-arrows-v94';
  import { FOOD_LIBRARY, FOOD_LIBRARY_CATEGORIES, getFoodLibraryName } from './food-library.js?v=20261002-static-carousel-arrows-v94';
  import { MEAL_CURRENCIES, getMealRecipe, getMealRecipeName, recipeNutrition, recipeIngredients, eligibleMealRecipes, mealPlanTotals, buildMealPlan, replaceMealInPlan, validStoredMealPlan } from './meal-planner.js?v=20261002-static-carousel-arrows-v94';
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
  import { 
    getAuth, 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail,
    EmailAuthProvider,
    linkWithCredential,
    reauthenticateWithCredential,
    updatePassword,
    signInWithCustomToken,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut,
    updateProfile
  } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
  import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    getDoc, 
    doc, 
    setDoc, 
    updateDoc,
    deleteDoc,
    deleteField,
    query, 
    where,
    orderBy,
    limit,
    onSnapshot 
  } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
  import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-check.js";

  const firebaseConfig = {
    apiKey: "AIzaSyCPZxiv-5ob5aYhcVvyuQ_uFu8Q2i6rcSk",
    authDomain: "gym-tracker-df1de.firebaseapp.com",
    projectId: "gym-tracker-df1de",
    storageBucket: "gym-tracker-df1de.firebasestorage.app",
    messagingSenderId: "106914789522",
    appId: "1:106914789522:web:f287e0e84d3252cb328e4b",
    measurementId: "G-0JYERN1S89"
  };

  const app = initializeApp(firebaseConfig);
  const appCheckSiteKey = document.querySelector('meta[name="firebase-app-check-site-key"]')?.content.trim();
  let appCheck = null;
  const isLocalDevelopment = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  // Firebase App Check is enforced for this project.  reCAPTCHA Enterprise cannot
  // validate a local Live Server origin, so Firebase's documented debug provider is
  // used only on the developer machine.  It never runs on gymleader.app.
  if (appCheckSiteKey && isLocalDevelopment) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  if (appCheckSiteKey) {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true
    });
  }
  const auth = getAuth(app);
  const db = getFirestore(app);

  // Render user supplied text as text rather than executable HTML.
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }


  let pendingVerification = {
  email: '',
  name: '',
  password: ''
};
  let currentUser = null;
  let currentAuthMode = 'login';
  const REGISTRATION_DRAFT_KEY = 'gymleader-registration-draft-v1';
  const REGISTRATION_DRAFT_TTL_MS = 10 * 60 * 1000;
  let userRoutines = [];
  let cachedHistory = [];
  let customExType = 'existing';
  let currentWorkout = null;
  let activeWorkoutEditMode = false;
  let chartInstance = null;
  let routinesUnsubscribe = null;
  let navigationGuardReady = false;
  let routineEditMode = false;
  let showArchivedRoutines = false;
  let generatedPlanSuggestions = [];
  let generatedPlanWarning = '';
  let generatedPlanViewIndex = 0;
  let generatedPlanSaveInProgress = false;
  let pendingGeneratedPlanId = null;
  const routineWeekdayLabels = ['Nedjelja', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota'];
  let editingRoutineId = null;
  let pendingWorkoutsMemory = [];
  let pendingWorkoutsLoaded = false;
  let pendingDbPromise = null;
  let currentProfileData = null;
  let profileReadSucceeded = false;
  let pendingNewUserOnboarding = false;
  let profileRequiredEditMode = false;
  let bodyMeasurements = [];
  let editingBodyMeasurementId = null;
  let pendingBodyMeasurementDeleteId = null;
  let bodyMeasurementsEditMode = false;
  let bodyChartInstance = null;
  let foodEntries = [];
  let foodEntriesLoadedDate = '';
  let activeMealPlan = null;
  let activeMealPlanOptions = null;
  let savedMealPlans = [];
  let savedMealPlansLoaded = false;
  let pendingMealPlanDeleteId = null;
  let editingFoodEntryId = null;
  let pendingFoodEntryDeleteId = null;
  let editingHistoryWorkoutId = null;
  let pendingHistoryWorkoutDeleteId = null;
  let foodLibraryCategory = 'all';
  let activeFoodLibraryItemId = null;
  let pendingProfilePhotoImage = null;
  let profilePhotoZoom = 1;
  let profilePhotoOffsetX = 0;
  let profilePhotoOffsetY = 0;
  let profilePhotoDrag = null;
  let profileEmailCodeTarget = '';
  const HISTORY_CACHE_VERSION = 1;
  const BODY_MEASUREMENTS_CACHE_VERSION = 1;
  const BODY_MEASUREMENTS_CACHE_TTL_MS = 15 * 60 * 1000;
  const FOOD_ENTRIES_CACHE_TTL_MS = 10 * 60 * 1000;
  const LEGAL_DOCUMENT_VERSION = '2026-09-29';
  const LEGAL_ACCEPTANCE_CACHE_PREFIX = 'gym_legal_acceptance_v1_';
  const PENDING_SYNC_RETRY_MIN_MS = 5000;
  const PENDING_SYNC_RETRY_MAX_MS = 60000;
  let deferredInstallPrompt = null;
  const PWA_INSTALL_DISMISSED_KEY = 'gymleader-install-dismissed-v1';
  let pendingSyncRetryTimer = null;
  let pendingSyncRetryDelayMs = PENDING_SYNC_RETRY_MIN_MS;
  let pendingSyncInProgress = false;

  const VALID_GENDER_VALUES = new Set(['male', 'female', 'unspecified']);
  const REQUIRED_PROFILE_FIELDS = ['gender', 'age', 'heightCm', 'weightKg', 'goal', 'trainingFrequency', 'trainingLocation', 'experienceLevel', 'sessionMinutes', 'targetMuscleGroups', 'preferredExercises', 'avoidedExercises', 'foodAllergies'];

  function getProfileGender() {
    const gender = currentProfileData?.gender;
    return VALID_GENDER_VALUES.has(gender) ? gender : 'unspecified';
  }

  function genderText(maleText, femaleText, neutralText) {
    const gender = getProfileGender();
    if (gender === 'male') return maleText;
    if (gender === 'female') return femaleText;
    return neutralText;
  }

  function getGenderLabel(gender = getProfileGender()) {
    return ({ male: 'Muško', female: 'Žensko', unspecified: 'Ne želim odgovoriti' })[gender] || 'Nije izabrano';
  }

  function getDashboardGreeting() {
    const language = getCurrentLanguage();
    const name = currentProfileData?.fullName || currentUser?.displayName || currentUser?.email?.split('@')[0] || (language === 'en' ? 'there' : language === 'de' ? 'Nutzer' : 'korisniče');
    const greeting = language === 'en' ? 'Welcome' : language === 'de' ? 'Willkommen' : genderText('Dobrodošao', 'Dobrodošla', 'Dobro došao/la');
    return `${greeting}, ${name}!`;
  }

  function getOnboardingGreeting() {
    const language = getCurrentLanguage();
    const fullName = currentProfileData?.fullName || currentUser?.displayName || currentUser?.email?.split('@')[0] || (language === 'en' ? 'there' : language === 'de' ? 'Nutzer' : 'korisniče');
    const firstName = String(fullName).trim().split(/\s+/)[0] || fullName;
    const greeting = language === 'en' ? 'Welcome' : language === 'de' ? 'Willkommen' : genderText('Dobrodošao', 'Dobrodošla', 'Dobro došao/la');
    return `${greeting}, ${firstName}!`;
  }

  function getNewUserOnboardingKey(userId = currentUser?.uid) {
    return userId ? `gymleader-new-user-onboarding-v1:${userId}` : '';
  }

  function hasPendingNewUserOnboarding() {
    const key = getNewUserOnboardingKey();
    try { return pendingNewUserOnboarding || Boolean(key && localStorage.getItem(key)); } catch { return pendingNewUserOnboarding; }
  }

  function clearPendingNewUserOnboarding() {
    pendingNewUserOnboarding = false;
    const key = getNewUserOnboardingKey();
    try { if (key) localStorage.removeItem(key); } catch { /* The guide can still be dismissed normally. */ }
  }

  function isProfileComplete(profile = currentProfileData) {
    if (!profile || !String(profile.fullName || '').trim() || !VALID_GENDER_VALUES.has(profile.gender)) return false;
    const numericRanges = {
      age: [13, 100], heightCm: [100, 250], weightKg: [25, 400],
      trainingFrequency: [1, 14], sessionMinutes: [10, 300]
    };
    for (const [field, [min, max]] of Object.entries(numericRanges)) {
      const value = Number(profile[field]);
      if (!Number.isFinite(value) || value < min || value > max) return false;
    }
    return ['lose_weight', 'maintain', 'gain_weight', 'gain_muscle', 'increase_strength', 'general_fitness'].includes(profile.goal)
      && ['strength', 'muscle_progress', 'general_fitness'].includes(profile.trainingFocus)
      && ['gym', 'home', 'street', 'other'].includes(profile.trainingLocation)
      && ['beginner', 'intermediate', 'advanced'].includes(profile.experienceLevel)
      && Array.isArray(profile.targetMuscleGroups)
      && profile.targetMuscleGroups.length > 0
      && typeof profile.preferredExercises === 'string' && profile.preferredExercises.trim().length > 0
      && typeof profile.avoidedExercises === 'string' && profile.avoidedExercises.trim().length > 0
      && typeof profile.foodAllergies === 'string' && profile.foodAllergies.trim().length > 0;
  }

  function showGenderProfileGateIfRequired() {
    const modal = document.getElementById('profile-required-modal');
    if (!modal || !currentUser || !profileReadSucceeded) return;
    if (!hasAcceptedCurrentLegalVersion(currentProfileData)) {
      modal.style.display = 'none';
      return;
    }
    const needsProfile = !isProfileComplete();
    modal.style.display = needsProfile ? 'flex' : 'none';
    if (needsProfile) {
      profileRequiredEditMode = false;
      const close = document.getElementById('profile-required-close');
      const button = document.querySelector('[data-action="save-required-profile"], [data-action="save-profile-details"]');
      if (close) close.style.display = 'none';
      profileWizardState.current = 0;
      profileWizardState.scope = 'onboarding';
      if (button) { button.dataset.action = 'save-required-profile'; button.textContent = 'Sačuvaj profil i nastavi'; }
      populateRequiredProfileForm();
    }
  }

  function updateGenderSaveButton(inputName, buttonAction) {
    const selected = document.querySelector(`input[name="${inputName}"]:checked`);
    const button = document.querySelector(`[data-action="${buttonAction}"]`);
    if (button) button.disabled = !selected;
  }

  function hideAuthBootScreen() {
    document.getElementById('auth-boot-screen')?.classList.add('is-hidden');
  }

  const defaultWorkouts = [
    { id: 'custom-extra', name: 'Poseban / Kardio Dan', emoji: '⚡', exercises: [] }
  ];

  function getEmojiForRoutine(name) {
    return '';
  }

  window.setRoutineEmoji = function(emoji) {
    const input = document.getElementById('newRoutineEmojiInput');
    if (input) input.value = emoji;
  };

  window.clearRoutineEmoji = function() {
    const input = document.getElementById('newRoutineEmojiInput');
    if (input) input.value = '';
  };

  function updateAuthModePresentation() {
    const language = getCurrentLanguage();
    const copy = {
      sr: {
        loginTitle: 'Prijavi se u GymLeader', registerTitle: 'Napravi GymLeader nalog',
        loginPrompt: 'Već imaš GymLeader nalog?', loginAction: 'Prijavi se →',
        registerPrompt: 'Prvi put si ovdje? Nemaš GymLeader nalog?', registerAction: 'Napravi nalog →',
        loginSubmit: 'Prijavi se u GymLeader →', registerSubmit: 'Registruj GymLeader nalog →',
        loginSocial: 'ili prijavi se sa svojim Google nalogom:', registerSocial: 'ili napravi GymLeader nalog putem Googlea:',
        verificationSent: 'Poslali smo šestocifreni kod na tvoju email adresu. Provjeri i Spam/Neželjenu poštu.',
        passwordHint: 'Unesi lozinku svog GymLeader naloga.'
      },
      en: {
        loginTitle: 'Sign in to GymLeader', registerTitle: 'Create a GymLeader account',
        loginPrompt: 'Already have a GymLeader account?', loginAction: 'Sign in →',
        registerPrompt: 'First time here? Don’t have a GymLeader account?', registerAction: 'Create an account →',
        loginSubmit: 'Sign in to GymLeader →', registerSubmit: 'Create a GymLeader account →',
        loginSocial: 'or sign in with your Google account:', registerSocial: 'or create a GymLeader account with Google:',
        verificationSent: 'We sent a six-digit code to your email address. Check your Spam/Junk folder too.',
        passwordHint: 'Enter your GymLeader account password.'
      },
      de: {
        loginTitle: 'Bei GymLeader anmelden', registerTitle: 'GymLeader-Konto erstellen',
        loginPrompt: 'Du hast bereits ein GymLeader-Konto?', loginAction: 'Anmelden →',
        registerPrompt: 'Zum ersten Mal hier? Noch kein GymLeader-Konto?', registerAction: 'Konto erstellen →',
        loginSubmit: 'Bei GymLeader anmelden →', registerSubmit: 'GymLeader-Konto erstellen →',
        loginSocial: 'oder melde dich mit deinem Google-Konto an:', registerSocial: 'oder erstelle ein GymLeader-Konto mit Google:',
        verificationSent: 'Wir haben einen sechsstelligen Code an deine E-Mail-Adresse gesendet. Prüfe auch den Spam-Ordner.',
        passwordHint: 'Gib das Passwort deines GymLeader-Kontos ein.'
      }
    }[language] || {};
    const isRegister = currentAuthMode === 'register';
    const title = document.getElementById('auth-title');
    if (title) title.textContent = isRegister ? (copy.registerTitle || 'Napravi GymLeader nalog') : (copy.loginTitle || 'Prijavi se u GymLeader');
    const loginCard = document.getElementById('tab-btn-login');
    const registerCard = document.getElementById('tab-btn-register');
    const submit = document.getElementById('auth-submit-btn');
    const socialText = document.getElementById('social-auth-text');
    const passwordHint = document.querySelector('.auth-password-note');
    [[loginCard, !isRegister, copy.loginPrompt, copy.loginAction], [registerCard, isRegister, copy.registerPrompt, copy.registerAction]].forEach(([card, active, prompt, action]) => {
      if (!card) return;
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-pressed', String(active));
      const label = card.querySelector('.auth-choice-label');
      const actionLabel = card.querySelector('strong');
      if (label && prompt) label.textContent = prompt;
      if (actionLabel && action) actionLabel.textContent = action;
    });
    if (submit) submit.textContent = isRegister ? (copy.registerSubmit || 'Registruj GymLeader nalog →') : (copy.loginSubmit || 'Prijavi se u GymLeader →');
    if (socialText) socialText.textContent = isRegister ? (copy.registerSocial || 'ili napravi GymLeader nalog putem Googlea:') : (copy.loginSocial || 'ili prijavi se sa svojim Google nalogom:');
    if (passwordHint) passwordHint.textContent = copy.passwordHint || 'Unesi lozinku svog GymLeader naloga.';
    return copy;
  }

  window.toggleAuthMode = function(mode) {
    if (!['login', 'register'].includes(mode) || mode === currentAuthMode) return;
    currentAuthMode = mode;
    const groupName = document.getElementById('group-name');
    const btnSubmit = document.getElementById('auth-submit-btn');
    const errorDiv = document.getElementById('auth-error');
    const socialText = document.getElementById('social-auth-text');
    const confirmGroup = document.getElementById('group-confirm-password');
    const passwordRules = document.getElementById('register-password-rules');
    const loginActions = document.getElementById('auth-login-actions');
    const passwordInput = document.getElementById('auth-password');

    if (errorDiv) errorDiv.style.display = 'none';

    if (mode === 'register') {
      if (groupName) groupName.style.display = 'block';
      if (confirmGroup) confirmGroup.style.display = 'block';
      if (passwordRules) passwordRules.style.display = 'flex';
      if (loginActions) loginActions.style.display = 'none';
      if (passwordInput) {
        passwordInput.autocomplete = 'new-password';
        passwordInput.placeholder = 'Napravi lozinku za GymLeader';
      }
      if (btnSubmit) btnSubmit.innerText = 'Registruj GymLeader nalog →';
      if (socialText) socialText.innerText = 'ili napravi GymLeader nalog putem Googlea:';
    } else {
      if (groupName) groupName.style.display = 'none';
      if (confirmGroup) confirmGroup.style.display = 'none';
      if (passwordRules) passwordRules.style.display = 'none';
      if (loginActions) loginActions.style.display = 'block';
      if (passwordInput) {
        passwordInput.autocomplete = 'current-password';
        passwordInput.placeholder = 'Lozinka za GymLeader';
      }
      if (btnSubmit) btnSubmit.innerText = 'Prijavi se u GymLeader →';
      if (socialText) socialText.innerText = 'ili prijavi se sa svojim Google nalogom:';
    }
    updateAuthModePresentation();
    updatePasswordRuleState();
    renderRegistrationResume();
  };

  const FIRST_VISIT_PROMPT_KEY = 'gymleader-first-visit-answer-v1';

  function hasKnownLocalGymLeaderUser() {
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index) || '';
        if (key.startsWith('gym_routines_cache_v') || key.startsWith('gym_history_cache_v') || key.startsWith('gym_legal_acceptance_v1_') || key.startsWith('gymleader-profile-wizard-draft:')) return true;
      }
    } catch { /* The prompt remains optional when storage is unavailable. */ }
    return false;
  }

  function showFirstVisitPromptIfNeeded() {
    const modal = document.getElementById('first-visit-modal');
    if (!modal || currentUser) return;
    let answered = true;
    try {
      answered = Boolean(localStorage.getItem(FIRST_VISIT_PROMPT_KEY)) || hasKnownLocalGymLeaderUser();
    } catch { /* Keep the optional prompt hidden if storage cannot be checked. */ }
    modal.hidden = answered;
    document.body.classList.toggle('first-visit-open', !answered);
    if (!answered) requestAnimationFrame(() => modal.querySelector('[data-action="first-visit-register"]')?.focus());
  }

  function dismissFirstVisitPrompt() {
    try { localStorage.setItem(FIRST_VISIT_PROMPT_KEY, 'dismissed'); } catch { /* Dismissal remains available without local storage. */ }
    const modal = document.getElementById('first-visit-modal');
    if (modal) modal.hidden = true;
    document.body.classList.remove('first-visit-open');
  }

  window.answerFirstVisitPrompt = function(mode) {
    try { localStorage.setItem(FIRST_VISIT_PROMPT_KEY, mode); } catch { /* The selected auth mode still works without local storage. */ }
    const modal = document.getElementById('first-visit-modal');
    if (modal) modal.hidden = true;
    document.body.classList.remove('first-visit-open');
    window.toggleAuthMode(mode);
    requestAnimationFrame(() => document.getElementById('auth-email')?.focus());
  };

  document.addEventListener('keydown', (event) => {
    const modal = document.getElementById('first-visit-modal');
    if (!modal || modal.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      dismissFirstVisitPrompt();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...modal.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  window.toggleAuthPassword = function(button) {
    const targetId = button?.dataset?.passwordTarget || 'auth-password';
    const input = document.getElementById(targetId);
    const toggleButton = button || document.querySelector(`[data-action="toggle-auth-password"][data-password-target="${targetId}"]`);
    if (!input || !toggleButton) return;
    const shouldShow = input.type === 'password';
    input.type = shouldShow ? 'text' : 'password';
    toggleButton.textContent = shouldShow ? 'Sakrij' : 'Prikaži';
    toggleButton.setAttribute('aria-label', shouldShow ? 'Sakrij lozinku' : 'Prikaži lozinku');
  };

  function getPasswordRules(password) {
    return {
      length: password.length >= 8 && password.length <= 256,
      letter: /[A-Za-zČĆŽŠĐčćžšđ]/.test(password),
      number: /\d/.test(password)
    };
  }

  function isValidRegistrationPassword(password) {
    const rules = getPasswordRules(password);
    return rules.length && rules.letter && rules.number;
  }

  function updatePasswordRuleState() {
    const password = document.getElementById('auth-password')?.value || '';
    const confirmation = document.getElementById('auth-password-confirm')?.value || '';
    const rules = getPasswordRules(password);
    Object.entries(rules).forEach(([rule, isValid]) => {
      const element = document.querySelector(`[data-password-rule="${rule}"]`);
      if (!element) return;
      element.classList.toggle('is-valid', isValid);
      element.classList.toggle('is-invalid', !isValid);
    });
    const matchMessage = document.getElementById('auth-password-match');
    if (!matchMessage || currentAuthMode !== 'register') return;
    if (!confirmation) {
      matchMessage.textContent = '';
      matchMessage.classList.remove('is-valid');
    } else if (password !== confirmation) {
      matchMessage.textContent = 'Lozinke se ne podudaraju.';
      matchMessage.classList.remove('is-valid');
    } else {
      matchMessage.textContent = 'Lozinke se podudaraju.';
      matchMessage.classList.add('is-valid');
    }
  }

  function saveRegistrationDraft({ email, name, codeSentAt = null }) {
    try {
      const startedAt = Date.now();
      localStorage.setItem(REGISTRATION_DRAFT_KEY, JSON.stringify({
        email: String(email || '').trim().toLowerCase(),
        name: String(name || '').trim().slice(0, 80),
        codeSentAt,
        expiresAt: codeSentAt ? codeSentAt + REGISTRATION_DRAFT_TTL_MS : startedAt + (24 * 60 * 60 * 1000)
      }));
      renderRegistrationResume();
    } catch (error) {
      console.warn('Nacrt registracije nije sačuvan:', error);
    }
  }

  function readRegistrationDraft() {
    try {
      const raw = localStorage.getItem(REGISTRATION_DRAFT_KEY);
      if (!raw) return null;
      const draft = JSON.parse(raw);
      if (!draft?.email || !draft?.expiresAt || Date.now() > Number(draft.expiresAt)) {
        localStorage.removeItem(REGISTRATION_DRAFT_KEY);
        return null;
      }
      return draft;
    } catch {
      localStorage.removeItem(REGISTRATION_DRAFT_KEY);
      return null;
    }
  }

  function clearRegistrationDraft() {
    try { localStorage.removeItem(REGISTRATION_DRAFT_KEY); } catch { /* storage may be blocked */ }
    const resume = document.getElementById('registration-resume');
    if (resume) resume.style.display = 'none';
  }

  function renderRegistrationResume() {
    const resume = document.getElementById('registration-resume');
    if (!resume) return;
    if (currentAuthMode === 'register'
      && (document.getElementById('auth-email')?.value || document.getElementById('auth-name')?.value)) {
      resume.style.display = 'none';
      return;
    }
    resume.style.display = readRegistrationDraft() ? 'block' : 'none';
  }

  window.resumeRegistration = function() {
    const draft = readRegistrationDraft();
    if (!draft) {
      renderRegistrationResume();
      return;
    }
    pendingVerification = { email: draft.email, name: draft.name, password: '' };
    window.toggleAuthMode('register');
    const emailInput = document.getElementById('auth-email');
    const nameInput = document.getElementById('auth-name');
    if (emailInput) emailInput.value = draft.email;
    if (nameInput) nameInput.value = draft.name || '';
    const resume = document.getElementById('registration-resume');
    if (resume) resume.style.display = 'none';
    if (draft.codeSentAt) {
      window.openVerificationModal();
    } else {
      document.getElementById('auth-password')?.focus();
      ShowToast('Podaci su vraćeni. Dovrši registraciju i pošalji kod.');
    }
  };

  window.discardRegistration = function() {
    clearRegistrationDraft();
    pendingVerification = { email: '', name: '', password: '' };
    const form = document.getElementById('auth-form');
    if (form) form.reset();
    window.toggleAuthMode('register');
    ShowToast('Nacrt registracije je obrisan.');
  };

  function getFriendlyAuthError(error, mode) {
    const code = String(error?.code || '');
    const clientMessage = String(error?.message || '');
    const knownClientMessages = new Set([
      'Unesi ispravnu email adresu.',
      'Unesi ime, prezime ili nadimak.',
      'Ime ili nadimak može imati najviše 80 karaktera.',
      'Lozinka mora imati najmanje 8 karaktera, jedno slovo i jedan broj.',
      'Lozinke se ne podudaraju.',
      'Unesi email i GymLeader lozinku.'
    ]);
    if (knownClientMessages.has(clientMessage)) return clientMessage;

    if (['auth/invalid-credential', 'auth/invalid-login-credentials', 'auth/user-not-found', 'auth/wrong-password'].includes(code)) {
      return 'Email ili GymLeader lozinka nisu tačni. Ako nemaš GymLeader nalog, prvo ga napravi.';
    }
    if (['auth/email-already-in-use', 'auth/email-already-exists'].includes(code)) {
      return 'Ovaj email već koristi GymLeader nalog. Izaberi „Prijavi se“.';
    }
    if (code === 'auth/invalid-email') return 'Unesi ispravnu email adresu.';
    if (code === 'auth/weak-password') return 'GymLeader lozinka mora imati najmanje 8 karaktera.';
    if (['auth/too-many-requests', 'auth/quota-exceeded'].includes(code)) return 'Previše pokušaja. Sačekaj malo pa pokušaj ponovo.';
    if (code === 'auth/network-request-failed') return 'Nema internet veze. Provjeri vezu i pokušaj ponovo.';
    if (code === 'auth/user-disabled') return 'Ovaj GymLeader nalog je trenutno onemogućen. Pokušaj ponovo kasnije.';
    if (code === 'auth/operation-not-allowed') return 'Ovaj način ulaska trenutno nije dostupan. Pokušaj ponovo kasnije.';
    return mode === 'register'
      ? 'Registraciju trenutno nije moguće završiti. Provjeri podatke i pokušaj ponovo.'
      : 'Prijava trenutno nije uspjela. Provjeri podatke i pokušaj ponovo.';
  }

  function getFriendlyVerificationError(error) {
    const code = String(error?.code || '');
    const clientMessage = String(error?.message || '');
    const knownClientMessages = new Set([
      'Unesi tačno 6 cifara iz emaila.',
      'Unesi istu GymLeader lozinku koju si napravio pri registraciji.',
      'Sigurnosna provjera nije uspjela. Osvježite stranicu i pokušajte ponovo.'
    ]);
    if (knownClientMessages.has(clientMessage)) return clientMessage;
    if (code === 'verification/400') return 'Kod nije tačan ili je istekao. Provjeri ga pa pokušaj ponovo.';
    if (code === 'verification/409') return 'Ovaj email već koristi GymLeader nalog. Vrati se na prijavu.';
    if (code === 'verification/429') return 'Previše pogrešnih pokušaja. Sačekaj malo pa pokušaj ponovo.';
    if (['verification/401', 'verification/403'].includes(code)) return 'Sigurnosna provjera nije uspjela. Osvježi stranicu pa pokušaj ponovo.';
    if (code.startsWith('auth/')) return getFriendlyAuthError(error, 'register');
    return 'Potvrdu emaila trenutno nije moguće završiti. Pokušaj ponovo.';
  }

  // This is the only email/password form handler. It keeps client validation
  // messages helpful while never exposing Firebase or API error details.
  window.handleAuthSubmit = async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const email = document.getElementById('auth-email')?.value.trim().toLowerCase() || '';
    const password = document.getElementById('auth-password')?.value || '';
    const confirmation = document.getElementById('auth-password-confirm')?.value || '';
    const name = document.getElementById('auth-name')?.value.trim() || '';
    const errorDiv = document.getElementById('auth-error');
    if (errorDiv) { errorDiv.style.display = 'none'; errorDiv.textContent = ''; }

    try {
      if (currentAuthMode === 'register') {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Unesi ispravnu email adresu.');
        if (!name || name.length < 2) throw new Error('Unesi ime, prezime ili nadimak.');
        if (name.length > 80) throw new Error('Ime ili nadimak može imati najviše 80 karaktera.');
        if (!isValidRegistrationPassword(password)) throw new Error('Lozinka mora imati najmanje 8 karaktera, jedno slovo i jedan broj.');
        if (password !== confirmation) throw new Error('Lozinke se ne podudaraju.');

        pendingVerification = { email, password, name, createdAt: Date.now() };
        await sendVerificationCodeEmail(email);
        saveRegistrationDraft({ email, name });
        openVerificationModal();
        return;
      }

      if (!email || !password) throw new Error('Unesi email i GymLeader lozinku.');
      await signInWithEmailAndPassword(auth, email, password);
      document.getElementById('auth-form')?.reset();
    } catch (error) {
      console.error('Auth greška:', error);
      if (!errorDiv) return;
      errorDiv.style.display = 'block';
      errorDiv.textContent = getFriendlyAuthError(error, currentAuthMode);
      if (currentAuthMode === 'register' && error?.code === 'auth/email-already-in-use') {
        const loginButton = document.createElement('button');
        loginButton.type = 'button';
        loginButton.className = 'auth-inline-link';
        loginButton.textContent = 'Prijavi se sa postojećim GymLeader nalogom';
        loginButton.addEventListener('click', () => window.toggleAuthMode('login'));
        errorDiv.appendChild(loginButton);
      }
    }
  };

  window.handleGoogleLogin = async function() {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      // Keep the detailed Firebase response in DevTools while the UI stays safe for users.
      console.error('Google Auth diagnostic:', JSON.stringify({
        code: error?.code,
        message: error?.message,
        customData: error?.customData || null
      }));
      const googleMessage = error?.code === 'auth/popup-closed-by-user'
        ? 'Google prozor je zatvoren prije prijave. Pokušaj ponovo kada budeš spreman/spremna.'
        : error?.code === 'auth/popup-blocked'
          ? 'Preglednik je blokirao Google prozor. Dozvoli iskačuće prozore za GymLeader pa pokušaj ponovo.'
          : error?.code === 'auth/account-exists-with-different-credential'
            ? 'Ovaj email već koristi drugi način prijave. Pokušaj način kojim si ranije otvorio/la GymLeader nalog.'
            : error?.code === 'auth/network-request-failed'
              ? 'Nema internet veze. Provjeri vezu i pokušaj ponovo.'
              : error?.code === 'auth/too-many-requests'
                ? 'Previše pokušaja. Sačekaj malo pa pokušaj ponovo.'
                : 'Google prijava trenutno nije uspjela. Pokušaj ponovo.';
      ShowToast(googleMessage, 'error');
    }
  };


  window.openForgotPasswordModal = function() {
    let modal = document.getElementById('forgotPasswordModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'forgotPasswordModal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content text-center">
          <h3 style="font-size:1.2rem;font-weight:800;margin-bottom:8px;">Zaboravljena lozinka?</h3>
          <p style="color:var(--text-muted);font-size:.85rem;line-height:1.45;margin-bottom:14px;">
            Unesi email svog GymLeader naloga. Poslaćemo ti siguran link za novu lozinku.
          </p>
          <input type="email" id="forgot-password-email" class="custom-input" autocomplete="email" placeholder="tvoj@email.com">
          <div id="forgot-password-status" style="display:none;margin-top:10px;font-size:.82rem;line-height:1.4;"></div>
          <div style="display:flex;gap:10px;margin-top:14px;">
            <button class="btn" data-action="send-forgot-password">Pošalji link</button>
            <button class="btn btn-secondary" data-action="close-modal" data-modal-id="forgotPasswordModal">Otkaži</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    const emailInput = document.getElementById('forgot-password-email');
    const currentEmail = document.getElementById('auth-email')?.value.trim() || '';
    if (emailInput && !emailInput.value) emailInput.value = currentEmail;
    const status = document.getElementById('forgot-password-status');
    if (status) { status.textContent = ''; status.style.display = 'none'; }
    modal.style.display = 'flex';
    emailInput?.focus();
  };

  window.sendForgotPassword = async function() {
    const emailInput = document.getElementById('forgot-password-email');
    const status = document.getElementById('forgot-password-status');
    const email = emailInput?.value.trim().toLowerCase() || '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (status) { status.textContent = 'Unesi ispravnu email adresu.'; status.style.color = 'var(--danger)'; status.style.display = 'block'; }
      return;
    }
    const button = document.querySelector('[data-action="send-forgot-password"]');
    if (button) { button.disabled = true; button.textContent = 'Šaljem…'; }
    try {
      await sendPasswordResetEmail(auth, email, { url: `${window.location.origin}/`, handleCodeInApp: false });
      if (status) {
        status.textContent = 'Ako taj GymLeader nalog postoji, na email je poslat link za novu lozinku. Provjeri i Spam folder.';
        status.style.color = 'var(--primary)';
        status.style.display = 'block';
      }
    } catch (error) {
      console.error('Password reset diagnostic:', error?.code || error);
      if (status) {
        status.textContent = error?.code === 'auth/too-many-requests'
          ? 'Previše pokušaja. Sačekaj malo pa pokušaj ponovo.'
          : 'Slanje linka trenutno nije uspjelo. Provjeri email i pokušaj ponovo.';
        status.style.color = 'var(--danger)';
        status.style.display = 'block';
      }
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Pošalji link'; }
    }
  };

  function renderLegalDocument(documentName = 'terms') {
    const isPrivacy = documentName === 'privacy';
    document.getElementById('legal-terms-document')?.toggleAttribute('hidden', isPrivacy);
    document.getElementById('legal-privacy-document')?.toggleAttribute('hidden', !isPrivacy);
    document.querySelectorAll('.legal-document-tab').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.legalDocument === (isPrivacy ? 'privacy' : 'terms'));
    });
  }

  window.openLegalDocuments = function(documentName = 'terms') {
    const modal = document.getElementById('legal-documents-modal');
    if (!modal) return;
    renderLegalDocument(documentName);
    modal.style.display = 'flex';
  };

  function updateLegalAcceptanceButton() {
    const terms = document.getElementById('accept-terms-checkbox')?.checked;
    const privacy = document.getElementById('accept-privacy-checkbox')?.checked;
    const button = document.getElementById('accept-legal-button');
    if (button) button.disabled = !(terms && privacy);
  }

  function getLegalAcceptanceCacheKey(userId) {
    return `${LEGAL_ACCEPTANCE_CACHE_PREFIX}${userId}`;
  }

  function hasAcceptedCurrentLegalVersion(profile) {
    return profile?.termsVersion === LEGAL_DOCUMENT_VERSION
      && profile?.privacyVersion === LEGAL_DOCUMENT_VERSION;
  }

  function readLegalAcceptanceCache(userId) {
    if (!userId) return false;
    try {
      const cached = JSON.parse(localStorage.getItem(getLegalAcceptanceCacheKey(userId)) || 'null');
      return cached?.userId === userId
        && cached?.termsVersion === LEGAL_DOCUMENT_VERSION
        && cached?.privacyVersion === LEGAL_DOCUMENT_VERSION;
    } catch {
      return false;
    }
  }

  function writeLegalAcceptanceCache(userId, profile) {
    if (!userId || !hasAcceptedCurrentLegalVersion(profile)) return;
    try {
      localStorage.setItem(getLegalAcceptanceCacheKey(userId), JSON.stringify({
        userId,
        termsVersion: LEGAL_DOCUMENT_VERSION,
        privacyVersion: LEGAL_DOCUMENT_VERSION,
        cachedAt: Date.now()
      }));
    } catch (error) {
      console.warn('Lokalna potvrda pravila nije mogla biti sačuvana:', error);
    }
  }

  function clearLegalAcceptanceCache(userId) {
    if (!userId) return;
    try {
      localStorage.removeItem(getLegalAcceptanceCacheKey(userId));
    } catch (error) {
      console.warn('Lokalna potvrda pravila nije mogla biti uklonjena:', error);
    }
  }

  function showLegalAcceptanceIfRequired() {
    if (!currentUser) return;
    // A failed Firestore read while offline must not turn a previously accepted
    // document into a new required consent flow. The cache is scoped to this UID
    // and is used only while the profile cannot be read at all.
    const accepted = profileReadSucceeded
      ? hasAcceptedCurrentLegalVersion(currentProfileData)
      : readLegalAcceptanceCache(currentUser.uid);
    const modal = document.getElementById('legal-acceptance-modal');
    if (!modal) return;
    if (accepted) {
      modal.style.display = 'none';
      return;
    }
    document.getElementById('accept-terms-checkbox').checked = false;
    document.getElementById('accept-privacy-checkbox').checked = false;
    const status = document.getElementById('legal-acceptance-status');
    if (status) status.textContent = '';
    updateLegalAcceptanceButton();
    modal.style.display = 'flex';
  }

  window.acceptLegalDocuments = async function() {
    if (!currentUser) return;
    if (!document.getElementById('accept-terms-checkbox')?.checked || !document.getElementById('accept-privacy-checkbox')?.checked) return;

    const button = document.getElementById('accept-legal-button');
    const status = document.getElementById('legal-acceptance-status');
    const acceptedAt = new Date().toISOString();
    if (button) { button.disabled = true; button.textContent = 'Čuvanje…'; }
    if (status) status.textContent = '';

    try {
      const profile = {
        fullName: currentProfileData?.fullName || currentUser.displayName || 'Korisnik',
        email: currentUser.email || currentProfileData?.email || '',
        createdAt: currentProfileData?.createdAt || acceptedAt,
        termsVersion: LEGAL_DOCUMENT_VERSION,
        termsAcceptedAt: acceptedAt,
        privacyVersion: LEGAL_DOCUMENT_VERSION,
        privacyAcceptedAt: acceptedAt
      };
      await setDoc(doc(db, 'users', currentUser.uid), profile, { merge: true });
      currentProfileData = { ...(currentProfileData || {}), ...profile };
      writeLegalAcceptanceCache(currentUser.uid, currentProfileData);
      document.getElementById('legal-acceptance-modal').style.display = 'none';
      showGenderProfileGateIfRequired();
      ShowToast('Hvala — možeš nastaviti u GymLeader.');
    } catch (error) {
      console.error('Legal acceptance diagnostic:', error);
      if (status) {
        status.textContent = 'Potvrdu trenutno nije moguće sačuvati. Provjeri internet i pokušaj ponovo.';
        status.style.color = 'var(--danger)';
      }
    } finally {
      if (button) { button.textContent = '3. Prihvati i nastavi'; updateLegalAcceptanceButton(); }
    }
  };

  onAuthStateChanged(auth, async (user) => {
    const logoutBtn = document.getElementById('logout-btn');
    const bottomNav = document.getElementById('bottom-nav');
    const mailDisplay = document.getElementById('user-email-display');

    if (user) {
      dismissFirstVisitPrompt();
      if (currentUser && currentUser.uid !== user.uid) {
        activeMealPlan = null;
        activeMealPlanOptions = null;
        savedMealPlans = [];
        savedMealPlansLoaded = false;
        pendingMealPlanDeleteId = null;
        renderMealPlan();
        renderSavedMealPlans();
      }
      currentUser = user;
      
      if (bottomNav) bottomNav.style.display = 'flex';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      
      if (mailDisplay) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          profileReadSucceeded = true;
          currentProfileData = userDoc.exists() ? userDoc.data() : null;
          if (hasAcceptedCurrentLegalVersion(currentProfileData)) {
            writeLegalAcceptanceCache(user.uid, currentProfileData);
          } else if (navigator.onLine) {
            clearLegalAcceptanceCache(user.uid);
          }
          if (userDoc.exists() && userDoc.data().fullName) {
            mailDisplay.innerText = userDoc.data().fullName;
          } else {
            mailDisplay.innerText = user.email;
          }
        } catch {
          profileReadSucceeded = false;
          currentProfileData = null;
          mailDisplay.innerText = user.email;
        }
        mailDisplay.style.display = 'inline-block';
      }

      showLegalAcceptanceIfRequired();
      if (hasAcceptedCurrentLegalVersion(currentProfileData)) showGenderProfileGateIfRequired();

      await loadPendingWorkouts(user.uid);
      await loadCloudData();
      await syncPendingWorkouts();
      listenToUserRoutines(user.uid);
      switchTab('dashboard');
      ensureInAppHistory();
    } else {
      if (routinesUnsubscribe) {
        routinesUnsubscribe();
        routinesUnsubscribe = null;
      }
      currentUser = null;
      currentProfileData = null;
      activeMealPlan = null;
      activeMealPlanOptions = null;
      savedMealPlans = [];
      savedMealPlansLoaded = false;
      pendingMealPlanDeleteId = null;
      profileReadSucceeded = false;
      document.getElementById('legal-acceptance-modal')?.style.setProperty('display', 'none');
      document.getElementById('gender-required-modal')?.style.setProperty('display', 'none');
      document.getElementById('profile-required-modal')?.style.setProperty('display', 'none');
      document.getElementById('legal-documents-modal')?.style.setProperty('display', 'none');
      navigationGuardReady = false;
      userRoutines = [];
      if (bottomNav) bottomNav.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (mailDisplay) mailDisplay.style.display = 'none';
      switchTab('login');
      showFirstVisitPromptIfNeeded();
    }
    hideAuthBootScreen();
  });

  window.handleLogout = async function() {
    const logoutMessage = genderText('Odjavio si se.', 'Odjavila si se.', 'Odjava je uspješna.');
    try {
      await signOut(auth);
      ShowToast(logoutMessage);
    } catch (error) {
      ShowToast('Odjava nije uspjela. Pokušaj ponovo.', 'error');
      console.error('Odjava nije uspjela:', error);
    }
  };

  function formatDateClean(isoString, includeYear = true) {
    if (!isoString) return translateUiText('Nedavno');
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return translateUiText('Nedavno');
    const locale = { sr: 'sr-Latn-RS', en: 'en-GB', de: 'de-DE' }[getCurrentLanguage()] || 'sr-Latn-RS';
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric', month: 'short', ...(includeYear ? { year: 'numeric' } : {})
    }).format(d);
  }

  window.vibrate = function(ms = 35) {
    if ('vibrate' in navigator) navigator.vibrate(ms);
  };

  function scrollAppToTop() {
    // Mobile browsers can keep the previous scroll position when a view is swapped.
    // Reset both possible scroll containers so the sticky header starts at the top.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  window.switchTab = function(tabId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const targetView = document.getElementById(`view-${tabId}`);
    if (targetView) targetView.classList.add('active');

    const navBtns = document.querySelectorAll('.nav-item');
    const indexMap = { dashboard: 0, workouts: 1, analytics: 2, body: 2, food: 2, history: 2, progress: 2, settings: 3 };
    if (indexMap[tabId] !== undefined && navBtns[indexMap[tabId]]) {
      navBtns[indexMap[tabId]].classList.add('active');
    }

    if (tabId === 'history') renderHistory();
    if (tabId === 'dashboard') { checkDraftState(); renderDashboard(); }
    if (tabId === 'workouts') renderWorkouts();
    if (tabId === 'analytics') setupAnalyticsUI();
    if (tabId === 'body') {
      const toggle = document.getElementById('body-tracking-toggle');
      if (toggle) toggle.checked = bodyTrackingEnabled();
      loadBodyMeasurements();
    }
    if (tabId === 'food') { loadFoodEntriesForSelectedDay(); loadSavedMealPlans(); }
    if (tabId === 'settings') renderProfileSettings();

    if (tabId === 'dashboard' || tabId === 'login') {
      scrollAppToTop();
      requestAnimationFrame(scrollAppToTop);
    }
  };

  window.goHome = function() {
    window.switchTab(currentUser ? 'dashboard' : 'login');
  };

  function ensureInAppHistory() {
    if (navigationGuardReady) return;

    const appState = { gymLeader: true };
    history.replaceState(appState, '', location.href);
    history.pushState(appState, '', location.href);
    navigationGuardReady = true;
  }

  window.addEventListener('popstate', () => {
    if (!currentUser) return;
    window.goHome();
    history.pushState({ gymLeader: true }, '', location.href);
  });

  function getRoutineDisplayName(name) {
    return String(name || '').split(' + ').map((part) => translateUiText(part)).join(' + ');
  }

  window.renderWorkouts = function() {
    const container = document.getElementById('workout-list');
    if (!container) return;
    if (currentUser && userRoutines.length > 0) writeRoutineCache(currentUser.uid, userRoutines);
    const activeRoutines = userRoutines.filter((routine) => routine.isArchived !== true);
    const archivedRoutines = userRoutines.filter((routine) => routine.isArchived === true);
    const visibleRoutines = sortRoutinesForDisplay(activeRoutines);

    let html = `
      <div class="routine-toolbar">
        <button class="btn btn-secondary routine-generator-button" data-action="open-plan-generator" type="button">
          ✦ Predloži plan za mene
        </button>
        <button class="btn btn-purple routine-create-button" data-action="open-create-routine">
          ➕ Napravi plan treninga
        </button>
      </div>
      ${userRoutines.length > 0 ? `
        <button class="routine-manage-link" data-action="toggle-routine-edit-mode" type="button">
          ${routineEditMode ? '✓ Gotovo s uređivanjem' : '✎ Uredi planove'}
        </button>
      ` : ''}
    `;

    if (visibleRoutines.length === 0) {
      html += `
        <div class="card routine-empty-state">
          <p class="routine-empty-title">Još nemaš plan treninga.</p>
          <p class="routine-empty-text">Napravi svoj prvi plan, nazovi ga kako želiš i dodaj vježbe.</p>
        </div>
      `;
    } else {
      html += visibleRoutines.map(w => {
        const emoji = w.emoji || getEmojiForRoutine(w.name);
        const exCount = w.exercises ? w.exercises.length : 0;
        return `
          <div class="card flex-between">
            <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 4px;">${w.emoji ? `${escapeHtml(emoji)} ` : ''}${escapeHtml(getRoutineDisplayName(w.name))} ${w.isFavorite ? '<span class="routine-favorite-mark" title="Omiljeni plan">★</span>' : ''}</h3>
              <p style="color: var(--text-muted); font-size: 0.85rem;">
                ${exCount > 0 ? `${exCount} ${translateUiText(exCount === 1 ? 'vježba' : 'vježbi')}` : translateUiText('Prazan trening - sam dodaj vježbe')}
              </p>
              ${w.isArchived ? `<span class="routine-archived-badge">${escapeHtml(translateUiText('Arhiviran'))}</span>` : ''}${Array.isArray(w.scheduleDays) && w.scheduleDays.length ? `<span class="routine-schedule-hint">${escapeHtml(translateUiText('Raspored:'))} ${w.scheduleDays.map((day) => translateUiText(routineWeekdayLabels[Number(day)])).filter(Boolean).join(' · ')}</span>` : ''}
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              ${routineEditMode
                ? `<button class="btn btn-secondary" style="padding:10px 14px; font-size:0.85rem;" data-action="open-edit-routine" data-routine-id="${escapeHtml(w.id)}">✎ Uredi</button>`
                : `<button class="btn btn-start-card" data-action="start-routine" data-routine-id="${escapeHtml(w.id)}">Započni ovaj trening →</button>`}
            </div>
          </div>
        `;
      }).join('');
    }

    if (routineEditMode && archivedRoutines.length) {
      html += `
        <button class="routine-manage-link routine-archive-toggle" data-action="toggle-archived-routines" type="button">${showArchivedRoutines ? 'Sakrij arhivu' : `Prikaži arhivu (${archivedRoutines.length})`}</button>
        ${showArchivedRoutines ? `<section class="routine-archive-section" aria-label="Arhivirani planovi">
          <div class="routine-archive-heading"><div><span class="settings-eyebrow">ARHIVA</span><h3>Arhivirani planovi</h3><p>Ovi planovi nisu prikazani među aktivnim treninzima.</p></div></div>
          ${sortRoutinesForDisplay(archivedRoutines).map(w => {
            const emoji = w.emoji || getEmojiForRoutine(w.name);
            const exCount = w.exercises ? w.exercises.length : 0;
            return `<div class="card flex-between routine-archived-card"><div><h3 style="font-size: 1.05rem; font-weight: 800; margin-bottom: 4px;">${w.emoji ? `${escapeHtml(emoji)} ` : ''}${escapeHtml(getRoutineDisplayName(w.name))}</h3><p style="color: var(--text-muted); font-size: 0.85rem;">${exCount} ${escapeHtml(translateUiText(exCount === 1 ? 'vježba' : 'vježbi'))}</p><span class="routine-archived-badge">Arhiviran</span></div><div style="display: flex; gap: 8px; align-items: center;"><button class="btn btn-secondary" style="padding:10px 14px; font-size:0.85rem;" data-action="open-edit-routine" data-routine-id="${escapeHtml(w.id)}">✎ Uredi</button></div></div>`;
          }).join('')}
        </section>` : ''}`;
    }

    container.innerHTML = html;
    if (routineEditMode) {
      container.querySelectorAll('[data-action="open-edit-routine"]').forEach((editButton) => {
        editButton.hidden = true;
        const routine = userRoutines.find((item) => item.id === editButton.dataset.routineId);
        if (!routine || editButton.parentElement.querySelector('.routine-card-actions')) return;
        editButton.parentElement.insertAdjacentHTML('beforeend', `<div class="routine-card-actions"><button class="btn btn-secondary" data-action="open-edit-routine" data-routine-id="${escapeHtml(routine.id)}">✎ Uredi</button><button class="btn btn-secondary" data-action="duplicate-routine" data-routine-id="${escapeHtml(routine.id)}">Kopiraj</button><button class="btn btn-secondary" data-action="toggle-routine-favorite" data-routine-id="${escapeHtml(routine.id)}">${routine.isFavorite ? '★ Omiljeni' : '☆ Omiljeni'}</button><button class="btn btn-secondary" data-action="toggle-routine-archive" data-routine-id="${escapeHtml(routine.id)}">${routine.isArchived ? 'Vrati' : 'Arhiviraj'}</button></div>`);
      });
    }
  };

  function getRoutineScheduleSortValue(routine) {
    const firstDay = Array.isArray(routine?.scheduleDays) ? Number(routine.scheduleDays[0]) : NaN;
    if (!Number.isInteger(firstDay) || firstDay < 0 || firstDay > 6) return null;
    return firstDay === 0 ? 7 : firstDay;
  }

  function sortRoutinesForDisplay(routines) {
    return [...routines].sort((a, b) => {
      const aDay = getRoutineScheduleSortValue(a);
      const bDay = getRoutineScheduleSortValue(b);
      if (aDay === null && bDay === null) return 0;
      if (aDay === null) return 1;
      if (bDay === null) return -1;
      return aDay - bDay;
    });
  }

  // UČITAVANJE UŽIVO (StreamBuilder / onSnapshot) - Odgovara novim pravilima
  function getRoutineCacheKey(userId) {
    return `gym_routines_cache_v1_${userId}`;
  }

  function readRoutineCache(userId) {
    try {
      const raw = localStorage.getItem(getRoutineCacheKey(userId));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeRoutineCache(userId, routines) {
    try {
      localStorage.setItem(getRoutineCacheKey(userId), JSON.stringify(routines));
    } catch (error) {
      console.warn('Lokalni cache rutina nije mogao biti sačuvan:', error);
    }
  }

  function listenToUserRoutines(userId) {
    if (routinesUnsubscribe) routinesUnsubscribe();
    const localRoutines = readRoutineCache(userId);
    userRoutines = localRoutines;
    renderWorkouts();

    const routinesRef = collection(db, "routines");
    const q = query(routinesRef, where("userId", "==", userId));

    routinesUnsubscribe = onSnapshot(q, (querySnapshot) => {
      const nextRoutines = [];
      querySnapshot.forEach((docSnap) => {
        nextRoutines.push({ id: docSnap.id, ...docSnap.data() });
      });
      const isOfflineSnapshot = querySnapshot.metadata?.fromCache === true || !navigator.onLine;
      if (isOfflineSnapshot && nextRoutines.length === 0 && localRoutines.length > 0) {
        userRoutines = localRoutines;
        renderWorkouts();
        return;
      }
      userRoutines = nextRoutines;
      writeRoutineCache(userId, userRoutines);
      renderWorkouts();
    }, (error) => {
      console.error("Greška u uživo slušanju rutina: ", error);
    });
  }

  window.deleteRoutine = async function(routineId) {
    if (await showConfirm("Da li ste sigurni da želite obrisati ovu rutinu/dan?")) {
      try {
        await deleteDoc(doc(db, "routines", routineId));
        ShowToast("Rutina uspješno obrisana!");
      } catch (error) {
        ShowToast("Greška pri brisanju: " + error.message, 'error');
      }
    }
  };

  window.toggleRoutineEditMode = function() {
    routineEditMode = !routineEditMode;
    if (!routineEditMode) showArchivedRoutines = false;
    window.renderWorkouts();
  };

  window.toggleArchivedRoutines = function() {
    showArchivedRoutines = !showArchivedRoutines;
    window.renderWorkouts();
  };

  function updateRoutineInMemory(routineId, changes) {
    userRoutines = userRoutines.map((routine) => routine.id === routineId ? { ...routine, ...changes } : routine);
    if (currentUser) writeRoutineCache(currentUser.uid, userRoutines);
    window.renderWorkouts();
  }

  window.duplicateRoutine = async function(routineId) {
    const source = userRoutines.find((routine) => routine.id === routineId);
    if (!source || !currentUser) return;
    const copy = {
      userId: currentUser.uid,
      emoji: source.emoji || '',
      name: `${source.name} (kopija)`.slice(0, 120),
      exercises: Array.isArray(source.exercises) ? source.exercises : [],
      createdAt: new Date().toISOString(),
      isArchived: false,
      isFavorite: false,
      scheduleDays: []
    };
    try {
      await addDoc(collection(db, 'routines'), copy);
      ShowToast('Plan je kopiran.');
    } catch (error) {
      console.error('Routine duplicate diagnostic:', error);
      ShowToast('Plan nije moguće kopirati. Provjeri internet i pokušaj ponovo.', 'error');
    }
  };

  window.toggleRoutineFavorite = async function(routineId) {
    const routine = userRoutines.find((item) => item.id === routineId);
    if (!routine) return;
    const changes = { isFavorite: routine.isFavorite !== true };
    try {
      await updateDoc(doc(db, 'routines', routineId), changes);
      updateRoutineInMemory(routineId, changes);
    } catch (error) {
      ShowToast('Omiljeni plan nije moguće sačuvati.', 'error');
    }
  };

  window.toggleRoutineArchive = async function(routineId) {
    const routine = userRoutines.find((item) => item.id === routineId);
    if (!routine) return;
    const archived = routine.isArchived !== true;
    const changes = { isArchived: archived, archivedAt: archived ? new Date().toISOString() : '' };
    if (archived) showArchivedRoutines = false;
    updateRoutineInMemory(routineId, changes);
    try {
      await updateDoc(doc(db, 'routines', routineId), changes);
      ShowToast(archived ? 'Plan je arhiviran.' : 'Plan je vraćen među aktivne planove.');
    } catch (error) {
      updateRoutineInMemory(routineId, { isArchived: routine.isArchived === true, archivedAt: routine.archivedAt || '' });
      ShowToast('Arhiviranje plana nije moguće sačuvati.', 'error');
    }
  };

  window.openEditRoutineModal = function(routineId) {
    const routine = userRoutines.find((item) => item.id === routineId);
    if (!routine) return;

    editingRoutineId = routine.id;
    document.getElementById('editRoutineEmojiInput').value = routine.emoji || '';
    document.getElementById('editRoutineNameInput').value = routine.name || '';
    document.querySelectorAll('input[name="edit-routine-schedule"]').forEach((input) => { input.checked = Array.isArray(routine.scheduleDays) && routine.scheduleDays.includes(input.value); });
    resetEditRoutineExerciseBuilder(routine.exercises || []);
    document.getElementById('editRoutineModal').style.display = 'flex';
  };

  window.setEditRoutineEmoji = function(emoji) {
    const input = document.getElementById('editRoutineEmojiInput');
    if (input) input.value = emoji;
  };

  window.saveRoutineEdits = async function() {
    if (!editingRoutineId) return;

    const emoji = document.getElementById('editRoutineEmojiInput').value.trim();
    const name = document.getElementById('editRoutineNameInput').value.trim();
    const exercises = getRoutineExercisesFromList('edit-routine-exercises-list');
    const scheduleDays = [...document.querySelectorAll('input[name="edit-routine-schedule"]:checked')].map((input) => input.value);

    if (!name) {
      ShowToast('Naziv plana je obavezan.', 'error');
      return;
    }

    if (exercises.length === 0) {
      ShowToast('Dodaj bar jednu vježbu u plan.', 'error');
      return;
    }

    const exerciseValidationMessage = getRoutineExerciseValidationMessage(exercises);
    if (exerciseValidationMessage) {
      ShowToast(exerciseValidationMessage, 'error');
      return;
    }

    try {
      await updateDoc(doc(db, 'routines', editingRoutineId), {
        emoji: emoji || '',
        name,
        exercises,
        scheduleDays
      });
      updateRoutineInMemory(editingRoutineId, { emoji: emoji || '', name, exercises, scheduleDays });
      document.getElementById('editRoutineModal').style.display = 'none';
      editingRoutineId = null;
      ShowToast('Izmjene su sačuvane.');
    } catch (error) {
      ShowToast('Greška pri čuvanju izmjena: ' + error.message, 'error');
    }
  };

  window.deleteEditingRoutine = async function() {
    if (!editingRoutineId) return;
    if (!(await showConfirm('Obrisati cijeli dan i sve vježbe iz njega?'))) return;

    try {
      await deleteDoc(doc(db, 'routines', editingRoutineId));
      document.getElementById('editRoutineModal').style.display = 'none';
      editingRoutineId = null;
      routineEditMode = false;
      ShowToast('Plan je obrisan.');
    } catch (error) {
      ShowToast('Greška pri brisanju dana: ' + error.message, 'error');
    }
  };

  window.handleKgInput = function(inputEl) {
    const block = inputEl.closest('.exercise-block');
    if (!block) return;

    const kgInputs = block.querySelectorAll('.set-kg');
    
    if (kgInputs.length > 0 && kgInputs[0] === inputEl) {
      const val = inputEl.value;
      for (let i = 1; i < kgInputs.length; i++) {
        if (kgInputs[i].value === '' || kgInputs[i].dataset.autofilled === 'true') {
          kgInputs[i].value = val;
          kgInputs[i].dataset.autofilled = 'true';
          checkPR(kgInputs[i]);
        }
      }
    } else {
      inputEl.dataset.autofilled = 'false';
    }

    checkPR(inputEl);
    updateProgress();
    saveWorkoutDraft();
  };

  window.openPlanCreationChoice = function() {
    if (!currentUser) {
      ShowToast("Morate biti prijavljeni!", 'error');
      return;
    }
    if (!hasAcceptedCurrentLegalVersion(currentProfileData)) {
      showLegalAcceptanceIfRequired();
      return;
    }
    document.getElementById('plan-creation-choice-modal')?.style.setProperty('display', 'flex');
  };

  window.openCreateRoutineModal = function() {
    if (!currentUser) return;
    const emojiInput = document.getElementById('newRoutineEmojiInput');
    if (emojiInput) emojiInput.value = '';
    document.getElementById('newRoutineNameInput').value = '';
    pendingGeneratedPlanId = null;
    document.querySelectorAll('input[name="new-routine-schedule"]').forEach((input) => { input.checked = false; });
    resetRoutineExerciseBuilder();
    const heading = document.querySelector('#createRoutineModal h3');
    const intro = document.querySelector('#createRoutineModal .routine-builder-intro');
    const saveButton = document.querySelector('#createRoutineModal [data-action="submit-new-routine"]');
    if (heading) heading.textContent = '➕ Napravi plan treninga';
    if (intro) intro.textContent = 'Nazovi plan, pronađi vježbe i sačuvaj.';
    if (saveButton) saveButton.textContent = 'Sačuvaj plan';
    document.getElementById('createRoutineModal').style.display = 'flex';
    const picker = document.querySelector('[data-library-picker-for="new-routine-exercises-list"]');
    if (picker) {
      picker.hidden = false;
      renderExerciseLibraryPicker(picker);
      requestAnimationFrame(() => document.getElementById('newRoutineNameInput')?.focus());
    }
  };

  function resetRoutineExerciseBuilder() {
    const list = document.getElementById('new-routine-exercises-list');
    if (!list) return;
    list.innerHTML = '';
  }

  function normalizeRoutineExercise(exercise) {
    const name = typeof exercise === 'string' ? exercise.trim() : String(exercise?.name || '').trim();
    const savedMeasurementType = typeof exercise === 'object' ? exercise?.measurementType : '';
    const libraryExercise = resolveLibraryExercise(exercise) || resolveLibraryExercise(name);
    const validTypes = ['weight_reps', 'reps', 'seconds', 'cardio'];
    const measurementType = validTypes.includes(savedMeasurementType)
      ? savedMeasurementType
      : libraryExercise?.measurementType || getExerciseMeasurementType(exercise, name);
    const defaults = getExerciseProgressionDefaults(measurementType, name, libraryExercise);
    const source = typeof exercise === 'object' && exercise ? exercise : {};

    return {
      name,
      measurementType,
      setCount: readExerciseSetting(source.setCount, measurementType === 'cardio' ? 1 : 3, 1, 10),
      repRangeMin: readExerciseSetting(source.repRangeMin, defaults.repRangeMin, 1, 100),
      repRangeMax: readExerciseSetting(source.repRangeMax, defaults.repRangeMax, 1, 100),
      weightIncrement: readExerciseSetting(source.weightIncrement, defaults.weightIncrement, 0.25, 100),
      timeIncrement: readExerciseSetting(source.timeIncrement, defaults.timeIncrement, 1, 60),
      restSeconds: readExerciseSetting(source.restSeconds, defaults.restSeconds, 0, 1800)
    };
  }

  function readExerciseSetting(value, fallback, minimum, maximum) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
  }

  function inferRepRangeFromName(name) {
    const rangeMatch = String(name || '').match(/(?:\d+\s*[x×]\s*)?(\d+)\s*[-–]\s*(\d+)/i);
    if (rangeMatch) return { min: Number(rangeMatch[1]), max: Number(rangeMatch[2]) };
    const fixedMatch = String(name || '').match(/(?:\d+\s*[x×]\s*)(\d+)/i);
    if (fixedMatch) return { min: Number(fixedMatch[1]), max: Number(fixedMatch[1]) };
    return null;
  }

  function getExerciseProgressionDefaults(measurementType, name = '', libraryExercise = null) {
    if (libraryExercise?.measurementType === measurementType && libraryExercise.defaults) {
      return libraryExercise.defaults;
    }
    const inferredRange = inferRepRangeFromName(name);
    const exerciseName = String(name || '').toLocaleLowerCase();
    const isLegPress = exerciseName.includes('leg press') || exerciseName.includes('legpress') || exerciseName.includes('potisak nogama');
    if (measurementType === 'weight_reps') {
      return { repRangeMin: inferredRange?.min || 8, repRangeMax: inferredRange?.max || 12, weightIncrement: isLegPress ? 5 : 2.5, timeIncrement: 5, restSeconds: 120 };
    }
    if (measurementType === 'reps') {
      return { repRangeMin: inferredRange?.min || 8, repRangeMax: inferredRange?.max || 15, weightIncrement: 2.5, timeIncrement: 5, restSeconds: 90 };
    }
    if (measurementType === 'seconds') {
      return { repRangeMin: 0, repRangeMax: 0, weightIncrement: 2.5, timeIncrement: 5, restSeconds: 60 };
    }
    return { repRangeMin: 0, repRangeMax: 0, weightIncrement: 2.5, timeIncrement: 1, restSeconds: 60 };
  }

  const exerciseLibraryLabels = {
    chest: 'Grudi', upper_chest: 'Gornje grudi', back: 'Leđa', lats: 'Latovi', upper_back: 'Gornja leđa', middle_back: 'Srednja leđa', lower_back: 'Donja leđa',
    shoulders: 'Ramena', front_delts: 'Prednje rame', side_delts: 'Bočno rame', rear_delts: 'Zadnje rame', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Podlaktice',
    quadriceps: 'Kvadriceps', hamstrings: 'Zadnja loža', glutes: 'Gluteus', calves: 'Listovi', adductors: 'Aduktori', abductors: 'Abduktori',
    abs: 'Stomak', core: 'Trup', obliques: 'Kosi stomak', hip_flexors: 'Pregibači kuka', full_body: 'Cijelo tijelo', cardio: 'Kardio',
    barbell: 'Šipka', dumbbells: 'Bučice', kettlebell: 'Kettlebell', machine: 'Mašina', cable_machine: 'Sajla', bench: 'Klupa', incline_bench: 'Kosa klupa',
    bodyweight: 'Vlastita težina', pull_up_bar: 'Šipka za zgibove', dip_bars: 'Razboj', resistance_band: 'Guma', leg_press_machine: 'Leg press',
    assisted_machine: 'Potpomognuta mašina', rack: 'Rack', plate: 'Ploča', ab_wheel: 'Ab wheel', treadmill: 'Traka', stationary_bike: 'Sobni bicikl',
    rowing_machine: 'Veslač', elliptical: 'Eliptik', stair_climber: 'Steper', jump_rope: 'Vijača', outdoors: 'Vani', pool: 'Bazen', bicycle: 'Bicikl',
    box: 'Kutija', rings: 'Karike', wall: 'Zid', bar: 'Šipka'
  };

  function exerciseLibraryLabel(value) {
    return exerciseLibraryLabels[value] || String(value || '').replace(/_/g, ' ');
  }

  function normalizeLibrarySearch(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
  }

  function fillExerciseLibraryFilters(picker) {
    if (!picker || picker.dataset.filtersReady === 'true') return;
    const fill = (selector, values, firstLabel) => {
      const select = picker.querySelector(selector);
      if (!select) return;
      select.innerHTML = `<option value="">${firstLabel}</option>${[...values].sort().map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(exerciseLibraryLabel(value))}</option>`).join('')}`;
    };
    fill('.exercise-library-muscle', new Set(EXERCISE_LIBRARY.flatMap((item) => item.muscles)), 'Svi mišići');
    fill('.exercise-library-equipment', new Set(EXERCISE_LIBRARY.flatMap((item) => item.equipment)), 'Sva oprema');
    picker.dataset.filtersReady = 'true';
  }

  function getExerciseLibraryTypeLabel(type) {
    return { weight_reps: 'Kilaža + ponavljanja', reps: 'Samo ponavljanja', seconds: 'Trajanje', cardio: 'Kardio' }[type] || type;
  }

  function renderExerciseLibraryPicker(picker) {
    if (!picker) return;
    fillExerciseLibraryFilters(picker);
    const queryText = normalizeLibrarySearch(picker.querySelector('.exercise-library-search')?.value);
    const muscle = picker.querySelector('.exercise-library-muscle')?.value || '';
    const equipment = picker.querySelector('.exercise-library-equipment')?.value || '';
    const place = picker.querySelector('.exercise-library-place')?.value || '';
    const language = getCurrentLanguage();
    const hasSearchOrFilter = Boolean(queryText || muscle || equipment || place);
    const matches = EXERCISE_LIBRARY.filter((item) => {
      const text = normalizeLibrarySearch([...Object.values(item.names), item.instruction, ...item.muscles, ...item.equipment].join(' '));
      return (!queryText || text.includes(queryText))
        && (!muscle || item.muscles.includes(muscle))
        && (!equipment || item.equipment.includes(equipment))
        && (!place || getLibraryExerciseTrainingPlaces(item).includes(place));
    });
    const count = picker.querySelector('.exercise-library-count');
    const results = picker.querySelector('.exercise-library-results');
    if (!hasSearchOrFilter) {
      if (count) count.textContent = 'Upiši naziv vježbe ili otvori filtere.';
      if (results) results.innerHTML = '<p class="exercise-library-empty">Počni pretragom, na primjer: čučanj, bench press ili plank.</p>';
      return;
    }
    if (count) count.textContent = matches.length ? `${matches.length} ${matches.length === 1 ? 'vježba' : 'vježbi'} pronađeno` : 'Nema vježbi za ovaj izbor.';
    if (!results) return;
    if (!matches.length) {
      const customName = picker.querySelector('.exercise-library-search')?.value.trim() || '';
      const addCustom = customName
        ? `<button class="btn btn-secondary" type="button" data-action="add-routine-exercise" data-exercise-name="${escapeHtml(customName)}">Dodaj svoju vježbu</button>`
        : '';
      results.innerHTML = `<p class="exercise-library-empty">Nema rezultata. Upiši svoju vježbu i dodaj je u plan.</p>${addCustom}`;
      return;
    }
    const targetList = picker.dataset.libraryPickerFor;
    results.innerHTML = matches.map((item) => {
      const defaults = item.defaults;
      const tracking = item.measurementType === 'weight_reps' || item.measurementType === 'reps'
        ? `${defaults.repRangeMin}–${defaults.repRangeMax} ponavljanja`
        : item.measurementType === 'seconds' ? `Korak vremena ${defaults.timeIncrement} sek` : `Korak vremena ${defaults.timeIncrement} min`;
      const primaryMuscle = item.muscles[0] ? exerciseLibraryLabel(item.muscles[0]) : 'Cijelo tijelo';
      return `<article class="exercise-library-result"><div><h4>${escapeHtml(getLibraryExerciseName(item, language))}</h4><p class="exercise-library-tags"><span>${escapeHtml(getExerciseLibraryTypeLabel(item.measurementType))}</span><span>${escapeHtml(primaryMuscle)}</span></p><details class="exercise-library-details"><summary>Detalji</summary><p>${escapeHtml(item.instruction)}</p><small>${escapeHtml(tracking)} · odmor ${defaults.restSeconds} sek · ${escapeHtml(item.equipment.map(exerciseLibraryLabel).join(' · '))}</small></details></div><button class="btn btn-secondary" type="button" data-action="add-library-exercise" data-exercise-id="${escapeHtml(item.id)}" data-target-list="${escapeHtml(targetList)}">Dodaj</button></article>`;
    }).join('');
  }

  window.toggleExerciseLibrary = function(targetList) {
    const picker = [...document.querySelectorAll('[data-library-picker-for]')]
      .find((item) => item.dataset.libraryPickerFor === targetList);
    if (!picker) return;
    picker.hidden = !picker.hidden;
    if (!picker.hidden) {
      renderExerciseLibraryPicker(picker);
      picker.querySelector('.exercise-library-search')?.focus();
    }
  };

  window.addLibraryExerciseToRoutine = function(exerciseId, targetList) {
    const item = getLibraryExerciseById(exerciseId);
    if (!item || !document.getElementById(targetList)) return;
    addRoutineExerciseRow(targetList, {
      name: getLibraryExerciseName(item, getCurrentLanguage()),
      measurementType: item.measurementType,
      ...item.defaults
    });
    ShowToast(`${getLibraryExerciseName(item, getCurrentLanguage())} je dodana u plan.`);
  };

  const generatorMuscleMap = {
    chest: ['chest', 'upper_chest'],
    back: ['back', 'lats', 'upper_back', 'middle_back'],
    legs: ['quadriceps', 'hamstrings', 'calves'],
    shoulders: ['shoulders', 'front_delts', 'side_delts', 'rear_delts'],
    arms: ['biceps', 'triceps', 'forearms'],
    glutes: ['glutes', 'abductors', 'adductors'],
    core: ['core', 'abs', 'obliques'],
    cardio: ['cardio']
  };

  const generatorGroupLabels = {
    chest: 'grudi', back: 'leđa', legs: 'noge', shoulders: 'ramena',
    arms: 'ruke', glutes: 'gluteus', core: 'stomak', cardio: 'kardio'
  };

  function getGeneratorSetCount(profile) {
    if (profile?.trainingFocus === 'strength') return profile?.experienceLevel === 'beginner' ? 3 : 4;
    if (profile?.experienceLevel === 'beginner') return 2;
    return 3;
  }

  function getGeneratorExerciseCount(profile) {
    const minutes = Number(profile?.sessionMinutes) || 60;
    let count = minutes <= 35 ? 4 : minutes <= 60 ? 5 : minutes <= 80 ? 6 : 7;
    if (profile?.experienceLevel === 'beginner') count = Math.min(count, 5);
    return count;
  }

  function getGeneratorGroups(mode, profile) {
    if (mode === 'full_body') {
      return profile?.goal === 'lose_weight'
        ? ['legs', 'chest', 'back', 'core', 'cardio', 'shoulders', 'arms']
        : ['legs', 'chest', 'back', 'shoulders', 'arms', 'core'];
    }
    const selected = Array.isArray(profile?.targetMuscleGroups) ? profile.targetMuscleGroups : [];
    const groups = selected.filter((group) => generatorMuscleMap[group]);
    return groups.length ? groups : ['legs', 'chest', 'back', 'shoulders', 'arms', 'core'];
  }

  function profileUsesFullBody(profile) {
    return Array.isArray(profile?.targetMuscleGroups) && profile.targetMuscleGroups.includes('full_body');
  }

  function getProfileValueLabel(value) {
    const labels = {
      male: 'Muško', female: 'Žensko', unspecified: 'Ne želim odgovoriti',
      lose_weight: 'Mršanje', maintain: 'Održavanje težine', gain_weight: 'Povećanje težine',
      strength: 'Povećanje snage', muscle_progress: 'Mišićni napredak', general_fitness: 'Opšta kondicija',
      gym: 'Teretana', home: 'Kod kuće', street: 'Street workout', other: 'Drugo',
      beginner: 'Početnik', intermediate: 'Srednji nivo', advanced: 'Napredni nivo',
      full_body: 'Cijelo tijelo', chest: 'Grudi', back: 'Leđa', legs: 'Noge', shoulders: 'Ramena', arms: 'Ruke', glutes: 'Gluteus', core: 'Stomak'
    };
    const label = labels[value] || value || '';
    return translateUiText(label);
  }

  const COMMON_GYM_EQUIPMENT = new Set(['bodyweight', 'dumbbells', 'barbell', 'bench', 'incline_bench', 'rack', 'cable_machine', 'machine', 'leg_press_machine']);

  function getGymEquipmentPriority(item) {
    const equipment = Array.isArray(item?.equipment) ? item.equipment : [];
    const commonCount = equipment.filter((value) => COMMON_GYM_EQUIPMENT.has(value)).length;
    if (commonCount === 0) return 0;
    return commonCount * 10 - Math.max(0, equipment.length - commonCount);
  }

  function isExerciseAvailableForProfile(item, profile) {
    const location = profile?.trainingLocation;
    if (location === 'gym') return getGymEquipmentPriority(item) > 0;
    if (!['gym', 'home', 'street'].includes(location)) return true;
    return getLibraryExerciseTrainingPlaces(item).includes(location);
  }

  function getAvoidedExerciseTokens(profile) {
    const value = normalizeLibrarySearch(profile?.avoidedExercises);
    if (!value || value.includes('nemam vjezbi') || value.includes('nema vjezbi')) return [];
    return value.split(/[\n,;]+/).map((item) => item.trim()).filter((item) => item.length >= 3);
  }

  function isExerciseAvoidedForProfile(item, profile) {
    return profileMentionsExercise(profile?.avoidedExercises, item, getAvoidedExerciseTokens(profile));
  }

  function getPreferredExerciseTokens(profile) {
    const value = normalizeLibrarySearch(profile?.preferredExercises);
    if (!value || value.includes('nemam posebnu zelju') || value.includes('nemam posebne vjezbe')) return [];
    return value.split(/[\n,;]+/).map((item) => item.trim()).filter((item) => item.length >= 3);
  }

  function profileMentionsExercise(value, item, tokens = []) {
    const profileText = normalizeLibrarySearch(value);
    if (!profileText || !item) return false;
    const names = [item.id.replace(/-/g, ' '), ...Object.values(item.names || {})]
      .map(normalizeLibrarySearch)
      .filter((name) => name.length >= 3);
    const itemText = names.join(' ');
    return names.some((name) => profileText.includes(name))
      || tokens.some((term) => itemText.includes(term) || names.some((name) => term.includes(name)));
  }

  function isExercisePreferredForProfile(item, profile) {
    return profileMentionsExercise(profile?.preferredExercises, item, getPreferredExerciseTokens(profile));
  }

  function pickGeneratorExercises(groups, profile, count, usedIds = new Set(), variationSeed = 0) {
    const selected = [];
    const selectedIds = new Set();
    const setCount = getGeneratorSetCount(profile);
    const candidates = EXERCISE_LIBRARY
      .filter((item) => isExerciseAvailableForProfile(item, profile) && !isExerciseAvoidedForProfile(item, profile))
      .sort((first, second) => {
        const preferredDifference = Number(isExercisePreferredForProfile(second, profile)) - Number(isExercisePreferredForProfile(first, profile));
        if (preferredDifference) return preferredDifference;
        return getGymEquipmentPriority(second) - getGymEquipmentPriority(first);
      });
    const addFirstMatch = (group, allowWeekReuse = false) => {
      const desiredMuscles = generatorMuscleMap[group] || [];
      const matches = candidates.filter((candidate) => !selectedIds.has(candidate.id)
        && (allowWeekReuse || !usedIds.has(candidate.id))
        && candidate.muscles.some((muscle) => desiredMuscles.includes(muscle)));
      const item = matches[(variationSeed + selected.length) % matches.length];
      if (!item) return false;
      usedIds.add(item.id);
      selectedIds.add(item.id);
      selected.push(normalizeRoutineExercise({
        name: getLibraryExerciseName(item, getCurrentLanguage()),
        measurementType: item.measurementType,
        setCount,
        ...item.defaults
      }));
      return true;
    };

    groups.forEach((group) => {
      if (selected.length < count) addFirstMatch(group);
    });
    for (const group of groups) {
      while (selected.length < count && addFirstMatch(group)) { /* fill from selected focus safely */ }
    }
    for (const group of groups) {
      while (selected.length < count && addFirstMatch(group, true)) { /* reuse across days only when needed */ }
    }
    return selected;
  }

  function getSuggestedTrainingDays(frequency) {
    const patterns = {
      1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 6],
      5: [1, 2, 4, 5, 0], 6: [1, 2, 3, 5, 6, 0], 7: [1, 2, 3, 4, 5, 6, 0]
    };
    return patterns[Math.max(1, Math.min(7, Number(frequency) || 1))] || [1];
  }

  function getGeneratorLayoutSlots(frequency) {
    const layouts = {
      4: ['upper', 'lower', 'upper', 'lower'],
      5: ['upper', 'lower', 'upper', 'lower', 'upper'],
      6: ['upper', 'lower', 'recovery', 'upper', 'lower', 'recovery'],
      7: ['upper', 'lower', 'recovery', 'upper', 'lower', 'recovery', 'recovery']
    };
    return layouts[frequency] || Array.from({ length: frequency }, () => 'full');
  }

  function getGeneratorGroupsForSlot(groups, mode, slot) {
    const everyGroup = ['legs', 'glutes', 'chest', 'back', 'shoulders', 'arms', 'core'];
    const source = mode === 'full_body' ? everyGroup : groups;
    const upper = source.filter((group) => ['chest', 'back', 'shoulders', 'arms'].includes(group));
    const lower = source.filter((group) => ['legs', 'glutes'].includes(group));
    const recovery = source.filter((group) => ['core', 'cardio'].includes(group));
    if (slot === 'upper') return upper;
    if (slot === 'lower') return lower;
    if (slot === 'recovery') return recovery;
    return source;
  }

  function buildGeneratorDaySchedule(groups, mode, days, frequency) {
    const slots = getGeneratorLayoutSlots(frequency).map((slot) => (
      getGeneratorGroupsForSlot(groups, mode, slot).length ? slot : 'full'
    ));
    if (slots.length < 2) return slots.map((slot) => ({ slot, groups: getGeneratorGroupsForSlot(groups, mode, slot) }));
    const uniquePermutations = [];
    const counts = new Map();
    slots.forEach((slot) => counts.set(slot, (counts.get(slot) || 0) + 1));
    const buildPermutation = (current) => {
      if (current.length === slots.length) {
        uniquePermutations.push([...current]);
        return;
      }
      counts.forEach((count, slot) => {
        if (!count) return;
        counts.set(slot, count - 1);
        current.push(slot);
        buildPermutation(current);
        current.pop();
        counts.set(slot, count);
      });
    };
    buildPermutation([]);
    const majorGroups = new Set(['legs', 'glutes', 'chest', 'back', 'shoulders', 'arms']);
    const areConsecutiveDays = (first, second) => {
      const distance = (Number(first) - Number(second) + 7) % 7;
      return distance === 1 || distance === 6;
    };
    const scorePermutation = (permutation) => {
      let score = 0;
      for (let first = 0; first < days.length; first += 1) {
        for (let second = first + 1; second < days.length; second += 1) {
          if (!areConsecutiveDays(days[first], days[second])) continue;
          const firstGroups = getGeneratorGroupsForSlot(groups, mode, permutation[first]);
          const secondGroups = new Set(getGeneratorGroupsForSlot(groups, mode, permutation[second]));
          const majorOverlap = firstGroups.filter((group) => majorGroups.has(group) && secondGroups.has(group)).length;
          if (majorOverlap) score += majorOverlap * 10;
          else if (permutation[first] === permutation[second]) score += 1;
        }
      }
      return score;
    };
    let best = uniquePermutations[0] || slots;
    let bestScore = scorePermutation(best);
    uniquePermutations.slice(1).forEach((permutation) => {
      const score = scorePermutation(permutation);
      if (score < bestScore) {
        best = permutation;
        bestScore = score;
      }
    });
    return best.map((slot) => ({ slot, groups: getGeneratorGroupsForSlot(groups, mode, slot) }));
  }

  function buildPersonalizedPlanSuggestions(profile, mode) {
    if (Number(profile?.trainingFrequency) < 1) return [];
    const groups = getGeneratorGroups(mode, profile);
    const exerciseCount = getGeneratorExerciseCount(profile);
    const frequency = Math.max(1, Math.min(7, Number(profile.trainingFrequency) || 1));
    const suggestedDays = getSuggestedTrainingDays(frequency);
    const daySchedule = buildGeneratorDaySchedule(groups, mode, suggestedDays, frequency);
    const usedIds = new Set();
    let skippedDays = 0;
    let shortenedDays = 0;
    const regionCounts = { upper: 0, lower: 0, recovery: 0, full: 0 };

    const plans = suggestedDays.map((day, index) => {
      const scheduleEntry = daySchedule[index] || { slot: 'full', groups };
      const planGroups = scheduleEntry.groups;
      if (!planGroups.length) {
        skippedDays += 1;
        return null;
      }
      const exercises = pickGeneratorExercises(planGroups, profile, exerciseCount, usedIds);
      if (!exercises.length) {
        skippedDays += 1;
        return null;
      }
      if (exercises.length < exerciseCount) shortenedDays += 1;
      const slotIndex = regionCounts[scheduleEntry.slot]++;
      const groupTitle = scheduleEntry.slot === 'upper' ? `Gornji dio ${String.fromCharCode(65 + slotIndex)}`
        : scheduleEntry.slot === 'lower' ? `Donji dio ${String.fromCharCode(65 + slotIndex)}`
        : scheduleEntry.slot === 'recovery' ? (slotIndex ? 'Kardio i oporavak' : 'Trup i kondicija')
        : mode === 'full_body' ? `Cijelo tijelo ${String.fromCharCode(65 + slotIndex)}`
        : planGroups.map((group) => generatorGroupLabels[group]).join(' + ');
      return {
        id: `generated-${Date.now()}-${index}`,
        emoji: profile.trainingLocation === 'street' ? '🏃' : profile.trainingLocation === 'home' ? '🏠' : '🏋️',
        name: groupTitle,
        exercises,
        groupTitle,
        scheduleDays: [String(day)],
        generatorGroups: planGroups,
        generationSeed: 0
      };
    }).filter(Boolean);

    generatedPlanWarning = skippedDays || shortenedDays
      ? 'Odabrane mišićne grupe, izbjegnute vježbe ili dostupna oprema ne dopuštaju pun raspored za svaki izabrani dan. Prikazani su samo planovi za koje postoji dovoljno odgovarajućih vježbi.'
      : '';
    return plans;
  }

  function describeGeneratorProfile(profile, mode) {
    const location = { gym: 'teretanu', home: 'kuću', street: 'street workout', other: 'drugo mjesto' }[profile?.trainingLocation] || 'svoje mjesto treninga';
    const duration = Number(profile?.sessionMinutes) || 60;
    const focus = { strength: 'snagu', muscle_progress: 'mišićni napredak', general_fitness: 'opštu kondiciju' }[profile?.trainingFocus] || 'tvoj fokus';
    const goal = { lose_weight: 'mršanje', maintain: 'održavanje težine', gain_weight: 'povećanje težine' }[profile?.goal] || 'tvoj cilj težine';
    return `Prijedlog za ${location} · oko ${duration} min · cilj: ${goal} · fokus: ${focus}${mode === 'selected_muscles' ? ' · koristi tvoje odabrane mišićne grupe' : ' · cijelo tijelo'}.`;
  }

  function getSelectedGeneratorMuscles() {
    return [...document.querySelectorAll('input[name="plan-generator-muscle"]:checked')].map((input) => input.value);
  }

  function updatePlanGeneratorConfiguration(clearResults = true) {
    const mode = profileUsesFullBody(currentProfileData)
      ? 'full_body'
      : (document.querySelector('input[name="plan-generator-mode"]:checked')?.value || '');
    const selectedMuscles = getSelectedGeneratorMuscles();
    const muscleFieldset = document.getElementById('plan-generator-muscles');
    const summary = document.getElementById('plan-generator-mode-help');
    const submit = document.getElementById('plan-generator-submit');
    if (muscleFieldset) muscleFieldset.hidden = mode !== 'selected_muscles';
    const configurationComplete = Boolean(mode) && (mode !== 'selected_muscles' || selectedMuscles.length > 0);
    if (submit) submit.disabled = !configurationComplete;
    if (summary) {
      if (!mode) summary.textContent = 'Izaberi cijelo tijelo ili odabrane mišićne grupe prije generisanja.';
      else if (mode === 'selected_muscles' && !selectedMuscles.length) summary.textContent = 'Odaberi barem jednu mišićnu grupu.';
      else {
        const profile = mode === 'selected_muscles' ? { ...currentProfileData, targetMuscleGroups: selectedMuscles } : currentProfileData;
        summary.textContent = describeGeneratorProfile(profile, mode);
      }
    }
    if (clearResults) {
      const results = document.getElementById('plan-generator-results');
      if (results) { results.hidden = true; results.innerHTML = ''; }
      generatedPlanSuggestions = [];
      generatedPlanWarning = '';
      generatedPlanViewIndex = 0;
    }
    return { mode, selectedMuscles, configurationComplete };
  }

  function renderGeneratedPlanSuggestions() {
    const results = document.getElementById('plan-generator-results');
    if (!results) return;
    results.hidden = false;
    if (!generatedPlanSuggestions.length) {
      results.innerHTML = `<p class="plan-generator-empty">${escapeHtml(translateUiText(generatedPlanWarning || 'Za ovaj izbor nema dovoljno vježbi u biblioteci. Pokušaj sa cijelim tijelom ili promijeni mjesto treninga u svom profilu.'))}</p>`;
      return;
    }
    generatedPlanViewIndex = Math.max(0, Math.min(generatedPlanViewIndex, generatedPlanSuggestions.length - 1));
    const plan = generatedPlanSuggestions[generatedPlanViewIndex];
    const totalPlans = generatedPlanSuggestions.length;
    const saveAllButton = `<button class="btn btn-secondary plan-generator-save-all" type="button" data-action="save-all-generated-plans" ${generatedPlanSaveInProgress ? 'disabled' : ''}>Sačuvaj sve planove</button>`;
    const warning = generatedPlanWarning ? `<p class="plan-generator-warning">${escapeHtml(translateUiText(generatedPlanWarning))}</p>` : '';
    const estimatedMinutes = Number(currentProfileData?.sessionMinutes) || 60;
    const exercises = plan.exercises;
    const dots = Array.from({ length: totalPlans }, (_, index) => `<i class="${index === generatedPlanViewIndex ? 'is-active' : ''}"></i>`).join('');
    const language = getCurrentLanguage();
    const planPosition = language === 'en' ? `Plan ${generatedPlanViewIndex + 1} of ${totalPlans}`
      : language === 'de' ? `Plan ${generatedPlanViewIndex + 1} von ${totalPlans}`
      : `Plan ${generatedPlanViewIndex + 1} od ${totalPlans}`;
    const previousPlanLabel = translateUiText('Prethodni plan');
    const nextPlanLabel = translateUiText('Sljedeći plan');
    results.innerHTML = `${warning}
      <div class="plan-generator-carousel-navigation" aria-label="${escapeHtml(translateUiText('Navigacija prijedloga planova'))}">
        <button class="btn btn-secondary plan-generator-carousel-arrow is-previous" type="button" data-action="view-previous-generated-plan" aria-label="${escapeHtml(previousPlanLabel)}" ${totalPlans < 2 || generatedPlanSaveInProgress ? 'disabled' : ''}>‹</button>
        <button class="btn btn-secondary plan-generator-carousel-arrow is-next" type="button" data-action="view-next-generated-plan" aria-label="${escapeHtml(nextPlanLabel)}" ${totalPlans < 2 || generatedPlanSaveInProgress ? 'disabled' : ''}>›</button>
      </div>
      <article class="plan-generator-suggestion">
        <div class="plan-generator-suggestion-content">
          <div class="plan-generator-suggestion-heading"><div><span class="settings-eyebrow">${escapeHtml(translateUiText(routineWeekdayLabels[Number(plan.scheduleDays?.[0])] || 'PRIJEDLOG'))}</span><h4>${escapeHtml(plan.emoji)} ${escapeHtml(getRoutineDisplayName(plan.name))}</h4><p>Fokus: ${escapeHtml(getRoutineDisplayName(plan.groupTitle))} · ${escapeHtml(plan.exercises.length)} ${escapeHtml(translateUiText('vježbi'))} · oko ${estimatedMinutes} min</p></div></div>
          <ol>${exercises.map((exercise) => {
          const reps = ['weight_reps', 'reps'].includes(exercise.measurementType) ? `${exercise.setCount} serije × ${exercise.repRangeMin}–${exercise.repRangeMax}` : exercise.measurementType === 'seconds' ? `${exercise.setCount} serije · trajanje` : 'kardio';
          return `<li><strong>${escapeHtml(exercise.name)}</strong><small>${escapeHtml(reps)} · odmor ${escapeHtml(exercise.restSeconds)} sek</small></li>`;
          }).join('')}</ol>
          <div class="plan-generator-pagination" aria-live="polite"><span class="plan-generator-dots" aria-hidden="true">${dots}</span><strong>${escapeHtml(planPosition)}</strong></div>
        </div>
      </article>
      <div class="plan-generator-actions"><button class="btn btn-secondary" type="button" data-action="regenerate-generated-plan" data-generated-plan-id="${escapeHtml(plan.id)}" ${generatedPlanSaveInProgress ? 'disabled' : ''}>↻ Generiši ponovo</button><button class="btn btn-secondary" type="button" data-action="edit-generated-plan" data-generated-plan-id="${escapeHtml(plan.id)}" ${generatedPlanSaveInProgress ? 'disabled' : ''}>✎ Uredi ovaj plan</button><button class="btn" type="button" data-action="save-generated-plan" data-generated-plan-id="${escapeHtml(plan.id)}" ${generatedPlanSaveInProgress ? 'disabled' : ''}>Sačuvaj ovaj plan</button></div>${saveAllButton}
    `;
  }

  window.openPlanGenerator = function() {
    if (!currentUser) return;
    if (!hasAcceptedCurrentLegalVersion(currentProfileData)) {
      showLegalAcceptanceIfRequired();
      return;
    }
    if (!isProfileComplete()) {
      ShowToast('Prvo dovrši Profil i ciljeve da napravimo smislen prijedlog.', 'error');
      window.openProfileDetailsEditor('onboarding');
      return;
    }
    const modal = document.getElementById('plan-generator-modal');
    const results = document.getElementById('plan-generator-results');
    if (results) { results.hidden = true; results.innerHTML = ''; }
    const mustUseFullBody = profileUsesFullBody(currentProfileData);
    const generatorModeFieldset = document.querySelector('.plan-generator-mode');
    if (generatorModeFieldset) generatorModeFieldset.hidden = mustUseFullBody;
    document.querySelectorAll('input[name="plan-generator-mode"]').forEach((input) => { input.checked = false; });
    document.querySelectorAll('input[name="plan-generator-muscle"]').forEach((input) => { input.checked = false; });
    const fullBodyInput = document.querySelector('input[name="plan-generator-mode"][value="full_body"]');
    if (mustUseFullBody && fullBodyInput) fullBodyInput.checked = true;
    generatedPlanSuggestions = [];
    generatedPlanWarning = '';
    generatedPlanViewIndex = 0;
    updatePlanGeneratorConfiguration(false);
    modal?.style.setProperty('display', 'flex');
  };

  window.generatePersonalizedPlans = function() {
    if (Number(currentProfileData?.trainingFrequency) < 1) {
      ShowToast('U Profilu i ciljevima postavi barem jedan trening sedmično da napravimo raspored.', 'error');
      return;
    }
    const configuration = updatePlanGeneratorConfiguration(false);
    if (!configuration.configurationComplete) {
      ShowToast(configuration.mode === 'selected_muscles' ? 'Odaberi barem jednu mišićnu grupu.' : 'Prvo izaberi šta želiš trenirati.', 'error');
      return;
    }
    const generatorProfile = configuration.mode === 'selected_muscles'
      ? { ...(currentProfileData || {}), targetMuscleGroups: configuration.selectedMuscles }
      : (currentProfileData || {});
    generatedPlanSuggestions = buildPersonalizedPlanSuggestions(generatorProfile, configuration.mode);
    generatedPlanViewIndex = 0;
    renderGeneratedPlanSuggestions();
  };

  window.viewGeneratedPlan = function(direction) {
    if (!generatedPlanSuggestions.length || generatedPlanSaveInProgress) return;
    generatedPlanViewIndex = (generatedPlanViewIndex + direction + generatedPlanSuggestions.length) % generatedPlanSuggestions.length;
    renderGeneratedPlanSuggestions();
  };

  window.editGeneratedPlan = function(planId) {
    const plan = generatedPlanSuggestions.find((item) => item.id === planId);
    if (!plan || generatedPlanSaveInProgress) return;
    pendingGeneratedPlanId = plan.id;
    document.getElementById('plan-generator-modal')?.style.setProperty('display', 'none');
    document.getElementById('newRoutineNameInput').value = plan.name;
    const emojiInput = document.getElementById('newRoutineEmojiInput');
    if (emojiInput) emojiInput.value = plan.emoji || '';
    resetRoutineExerciseBuilder();
    plan.exercises.forEach((exercise) => addRoutineExerciseRow('new-routine-exercises-list', exercise));
    document.getElementById('createRoutineModal')?.style.setProperty('display', 'flex');
    const heading = document.querySelector('#createRoutineModal h3');
    const intro = document.querySelector('#createRoutineModal .routine-builder-intro');
    const saveButton = document.querySelector('#createRoutineModal [data-action="submit-new-routine"]');
    if (heading) heading.textContent = 'Uredi prijedlog plana';
    if (intro) intro.textContent = 'Promijeni naziv ili vježbe, pa se vrati na pregled prijedloga.';
    if (saveButton) saveButton.textContent = 'Sačuvaj izmjene';
    requestAnimationFrame(() => document.getElementById('newRoutineNameInput')?.focus());
  };

  window.regenerateGeneratedPlan = function(planId) {
    const planIndex = generatedPlanSuggestions.findIndex((item) => item.id === planId);
    const plan = generatedPlanSuggestions[planIndex];
    if (planIndex < 0 || !plan) return;
    const previousSignature = plan.exercises.map((exercise) => exercise.name).join('|');
    let replacement = [];
    let generationSeed = Number(plan.generationSeed) || 0;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      generationSeed += 1;
      const next = pickGeneratorExercises(plan.generatorGroups || [], currentProfileData || {}, getGeneratorExerciseCount(currentProfileData || {}), new Set(), generationSeed);
      if (next.length && next.map((exercise) => exercise.name).join('|') !== previousSignature) {
        replacement = next;
        break;
      }
    }
    if (!replacement.length) {
      ShowToast('Za ovaj dan nema drugog odgovarajućeg prijedloga s trenutnim izborima.', 'error');
      return;
    }
    generatedPlanSuggestions[planIndex] = { ...plan, exercises: replacement, generationSeed };
    renderGeneratedPlanSuggestions();
  };

  window.saveGeneratedPlan = async function(planId) {
    const plan = generatedPlanSuggestions.find((item) => item.id === planId);
    if (!currentUser || !plan || generatedPlanSaveInProgress) return;
    generatedPlanSaveInProgress = true;
    renderGeneratedPlanSuggestions();
    try {
      await addDoc(collection(db, 'routines'), {
        userId: currentUser.uid,
        emoji: plan.emoji || '',
        name: plan.name,
        exercises: plan.exercises,
        createdAt: new Date().toISOString(),
        isArchived: false,
        isFavorite: false,
        scheduleDays: Array.isArray(plan.scheduleDays) ? plan.scheduleDays : []
      });
      generatedPlanSuggestions = generatedPlanSuggestions.filter((item) => item.id !== planId);
      generatedPlanViewIndex = Math.max(0, Math.min(generatedPlanViewIndex, generatedPlanSuggestions.length - 1));
      if (generatedPlanSuggestions.length) renderGeneratedPlanSuggestions();
      else document.getElementById('plan-generator-modal')?.style.setProperty('display', 'none');
      ShowToast('Plan je sačuvan u tvojim planovima treninga.');
    } catch (error) {
      console.error('Generated plan save diagnostic:', error);
      ShowToast('Plan trenutno nije moguće sačuvati. Pokušaj ponovo.', 'error');
    } finally {
      generatedPlanSaveInProgress = false;
      if (generatedPlanSuggestions.length) renderGeneratedPlanSuggestions();
    }
  };

  window.saveAllGeneratedPlans = async function() {
    if (!currentUser || !generatedPlanSuggestions.length || generatedPlanSaveInProgress) return;
    generatedPlanSaveInProgress = true;
    renderGeneratedPlanSuggestions();
    let savedCount = 0;
    try {
      const plans = [...generatedPlanSuggestions].sort((first, second) => getRoutineScheduleSortValue(first) - getRoutineScheduleSortValue(second));
      for (const plan of plans) {
        await addDoc(collection(db, 'routines'), {
          userId: currentUser.uid,
          emoji: plan.emoji || '',
          name: plan.name,
          exercises: plan.exercises,
          createdAt: new Date().toISOString(),
          isArchived: false,
          isFavorite: false,
          scheduleDays: Array.isArray(plan.scheduleDays) ? plan.scheduleDays : []
        });
        generatedPlanSuggestions = generatedPlanSuggestions.filter((item) => item.id !== plan.id);
        savedCount += 1;
      }
      generatedPlanWarning = '';
      pendingGeneratedPlanId = null;
      document.getElementById('plan-generator-modal')?.style.setProperty('display', 'none');
      ShowToast(`Dodano je ${savedCount} planova u tvoje planove treninga.`);
    } catch (error) {
      console.error('Generated plans save diagnostic:', error);
      ShowToast(savedCount ? `Sačuvano je ${savedCount} planova. Preostale možeš pokušati ponovo.` : 'Planove trenutno nije moguće sačuvati. Pokušaj ponovo.', 'error');
    } finally {
      generatedPlanSaveInProgress = false;
      generatedPlanViewIndex = Math.max(0, Math.min(generatedPlanViewIndex, generatedPlanSuggestions.length - 1));
      if (generatedPlanSuggestions.length) renderGeneratedPlanSuggestions();
    }
  };

  function addRoutineExerciseRow(listId, exercise = { name: '', measurementType: 'weight_reps' }) {
    const list = document.getElementById(listId);
    if (!list) return;
    const normalizedExercise = normalizeRoutineExercise(exercise);
    const { name, measurementType } = normalizedExercise;
    const row = document.createElement('div');
    row.className = 'routine-exercise-row';
    row.innerHTML = `
      <input class="custom-input routine-exercise-name" type="text" maxlength="100" placeholder="Upiši naziv vježbe" value="${escapeHtml(name)}">
      <button type="button" class="routine-remove-exercise" data-action="remove-routine-exercise" aria-label="Ukloni vježbu">×</button>
      <details class="routine-exercise-settings">
        <summary>Dodatne opcije</summary>
        <label class="routine-exercise-type-label">Kako pratiš ovu vježbu?
          <select class="custom-input routine-exercise-type" aria-label="Tip praćenja vježbe">
            <option value="weight_reps" ${measurementType === 'weight_reps' ? 'selected' : ''}>Kilaža i ponavljanja</option>
            <option value="reps" ${measurementType === 'reps' ? 'selected' : ''}>Samo ponavljanja</option>
            <option value="seconds" ${measurementType === 'seconds' ? 'selected' : ''}>Trajanje u sekundama</option>
            <option value="cardio" ${measurementType === 'cardio' ? 'selected' : ''}>Kardio</option>
          </select>
        </label>
        <div class="routine-exercise-settings-grid">
          <label class="routine-setting-reps">Raspon ponavljanja
            <span><input class="custom-input routine-exercise-rep-min" type="number" min="1" max="100" step="1" value="${escapeHtml(normalizedExercise.repRangeMin)}"><b>–</b><input class="custom-input routine-exercise-rep-max" type="number" min="1" max="100" step="1" value="${escapeHtml(normalizedExercise.repRangeMax)}"></span>
          </label>
          <label class="routine-setting-sets">Broj serija<input class="custom-input routine-exercise-set-count" type="number" min="1" max="10" step="1" value="${escapeHtml(normalizedExercise.setCount)}"></label>
          <label class="routine-setting-weight">Korak opterećenja (kg)<input class="custom-input routine-exercise-weight-increment" type="number" min="0.25" max="100" step="0.25" value="${escapeHtml(normalizedExercise.weightIncrement)}"></label>
          <label class="routine-setting-time">Korak vremena <span class="routine-time-unit">${measurementType === 'cardio' ? '(min)' : '(sek)'}</span><input class="custom-input routine-exercise-time-increment" type="number" min="1" max="60" step="1" value="${escapeHtml(normalizedExercise.timeIncrement)}"></label>
          <label>Odmor između serija (sek)<input class="custom-input routine-exercise-rest-seconds" type="number" min="0" max="1800" step="5" value="${escapeHtml(normalizedExercise.restSeconds)}"></label>
        </div>
      </details>
    `;
    list.appendChild(row);
    syncRoutineExerciseSettingsVisibility(row);
    row.querySelector('.routine-exercise-type')?.addEventListener('change', () => syncRoutineExerciseSettingsVisibility(row));
  }

  function syncRoutineExerciseSettingsVisibility(row) {
    const type = row.querySelector('.routine-exercise-type')?.value || 'weight_reps';
    row.querySelector('.routine-setting-reps')?.classList.toggle('is-hidden', !['weight_reps', 'reps'].includes(type));
    row.querySelector('.routine-setting-weight')?.classList.toggle('is-hidden', type !== 'weight_reps');
    row.querySelector('.routine-setting-time')?.classList.toggle('is-hidden', !['seconds', 'cardio'].includes(type));
    const timeUnit = row.querySelector('.routine-time-unit');
    if (timeUnit) timeUnit.textContent = type === 'cardio' ? '(min)' : '(sek)';
  }

  window.addRoutineExercise = function(name = '') {
    addRoutineExerciseRow('new-routine-exercises-list', { name, measurementType: 'weight_reps' });
    document.querySelector('#new-routine-exercises-list .routine-exercise-row:last-child .routine-exercise-name')?.focus();
  };

  function resetEditRoutineExerciseBuilder(exercises) {
    const list = document.getElementById('edit-routine-exercises-list');
    if (!list) return;

    list.innerHTML = '';
    const existingExercises = Array.isArray(exercises) ? exercises : [];
    if (existingExercises.length === 0) {
      addRoutineExerciseRow('edit-routine-exercises-list');
      return;
    }

    existingExercises.forEach((exercise) => addRoutineExerciseRow('edit-routine-exercises-list', exercise));
  }

  window.addEditRoutineExercise = function() {
    addRoutineExerciseRow('edit-routine-exercises-list');
    document.querySelector('#edit-routine-exercises-list .routine-exercise-row:last-child .routine-exercise-name')?.focus();
  };

  function getRoutineExercisesFromList(listId) {
    return Array.from(document.querySelectorAll(`#${listId} .routine-exercise-row`))
      .map((row) => normalizeRoutineExercise({
        name: row.querySelector('.routine-exercise-name')?.value || '',
        measurementType: row.querySelector('.routine-exercise-type')?.value || '',
        setCount: row.querySelector('.routine-exercise-set-count')?.value,
        repRangeMin: row.querySelector('.routine-exercise-rep-min')?.value,
        repRangeMax: row.querySelector('.routine-exercise-rep-max')?.value,
        weightIncrement: row.querySelector('.routine-exercise-weight-increment')?.value,
        timeIncrement: row.querySelector('.routine-exercise-time-increment')?.value,
        restSeconds: row.querySelector('.routine-exercise-rest-seconds')?.value
      }))
      .filter((exercise) => exercise.name.length > 0);
  }

  function getRoutineExerciseValidationMessage(exercises) {
    if (!Array.isArray(exercises) || exercises.length === 0) return 'Dodaj bar jednu vježbu u plan.';
    if (exercises.length > 100) return 'Jedan plan može imati najviše 100 vježbi.';
    if (exercises.some((exercise) => exercise.name.length > 100)) return 'Naziv vježbe može imati najviše 100 znakova.';
    if (exercises.some((exercise) => !['weight_reps', 'reps', 'seconds', 'cardio'].includes(exercise.measurementType))) {
      return 'Izaberi validan način praćenja za svaku vježbu.';
    }
    if (exercises.some((exercise) => ['weight_reps', 'reps'].includes(exercise.measurementType) && exercise.repRangeMin > exercise.repRangeMax)) {
      return 'Prvi broj u rasponu ponavljanja ne može biti veći od drugog.';
    }
    return '';
  }

  window.removeRoutineExercise = function(button) {
    const row = button?.closest('.routine-exercise-row');
    const list = row?.parentElement;
    if (!list || !row) return;
    if (list.querySelectorAll('.routine-exercise-row').length <= 1) {
      row.querySelector('.routine-exercise-name').value = '';
      row.querySelector('.routine-exercise-type').value = 'weight_reps';
      return;
    }
    row.remove();
  };

  window.submitNewRoutine = async function() {
    const emojiInput = document.getElementById('newRoutineEmojiInput')?.value.trim() || '';
    const nameInput = document.getElementById('newRoutineNameInput').value.trim();

    if (!nameInput) {
      ShowToast("Unesite naziv plana!", 'error');
      return;
    }

    const exercises = getRoutineExercisesFromList('new-routine-exercises-list');
    const scheduleDays = [...document.querySelectorAll('input[name="new-routine-schedule"]:checked')].map((input) => input.value);
    if (exercises.length === 0) {
      ShowToast('Dodaj bar jednu vježbu u plan.', 'error');
      return;
    }
    const exerciseValidationMessage = getRoutineExerciseValidationMessage(exercises);
    if (exerciseValidationMessage) {
      ShowToast(exerciseValidationMessage, 'error');
      return;
    }
    const finalEmoji = emojiInput || '';

    const newRoutine = {
      userId: currentUser.uid,
      emoji: finalEmoji,
      name: nameInput,
      exercises,
      createdAt: new Date().toISOString(),
      isArchived: false,
      isFavorite: false,
      scheduleDays
    };

    if (pendingGeneratedPlanId) {
      const planIndex = generatedPlanSuggestions.findIndex((plan) => plan.id === pendingGeneratedPlanId);
      if (planIndex >= 0) {
        generatedPlanSuggestions[planIndex] = {
          ...generatedPlanSuggestions[planIndex],
          emoji: finalEmoji,
          name: nameInput,
          exercises
        };
        generatedPlanViewIndex = planIndex;
      }
      pendingGeneratedPlanId = null;
      document.getElementById('createRoutineModal').style.display = 'none';
      document.getElementById('plan-generator-modal')?.style.setProperty('display', 'flex');
      renderGeneratedPlanSuggestions();
      ShowToast('Prijedlog plana je ažuriran. Sačuvaj ga kada budeš spreman.');
      return;
    }

    try {
      await addDoc(collection(db, "routines"), newRoutine);
      document.getElementById('createRoutineModal').style.display = 'none';
      ShowToast("Novi plan uspješno kreiran! 🔥");
    } catch (e) {
      ShowToast("Greška pri kreiranju: " + e.message, 'error');
    }
  };

  window.copyAIRules = function() {
    const rulesText = `Pretvori moj trening plan u striktan format za GymLeader aplikaciju:
- Svaki dan mora početi sa nazivom npr. 'Gornji A', 'Donji B', 'Leg Day'
- Ispod svakog plana/dana napiši vježbe u novom redu sa serijama i ponavljanjima (npr. Potisak sa klupe 4x10)
- Između dana ostavi prazan red. Ne dodaj nikakve uvodne rečenice niti objasnjenja!`;

    navigator.clipboard.writeText(rulesText).then(() => {
      ShowToast("Uputstvo kopirano u bafer! 📋");
    }).catch(() => {
      ShowToast("Greška pri kopiranju", 'error');
    });
  };

  function saveWorkoutDraft() {
    if (!currentWorkout) return;
    const blocks = document.querySelectorAll('.exercise-block');
    const draft = {
      id: currentWorkout.id,
      name: currentWorkout.name,
      date: currentWorkout.date,
      exercises: []
    };

    blocks.forEach(b => {
      const name = b.getAttribute('data-name');
      const notes = b.querySelector('.ex-note')?.value || '';
      const isCardio = b.getAttribute('data-is-cardio') === 'true';
      const exerciseConfig = normalizeRoutineExercise({
        name,
        measurementType: b.getAttribute('data-measurement-type') || '',
        setCount: b.getAttribute('data-set-count'),
        repRangeMin: b.getAttribute('data-rep-range-min'),
        repRangeMax: b.getAttribute('data-rep-range-max'),
        weightIncrement: b.getAttribute('data-weight-increment'),
        timeIncrement: b.getAttribute('data-time-increment'),
        restSeconds: b.getAttribute('data-rest-seconds')
      });

      if (isCardio) {
        draft.exercises.push({
          ...exerciseConfig,
          isCardio: true,
          minutes: b.getAttribute('data-minutes'),
          calories: b.getAttribute('data-calories'),
          notes
        });
      } else {
        const sets = [];
        const isDuration = exerciseConfig.measurementType === 'seconds';
        const repsOnly = exerciseConfig.measurementType === 'reps';
        b.querySelectorAll('.set-row').forEach((row, idx) => {
          if (idx === 0) return;
          if (isDuration) {
            sets.push({ seconds: row.querySelector('.set-seconds')?.value || '' });
          } else if (repsOnly) {
            sets.push({ reps: row.querySelector('.set-reps')?.value || '' });
          } else {
            sets.push({
              weight: row.querySelector('.set-kg')?.value || '',
              reps: row.querySelector('.set-reps')?.value || ''
            });
          }
        });
        draft.exercises.push({ ...exerciseConfig, sets, notes });
      }
    });

    localStorage.setItem('active_workout_draft', JSON.stringify(draft));
  }

  function clearWorkoutDraft() { 
    localStorage.removeItem('active_workout_draft');
    const alertBox = document.getElementById('active-draft-alert');
    if (alertBox) alertBox.style.display = 'none';
  }

  function checkDraftState() {
    const draft = localStorage.getItem('active_workout_draft');
    const alertBox = document.getElementById('active-draft-alert');
    if (draft && alertBox) {
      alertBox.style.display = 'block';
    } else if (alertBox) {
      alertBox.style.display = 'none';
    }
  }

  window.resumeDraftWorkout = function() {
    const draftRaw = localStorage.getItem('active_workout_draft');
    if (!draftRaw) return;
    const draft = JSON.parse(draftRaw);
    currentWorkout = { id: draft.id, name: draft.name, date: draft.date, exercises: [] };

    document.getElementById('active-workout-title').innerText = draft.name;
    const container = document.getElementById('active-exercises-container');
    container.innerHTML = '';

    draft.exercises.forEach((ex) => {
      const exName = typeof ex === 'string' ? ex : (ex.name || 'Vježba');
      const exerciseConfig = normalizeRoutineExercise(ex);
      const measurementType = exerciseConfig.measurementType;
      const maxW = getMaxWeightFromHistory(exName);
      const targetGoal = calculateTargetGoal(exerciseConfig);
      const restTime = formatRestTime(exerciseConfig.restSeconds);
      let prevLogStr = 'Nema prošlog zapisa';
      let prevNote = '';
      for (let i = 0; i < cachedHistory.length; i++) {
        const pastEx = cachedHistory[i].exercises?.find((item) => item.name === exName);
        if (pastEx) {
          if (pastEx.sets && pastEx.sets.length > 0) {
            prevLogStr = pastEx.sets.map((set) => formatSetPerformance(set, exerciseConfig)).join(' | ');
          } else if (pastEx.minutes) {
            prevLogStr = `${pastEx.minutes} min` + (pastEx.calories ? ` · ${pastEx.calories} kcal` : '');
          }
          if (pastEx.notes) prevNote = pastEx.notes;
          break;
        }
      }
      
      if (ex.isCardio || measurementType === 'cardio') {
        const card = document.createElement('div');
        card.className = 'card exercise-block custom-cardio-block';
        card.setAttribute('data-name', exName);
        card.setAttribute('data-is-cardio', 'true');
        card.setAttribute('data-measurement-type', 'cardio');
        card.setAttribute('data-set-count', exerciseConfig.setCount);
        card.setAttribute('data-rest-seconds', exerciseConfig.restSeconds);
        card.setAttribute('data-rep-range-min', exerciseConfig.repRangeMin);
        card.setAttribute('data-rep-range-max', exerciseConfig.repRangeMax);
        card.setAttribute('data-weight-increment', exerciseConfig.weightIncrement);
        card.setAttribute('data-time-increment', exerciseConfig.timeIncrement);
        card.setAttribute('data-minutes', ex.minutes || '0');
        card.setAttribute('data-calories', ex.calories || '0');

        card.innerHTML = `
          <div class="flex-between">
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--accent-purple);">${escapeHtml(exName)} 🏃‍♂️</h3>
            <button class="btn-remove-ex" style="display:none;" data-action="remove-exercise">Ukloni 🗑️</button>
          </div>
          ${targetGoal ? `<span class="target-badge">${escapeHtml(targetGoal)}</span>` : ''}
          ${restTime ? `<small class="exercise-rest-hint">Preporučeni odmor: ${escapeHtml(restTime)}</small>` : ''}
          <div style="font-size: 0.9rem; color: #fff; margin: 8px 0;">
            ${ex.minutes ? `⏱️ <strong>${escapeHtml(ex.minutes)} min</strong>` : ''} ${ex.calories ? ` · 🔥 <strong>${escapeHtml(ex.calories)} kcal</strong>` : ''}
          </div>
          ${ex.notes ? `<div style="font-size:0.8rem; color:var(--text-muted);">📝 ${escapeHtml(ex.notes)}</div>` : ''}
          <input type="hidden" class="ex-note" value="${escapeHtml(ex.notes || '')}">
        `;
        container.appendChild(card);
      } else {
        const card = document.createElement('div');
        card.className = 'card exercise-block';
        card.setAttribute('data-name', exName);
        card.setAttribute('data-maxw', maxW);
        const isDuration = measurementType === 'seconds';
        card.setAttribute('data-measurement-type', measurementType);
        card.setAttribute('data-set-count', exerciseConfig.setCount);
        card.setAttribute('data-rest-seconds', exerciseConfig.restSeconds);
        card.setAttribute('data-rep-range-min', exerciseConfig.repRangeMin);
        card.setAttribute('data-rep-range-max', exerciseConfig.repRangeMax);
        card.setAttribute('data-weight-increment', exerciseConfig.weightIncrement);
        card.setAttribute('data-time-increment', exerciseConfig.timeIncrement);

        card.innerHTML = `
          <div class="flex-between">
            <h3 style="font-size: 1.15rem; font-weight: 800;">${escapeHtml(ex.name)}</h3>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="pr-badge-slot"></span>
              <button class="btn-remove-ex" style="display:none;" data-action="remove-exercise">Ukloni 🗑️</button>
            </div>
          </div>
          ${targetGoal ? `<span class="target-badge">${escapeHtml(targetGoal)}</span>` : ''}
          ${restTime ? `<small class="exercise-rest-hint">Preporučeni odmor između serija: ${escapeHtml(restTime)}</small>` : ''}
          <div class="prev-perf">
            Prošli put: <strong>${escapeHtml(prevLogStr)}</strong>
            ${prevNote ? `<br><small style="color: #94a3b8;">📝 Napomena: ${escapeHtml(prevNote)}</small>` : ''}
          </div>
          <div class="sets-container">
            <div class="set-row">
              <span style="font-size: 0.7rem; color: var(--text-muted); font-weight:800;">SET</span>
              <span style="font-size: 0.7rem; color: var(--text-muted); text-align: center; font-weight:800;">${isDuration ? 'SEC' : measurementType === 'reps' ? '' : 'KG'}</span>
              <span style="font-size: 0.7rem; color: var(--text-muted); text-align: center; font-weight:800;">${isDuration ? '' : 'REPS'}</span>
              <span></span>
            </div>
          </div>
          <button class="btn btn-secondary mt-12 set-edit-add" style="display:none; padding: 10px; font-size: 0.85rem;" data-action="add-set-row">+ Dodaj Set</button>
          <input type="text" class="note-input ex-note" value="${escapeHtml(ex.notes || '')}" placeholder="✏️ Napomena za ovu vježbu (opcionalno)...">
        `;
        container.appendChild(card);

        const setsContainer = card.querySelector(`.sets-container`);
        (ex.sets || []).forEach((s, sIdx) => {
          const row = document.createElement('div');
          row.className = 'set-row';
          row.innerHTML = `
            <span style="font-weight: 900; color: var(--primary);">${sIdx + 1}</span>
            ${isDuration
              ? `<input type="number" class="set-seconds" placeholder="sek" min="1" step="1" value="${escapeHtml(s.seconds ?? '')}"><span></span>`
              : measurementType === 'reps'
                ? `<span></span><input type="number" class="set-reps" placeholder="0" min="1" step="1" value="${escapeHtml(s.reps ?? '')}">`
                : `<input type="number" class="set-kg" placeholder="0" step="0.5" value="${escapeHtml(s.weight ?? '')}">
                   <input type="number" class="set-reps" placeholder="0" value="${escapeHtml(s.reps ?? '')}">`}
            <button style="background:none; border:none; color: var(--danger); font-size: 1.3rem; cursor:pointer;" data-action="remove-set-row">×</button>
          `;
          setsContainer.appendChild(row);
        });
        card.querySelectorAll('.set-kg').forEach((input) => window.checkPR(input));
      }
    });

    switchTab('active-workout');
    updateProgress();
  };

  window.startWorkout = function(workoutId) {
    let workout = userRoutines.find(w => w.id === workoutId) || defaultWorkouts.find(w => w.id === workoutId);
    if (!workout) workout = { id: 'new', name: 'Trening', exercises: [] };
    
    currentWorkout = { id: workout.id, name: workout.name, date: new Date().toISOString(), exercises: [] };
    activeWorkoutEditMode = false;

    renderActiveWorkoutUI(workout);
    switchTab('active-workout');
    updateProgress();
    saveWorkoutDraft();
  };

  window.removeExerciseBlock = async function(btnEl) {
    if (await showConfirm('Želiš li potpuno ukloniti ovu vježbu za danas?')) {
      const block = btnEl.closest('.exercise-block');
      if (block) {
        block.remove();
        updateProgress();
        saveWorkoutDraft();
      }
    }
  };

  window.toggleActiveWorkoutEditMode = function() {
    activeWorkoutEditMode = !activeWorkoutEditMode;
    document.querySelectorAll('.btn-remove-ex').forEach((button) => {
      button.style.display = activeWorkoutEditMode ? 'inline-flex' : 'none';
    });
    document.querySelectorAll('.exercise-block').forEach((block) => ensureExerciseEditControls(block));
    document.querySelectorAll('[data-action="remove-set-row"]').forEach((control) => {
      control.style.display = activeWorkoutEditMode ? 'inline-flex' : 'none';
    });
    document.querySelectorAll('.set-edit-add').forEach((control) => {
      control.style.display = activeWorkoutEditMode ? 'inline-flex' : 'none';
    });
    const addExerciseButton = document.querySelector('[data-action="toggle-custom-modal"]');
    if (addExerciseButton) addExerciseButton.style.display = activeWorkoutEditMode ? 'inline-flex' : 'none';
    const button = document.querySelector('[data-action="toggle-active-workout-edit-mode"]');
    if (button) button.textContent = activeWorkoutEditMode ? '✓ Gotovo' : '✎ Uredi trening';
  };

  function ensureExerciseEditControls(block) {
    const header = block.querySelector('.flex-between');
    if (!header) return;
    let controls = header.querySelector('.exercise-edit-controls');
    if (!controls) {
      controls = document.createElement('div');
      controls.className = 'exercise-edit-controls';
      controls.style.cssText = 'display:flex; gap:4px; margin-left:8px;';
      controls.innerHTML = `
        <button type="button" class="exercise-move-control" style="display:inline-flex;" data-action="move-exercise-up" title="Pomjeri gore">↑</button>
        <button type="button" class="exercise-move-control" style="display:inline-flex;" data-action="move-exercise-down" title="Pomjeri dole">↓</button>`;
      header.appendChild(controls);
    }
    controls.style.display = activeWorkoutEditMode ? 'flex' : 'none';
    const addSetButton = block.querySelector('.set-edit-add');
    if (addSetButton) addSetButton.style.display = activeWorkoutEditMode ? 'inline-flex' : 'none';
  }

  window.moveExerciseBlock = function(button, direction) {
    if (!activeWorkoutEditMode) return;
    const block = button.closest('.exercise-block');
    const container = document.getElementById('active-exercises-container');
    if (!block || !container) return;
    if (direction === 'up' && block.previousElementSibling?.classList.contains('exercise-block')) {
      container.insertBefore(block, block.previousElementSibling);
    } else if (direction === 'down' && block.nextElementSibling?.classList.contains('exercise-block')) {
      container.insertBefore(block.nextElementSibling, block);
    }
    saveWorkoutDraft();
  };

  function setupTouchReorder() {
    const container = document.getElementById('active-exercises-container');
    if (!container || container.dataset.touchReorderReady === 'true') return;
    container.dataset.touchReorderReady = 'true';
    let touchStart = null;

    container.addEventListener('touchstart', (event) => {
      if (!activeWorkoutEditMode || event.touches.length !== 1) return;
      if (event.target.closest('button, input, textarea, select')) return;
      const block = event.target.closest('.exercise-block');
      if (!block) return;
      touchStart = { block, y: event.touches[0].clientY };
      block.classList.add('touch-reorder-active');
    }, { passive: true });

    container.addEventListener('touchend', (event) => {
      if (!touchStart) return;
      const { block, y } = touchStart;
      touchStart = null;
      block.classList.remove('touch-reorder-active');
      const delta = event.changedTouches[0].clientY - y;
      if (Math.abs(delta) < 40) return;
      window.moveExerciseBlock(block, delta < 0 ? 'up' : 'down');
    }, { passive: true });

    container.addEventListener('touchcancel', () => {
      if (touchStart?.block) touchStart.block.classList.remove('touch-reorder-active');
      touchStart = null;
    }, { passive: true });
  }

  function getMaxWeightFromHistory(exName) {
    let maxW = 0;
    cachedHistory.forEach(h => {
      const pastEx = h.exercises?.find(e => e.name === exName);
      if (pastEx && pastEx.sets) {
        pastEx.sets.forEach(s => { if (s.weight > maxW) maxW = s.weight; });
      }
    });
    return maxW;
  }

  function isDurationExercise(exName) {
    const name = String(exName || '').toLowerCase();
    return name.includes('plank')
      || name.includes('izdr')
      || name.includes('wall sit')
      || name.includes('hollow hold')
      || name.includes('dead hang')
      || name.includes('držanje');
  }

  function getExerciseMeasurementType(exercise, fallbackName = '') {
    const type = typeof exercise === 'object' ? exercise?.measurementType : '';
    if (['weight_reps', 'reps', 'seconds', 'cardio'].includes(type)) return type;
    const libraryExercise = resolveLibraryExercise(exercise) || resolveLibraryExercise(fallbackName);
    if (libraryExercise?.measurementType) return libraryExercise.measurementType;
    return isDurationExercise(typeof exercise === 'string' ? exercise : fallbackName) ? 'seconds' : 'weight_reps';
  }

  function formatSetPerformance(set, exercise) {
    const fallbackName = typeof exercise === 'string' ? exercise : (exercise?.name || '');
    const measurementType = getExerciseMeasurementType(exercise, fallbackName);
    if (measurementType === 'seconds' || (set.seconds !== undefined && set.seconds !== null)) {
      return `${set.seconds ?? set.weight ?? 0} sek`;
    }
    if (measurementType === 'reps') {
      return `${set.reps ?? 0} pon`;
    }
    if (set.weight === undefined || set.weight === null || set.weight === '') {
      return `${set.reps ?? 0} pon`;
    }
    return `${set.weight ?? 0}kg × ${set.reps ?? 0}`;
  }

  function getLatestExerciseLog(exerciseName) {
    for (let i = 0; i < cachedHistory.length; i++) {
      const match = cachedHistory[i].exercises?.find((item) => item.name === exerciseName);
      if (match) return match;
    }
    return null;
  }

  function formatRestTime(seconds) {
    const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
    if (!safeSeconds) return '';
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    if (!minutes) return `${safeSeconds} sek`;
    return remainder ? `${minutes} min ${remainder} sek` : `${minutes} min`;
  }

  function formatNextReps(reps, maximum) {
    return reps.map((value) => Math.min(maximum, value + 1)).join('/');
  }

  function formatGoalText(kind, payload) {
    const language = getCurrentLanguage();
    if (kind === 'weight-increase') {
      if (language === 'en') return `🎯 Goal: increase by ${payload.increment} kg to ${payload.nextWeight} kg. You reached ${payload.reps} reps in every set.`;
      if (language === 'de') return `🎯 Ziel: Erhöhe um ${payload.increment} kg auf ${payload.nextWeight} kg. Du hast in jeder Serie ${payload.reps} Wiederholungen geschafft.`;
      return `🎯 Cilj: povećaj za ${payload.increment} kg na ${payload.nextWeight} kg. U svakoj seriji si dostigao/la ${payload.reps} ponavljanja.`;
    }
    if (kind === 'weight-reps') {
      if (language === 'en') return `🎯 Goal: stay at ${payload.weight} kg and aim for ${payload.nextReps} reps. Range: ${payload.minimum}–${payload.maximum}.`;
      if (language === 'de') return `🎯 Ziel: Bleib bei ${payload.weight} kg und versuche ${payload.nextReps} Wiederholungen. Bereich: ${payload.minimum}–${payload.maximum}.`;
      return `🎯 Cilj: ostani na ${payload.weight} kg i ciljaj ${payload.nextReps} ponavljanja. Raspon: ${payload.minimum}–${payload.maximum}.`;
    }
    if (kind === 'reps') {
      if (language === 'en') return `🎯 Goal: aim for ${payload.nextReps} reps. Range: ${payload.minimum}–${payload.maximum}.`;
      if (language === 'de') return `🎯 Ziel: Versuche ${payload.nextReps} Wiederholungen. Bereich: ${payload.minimum}–${payload.maximum}.`;
      return `🎯 Cilj: ciljaj ${payload.nextReps} ponavljanja. Raspon: ${payload.minimum}–${payload.maximum}.`;
    }
    if (kind === 'seconds') {
      if (language === 'en') return `🎯 Goal: try ${payload.target} seconds per set. Last time: ${payload.previous} sec.`;
      if (language === 'de') return `🎯 Ziel: Versuche ${payload.target} Sekunden pro Serie. Letztes Mal: ${payload.previous} Sek.`;
      return `🎯 Cilj: pokušaj ${payload.target} sekundi po seriji. Prošli put: ${payload.previous} sek.`;
    }
    if (kind === 'cardio') {
      if (language === 'en') return `🎯 Goal: try ${payload.target} minutes. Last time: ${payload.previous} min.`;
      if (language === 'de') return `🎯 Ziel: Versuche ${payload.target} Minuten. Letztes Mal: ${payload.previous} Min.`;
      return `🎯 Cilj: pokušaj ${payload.target} minuta. Prošli put: ${payload.previous} min.`;
    }
    return null;
  }

  function calculateTargetGoal(exercise) {
    const config = normalizeRoutineExercise(exercise);
    const previous = getLatestExerciseLog(config.name);
    if (!previous) return null;

    if (config.measurementType === 'cardio') {
      const minutes = Number(previous.minutes);
      if (!Number.isFinite(minutes) || minutes <= 0) return null;
      return formatGoalText('cardio', { previous: minutes, target: minutes + config.timeIncrement });
    }

    const sets = Array.isArray(previous.sets) ? previous.sets : [];
    if (config.measurementType === 'seconds') {
      const seconds = sets.map((set) => Number(set.seconds)).filter((value) => Number.isFinite(value) && value > 0);
      if (!seconds.length) return null;
      return formatGoalText('seconds', { previous: seconds.join('/'), target: Math.max(...seconds) + config.timeIncrement });
    }

    const reps = sets.map((set) => Number(set.reps)).filter((value) => Number.isFinite(value) && value > 0);
    if (!reps.length) return null;
    if (config.measurementType === 'reps') {
      return formatGoalText('reps', { nextReps: formatNextReps(reps, config.repRangeMax), minimum: config.repRangeMin, maximum: config.repRangeMax });
    }

    const weightedSets = sets.filter((set) => Number.isFinite(Number(set.weight)) && Number(set.weight) > 0 && Number.isFinite(Number(set.reps)) && Number(set.reps) > 0);
    if (!weightedSets.length) return null;
    const weights = weightedSets.map((set) => Number(set.weight));
    const highestWeight = Math.max(...weights);
    const workingSets = weightedSets.filter((set) => Number(set.weight) === highestWeight);
    const weightedReps = workingSets.map((set) => Number(set.reps));
    if (weightedReps.every((value) => value >= config.repRangeMax)) {
      const nextWeight = Math.round((highestWeight + config.weightIncrement) * 100) / 100;
      return formatGoalText('weight-increase', { increment: config.weightIncrement, nextWeight, reps: config.repRangeMax });
    }
    return formatGoalText('weight-reps', {
      weight: highestWeight,
      nextReps: formatNextReps(weightedReps, config.repRangeMax),
      minimum: config.repRangeMin,
      maximum: config.repRangeMax
    });
  }

  function renderActiveWorkoutUI(workout) {
    document.getElementById('active-workout-title').innerText = currentWorkout.name;
    const container = document.getElementById('active-exercises-container');

    if (!workout.exercises || workout.exercises.length === 0) {
      container.innerHTML = `<div class="card" style="text-align:center; padding:30px 15px;"><p style="color:var(--text-muted); font-size:0.9rem;">Trening je prazan. Klikni na dugme ispod da dodaš vježbu ili kardio!</p></div>`;
      return;
    }

    container.innerHTML = workout.exercises.map((ex) => {
      const exName = typeof ex === 'string' ? ex : (ex.name || 'Vježba');
      const exerciseConfig = normalizeRoutineExercise(ex);
      const measurementType = exerciseConfig.measurementType;
      const isDuration = measurementType === 'seconds';
      const targetGoal = calculateTargetGoal(exerciseConfig);
      const restTime = formatRestTime(exerciseConfig.restSeconds);
      const plannedSetCount = exerciseConfig.measurementType === 'cardio' ? 1 : exerciseConfig.setCount;
      if (measurementType === 'cardio') {
        return `
          <div class="card exercise-block custom-cardio-block" data-name="${escapeHtml(exName)}" data-is-cardio="true" data-measurement-type="cardio" data-rest-seconds="${escapeHtml(exerciseConfig.restSeconds)}" data-rep-range-min="${escapeHtml(exerciseConfig.repRangeMin)}" data-rep-range-max="${escapeHtml(exerciseConfig.repRangeMax)}" data-weight-increment="${escapeHtml(exerciseConfig.weightIncrement)}" data-time-increment="${escapeHtml(exerciseConfig.timeIncrement)}" data-minutes="${escapeHtml(ex.minutes || '')}" data-calories="${escapeHtml(ex.calories || '')}">
            <div class="flex-between"><h3 style="font-size:1.15rem;font-weight:800;color:var(--accent-purple);">${escapeHtml(exName)} 🏃</h3><button class="btn-remove-ex" style="display:none;" data-action="remove-exercise">Ukloni 🗑️</button></div>
            ${targetGoal ? `<span class="target-badge">${escapeHtml(targetGoal)}</span>` : ''}
            ${restTime ? `<small class="exercise-rest-hint">Preporučeni odmor: ${escapeHtml(restTime)}</small>` : ''}
            <div class="cardio-input-grid"><label>Minute<input type="number" class="custom-input cardio-minutes" min="0" step="1" value="${escapeHtml(ex.minutes || '')}" placeholder="0"></label><label>Kalorije<input type="number" class="custom-input cardio-calories" min="0" step="1" value="${escapeHtml(ex.calories || '')}" placeholder="opcionalno"></label></div>
            <input type="text" class="note-input ex-note" value="${escapeHtml(ex.notes || '')}" placeholder="📝 Napomena (opcionalno)...">
          </div>
        `;
      }
      let prevLogStr = 'Nema prošlog zapisa';
      let prevNote = '';
      const maxW = getMaxWeightFromHistory(exName);
      
      for (let i = 0; i < cachedHistory.length; i++) {
        const pastEx = cachedHistory[i].exercises?.find(e => e.name === exName);
        if (pastEx) {
          if (pastEx.sets && pastEx.sets.length > 0) {
            prevLogStr = pastEx.sets.map(s => formatSetPerformance(s, exerciseConfig)).join(' | ');
          } else if (pastEx.minutes) {
            prevLogStr = `${pastEx.minutes} min` + (pastEx.calories ? ` · ${pastEx.calories} kcal` : '');
          }
          if (pastEx.notes) prevNote = pastEx.notes;
          break;
        }
      }

      return `
          <div class="card exercise-block" data-name="${escapeHtml(exName)}" data-maxw="${escapeHtml(maxW)}" data-measurement-type="${measurementType}" data-set-count="${escapeHtml(plannedSetCount)}" data-rest-seconds="${escapeHtml(exerciseConfig.restSeconds)}" data-rep-range-min="${escapeHtml(exerciseConfig.repRangeMin)}" data-rep-range-max="${escapeHtml(exerciseConfig.repRangeMax)}" data-weight-increment="${escapeHtml(exerciseConfig.weightIncrement)}" data-time-increment="${escapeHtml(exerciseConfig.timeIncrement)}">
          <div class="flex-between">
            <h3 style="font-size: 1.15rem; font-weight: 800;">${escapeHtml(exName)}</h3>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="pr-badge-slot"></span>
              <button class="btn-remove-ex" style="display:none;" data-action="remove-exercise">Ukloni 🗑️</button>
            </div>
          </div>
          ${targetGoal ? `<span class="target-badge">${escapeHtml(targetGoal)}</span>` : ''}
          ${restTime ? `<small class="exercise-rest-hint">Preporučeni odmor između serija: ${escapeHtml(restTime)}</small>` : ''}
          <div class="prev-perf">
            Prošli put: <strong>${escapeHtml(prevLogStr)}</strong>
            ${prevNote ? `<br><small style="color: #94a3b8;">📝 Napomena: ${escapeHtml(prevNote)}</small>` : ''}
          </div>
          <div class="sets-container">
            <div class="set-row">
              <span style="font-size: 0.7rem; color: var(--text-muted); font-weight:800;">SET</span>
              <span style="font-size: 0.7rem; color: var(--text-muted); text-align: center; font-weight:800;">${isDuration ? 'SEC' : measurementType === 'reps' ? '' : 'KG'}</span>
              <span style="font-size: 0.7rem; color: var(--text-muted); text-align: center; font-weight:800;">${isDuration ? '' : 'REPS'}</span>
              <span></span>
            </div>
          </div>
          <button class="btn btn-secondary mt-12 set-edit-add" style="display:none; padding: 10px; font-size: 0.85rem;" data-action="add-set-row">+ Dodaj Set</button>
          <input type="text" class="note-input ex-note" placeholder="✏️ Napomena za ovu vježbu (opcionalno)...">
        </div>
      `;
    }).join('');

    container.querySelectorAll('.exercise-block').forEach((block) => {
      const plannedSetCount = Math.max(1, Math.min(10, Number(block.getAttribute('data-set-count')) || 3));
      for (let index = 0; index < plannedSetCount; index += 1) {
        addSetRowToBlock(block.querySelector('.btn-secondary'));
      }
    });
  }

  window.addSetRowToBlock = function(btn) {
    const block = btn.closest('.exercise-block');
    if (!block) return;
    const container = block.querySelector('.sets-container');
    if (!container) return;

    const setNum = container.querySelectorAll('.set-row').length;
    const measurementType = block.getAttribute('data-measurement-type') || getExerciseMeasurementType(block.getAttribute('data-name'), block.getAttribute('data-name'));
    const isDuration = measurementType === 'seconds';
    const repsOnly = measurementType === 'reps';
    
    const row = document.createElement('div');
    row.className = 'set-row';
    row.innerHTML = `
      <span style="font-weight: 900; color: var(--primary);">${setNum}</span>
      ${isDuration
        ? '<input type="number" class="set-seconds" placeholder="sek" min="1" step="1"><span></span>'
        : repsOnly
          ? '<span></span><input type="number" class="set-reps" placeholder="0" min="1" step="1">'
          : '<input type="number" class="set-kg" placeholder="0" step="0.5"><input type="number" class="set-reps" placeholder="0">'}
      <button style="background:none; border:none; color: var(--danger); font-size: 1.3rem; cursor:pointer;" data-action="remove-set-row">×</button>
    `;
    container.appendChild(row);
    const removeSetButton = row.querySelector('[data-action="remove-set-row"]');
    if (removeSetButton) removeSetButton.style.display = activeWorkoutEditMode ? 'inline-flex' : 'none';
    updateProgress();
    saveWorkoutDraft();
  };

  window.removeSetRow = function(btn) {
    const row = btn.parentElement;
    const container = row.parentElement;
    row.remove();

    const rows = container.querySelectorAll('.set-row');
    rows.forEach((r, idx) => {
      if (idx === 0) return;
      const setSpan = r.querySelector('span');
      if (setSpan) setSpan.innerText = idx;
    });

    updateProgress();
    saveWorkoutDraft();
  };

  window.toggleAddCustomModal = function() {
    const modal = document.getElementById('custom-ex-modal');
    modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
    
    const allExercisesSet = new Set();
    cachedHistory.forEach(h => h.exercises?.forEach(e => { if (e.name) allExercisesSet.add(e.name); }));

    const select = document.getElementById('custom-existing-select');
    select.innerHTML = Array.from(allExercisesSet).map(e => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join('');

    setCustomType('existing');
  };

  window.setCustomType = function(type) {
    customExType = type;
    const existingFields = document.getElementById('custom-existing-fields');
    const nameFields = document.getElementById('custom-new-name-fields');
    const cardioFields = document.getElementById('custom-cardio-fields');
    
    const btnExisting = document.getElementById('btn-type-existing');
    const btnCardio = document.getElementById('btn-type-cardio');
    const btnStrength = document.getElementById('btn-type-strength');

    btnExisting.style.borderColor = 'var(--bg-card-border)';
    btnCardio.style.borderColor = 'var(--bg-card-border)';
    btnStrength.style.borderColor = 'var(--bg-card-border)';

    if (type === 'existing') {
      existingFields.style.display = 'block';
      nameFields.style.display = 'none';
      cardioFields.style.display = 'none';
      btnExisting.style.borderColor = 'var(--accent-purple)';
    } else if (type === 'cardio') {
      existingFields.style.display = 'none';
      nameFields.style.display = 'block';
      cardioFields.style.display = 'block';
      btnCardio.style.borderColor = 'var(--accent-purple)';
    } else {
      existingFields.style.display = 'none';
      nameFields.style.display = 'block';
      cardioFields.style.display = 'none';
      btnStrength.style.borderColor = 'var(--accent-purple)';
    }
  };

  window.appendCustomExercise = function() {
    let name = '';
    if (customExType === 'existing') {
      name = document.getElementById('custom-existing-select').value;
    } else {
      name = document.getElementById('custom-name').value.trim();
    }

    const notes = document.getElementById('custom-notes').value.trim();
    if (!name) { ShowToast('Unesite ili izaberite naziv vježbe!', 'error'); return; }

    const container = document.getElementById('active-exercises-container');
    
    if (container.children.length === 1 && !container.children[0].classList.contains('exercise-block')) {
      container.innerHTML = '';
    }

    if (customExType === 'cardio') {
      const min = document.getElementById('custom-minutes').value;
      const cal = document.getElementById('custom-calories').value;

      const card = document.createElement('div');
      card.className = 'card exercise-block custom-cardio-block';
      card.setAttribute('data-name', name);
      card.setAttribute('data-is-cardio', 'true');
      card.setAttribute('data-minutes', min || '0');
      card.setAttribute('data-calories', cal || '0');

      card.innerHTML = `
        <div class="flex-between">
          <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--accent-purple);">${escapeHtml(name)} 🏃‍♂️</h3>
          <button class="btn-remove-ex" style="display:none;" data-action="remove-exercise">Ukloni 🗑️</button>
        </div>
        <div style="font-size: 0.9rem; color: #fff; margin: 8px 0;">
          ${min ? `⏱️ <strong>${escapeHtml(min)} min</strong>` : ''} ${cal ? ` · 🔥 <strong>${escapeHtml(cal)} kcal</strong>` : ''}
        </div>
        ${notes ? `<div style="font-size:0.8rem; color:var(--text-muted);">📝 ${escapeHtml(notes)}</div>` : ''}
        <input type="hidden" class="ex-note" value="${escapeHtml(notes)}">
      `;
      container.appendChild(card);
      ensureExerciseEditControls(card);
    } else {
      const maxW = getMaxWeightFromHistory(name);
      const targetGoal = calculateTargetGoal(name);
      const isDuration = isDurationExercise(name);

      let prevLogStr = 'Nema prošlog zapisa';
      let prevNote = '';
      for (let i = 0; i < cachedHistory.length; i++) {
        const pastEx = cachedHistory[i].exercises?.find(e => e.name === name);
        if (pastEx && pastEx.sets && pastEx.sets.length > 0) {
          prevLogStr = pastEx.sets.map(s => formatSetPerformance(s, name)).join(' | ');
          if (pastEx.notes) prevNote = pastEx.notes;
          break;
        }
      }

      const card = document.createElement('div');
      card.className = 'card exercise-block';
      card.setAttribute('data-name', name);
         card.setAttribute('data-maxw', maxW);
         card.setAttribute('data-measurement-type', isDuration ? 'seconds' : 'weight_reps');

      card.innerHTML = `
        <div class="flex-between">
          <h3 style="font-size: 1.15rem; font-weight: 800;">${escapeHtml(name)}</h3>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="pr-badge-slot"></span>
            <button class="btn-remove-ex" style="display:none;" data-action="remove-exercise">Ukloni 🗑️</button>
          </div>
        </div>
        ${targetGoal ? `<span class="target-badge">${escapeHtml(targetGoal)}</span>` : ''}
        <div class="prev-perf">
          Prošli put: <strong>${escapeHtml(prevLogStr)}</strong>
          ${prevNote ? `<br><small style="color: #94a3b8;">📝 Napomena: ${escapeHtml(prevNote)}</small>` : ''}
        </div>
        <div class="sets-container">
          <div class="set-row">
            <span style="font-size: 0.7rem; color: var(--text-muted); font-weight:800;">SET</span>
            <span style="font-size: 0.7rem; color: var(--text-muted); text-align: center; font-weight:800;">${isDuration ? 'SEC' : 'KG'}</span>
            <span style="font-size: 0.7rem; color: var(--text-muted); text-align: center; font-weight:800;">${isDuration ? '' : 'REPS'}</span>
            <span></span>
          </div>
        </div>
        <button class="btn btn-secondary mt-12 set-edit-add" style="display:none; padding: 10px; font-size: 0.85rem;" data-action="add-set-row">+ Dodaj Set</button>
        <input type="text" class="note-input ex-note" value="${escapeHtml(notes)}" placeholder="✏️ Napomena za ovu vježbu (opcionalno)...">
      `;
      container.appendChild(card);
      ensureExerciseEditControls(card);
      const btn = card.querySelector('.btn-secondary');
      addSetRowToBlock(btn); addSetRowToBlock(btn); addSetRowToBlock(btn);
    }

    document.getElementById('custom-name').value = '';
    document.getElementById('custom-minutes').value = '';
    document.getElementById('custom-calories').value = '';
    document.getElementById('custom-notes').value = '';
    document.getElementById('custom-ex-modal').style.display = 'none';
    updateProgress();
    saveWorkoutDraft();
  };

  window.checkPR = function(inputEl) {
    const block = inputEl.closest('.exercise-block');
    if (!block) return;
    const maxW = parseFloat(block.getAttribute('data-maxw')) || 0;
    const currentVal = parseFloat(inputEl.value) || 0;
    const badgeSlot = block.querySelector('.pr-badge-slot');

    if (maxW > 0 && currentVal > maxW && badgeSlot) {
      badgeSlot.innerHTML = `<span class="pr-badge">🔥 NOVI PR!</span>`;
    } else if (badgeSlot) {
      badgeSlot.innerHTML = '';
    }
  };

  function updateProgress() {
    const allBlocks = document.querySelectorAll('.exercise-block');
    let total = 0;
    let completed = 0;

    allBlocks.forEach(b => {
      if (b.classList.contains('custom-cardio-block')) {
        total++; completed++;
      } else {
        const rows = b.querySelectorAll('.set-row');
        rows.forEach((row, idx) => {
          if (idx === 0) return;
          total++;
          const seconds = row.querySelector('.set-seconds')?.value;
          const kg = row.querySelector('.set-kg')?.value;
          const reps = row.querySelector('.set-reps')?.value;
          if (seconds || (kg && reps)) completed++;
        });
      }
    });

    const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
    const bar = document.getElementById('workout-progress');
    if (bar) bar.style.width = `${pct}%`;
  }

  window.cancelWorkout = async function() {
    if (await showConfirm('Odustati od treninga?')) {
      currentWorkout = null;
      activeWorkoutEditMode = false;
      clearWorkoutDraft();
      switchTab('dashboard');
    }
  };

  function createWorkoutId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `workout-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }

  function getPendingWorkoutKey(userId) {
    return `gym_pending_workouts_v1_${userId}`;
  }

  function openPendingWorkoutsDb() {
    if (pendingDbPromise) return pendingDbPromise;
    pendingDbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB nije dostupan'));
        return;
      }
      const request = indexedDB.open('gym-tracker-offline', 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('pendingWorkouts')) {
          request.result.createObjectStore('pendingWorkouts', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB greška'));
    });
    return pendingDbPromise;
  }

  function readLegacyPendingWorkouts(userId) {
    try {
      const raw = localStorage.getItem(getPendingWorkoutKey(userId));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async function loadPendingWorkouts(userId) {
    try {
      const dbInstance = await openPendingWorkoutsDb();
      const stored = await new Promise((resolve, reject) => {
        const request = dbInstance.transaction('pendingWorkouts', 'readonly')
          .objectStore('pendingWorkouts').getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      const legacy = readLegacyPendingWorkouts(userId);
      const merged = [...stored.filter((item) => item.userId === userId), ...legacy]
        .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index)
        .map((item) => ({ ...item, userId }));
      await savePendingWorkouts(userId, merged);
      localStorage.removeItem(getPendingWorkoutKey(userId));
      pendingWorkoutsMemory = merged;
    } catch (error) {
      pendingWorkoutsMemory = readLegacyPendingWorkouts(userId);
      console.warn('IndexedDB nije dostupan; koristi se privremeni fallback.', error);
    }
    pendingWorkoutsLoaded = true;
    renderPendingSyncStatus();
  }

  async function savePendingWorkouts(userId, queue) {
    pendingWorkoutsMemory = queue;
    try {
      const dbInstance = await openPendingWorkoutsDb();
      await new Promise((resolve, reject) => {
        const transaction = dbInstance.transaction('pendingWorkouts', 'readwrite');
        const store = transaction.objectStore('pendingWorkouts');
        const keepIds = new Set(queue.map((item) => item.id));
        const existingRequest = store.getAll();
        existingRequest.onsuccess = () => {
          (existingRequest.result || []).forEach((item) => {
            if (item.userId === userId && !keepIds.has(item.id)) store.delete(item.id);
          });
          queue.forEach((item) => store.put({ ...item, userId }));
        };
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      localStorage.setItem(getPendingWorkoutKey(userId), JSON.stringify(queue));
      console.warn('Red je sačuvan u fallback localStorage:', error);
    }
  }

  function isOfflineError(error) {
    const message = String(error?.message || '').toLowerCase();
    return !navigator.onLine
      || ['unavailable', 'deadline-exceeded', 'internal'].includes(error?.code)
      || message.includes('network')
      || message.includes('failed to fetch')
      || message.includes('offline')
      || message.includes('timeout');
  }

  function setDocWithNetworkTimeout(reference, data, timeoutMs = 6000) {
    if (!navigator.onLine) {
      const offlineError = new Error('offline');
      offlineError.code = 'unavailable';
      return Promise.reject(offlineError);
    }
    let timeoutId;
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        const timeoutError = new Error('network timeout');
        timeoutError.code = 'unavailable';
        reject(timeoutError);
      }, timeoutMs);
    });
    return Promise.race([setDoc(reference, data), timeout]).finally(() => clearTimeout(timeoutId));
  }

  async function queueWorkoutForSync(workoutId, workoutData) {
    const queue = pendingWorkoutsMemory;
    if (!queue.some((item) => item.id === workoutId)) {
      queue.push({ id: workoutId, userId: currentUser.uid, data: workoutData, queuedAt: Date.now(), status: 'pending' });
      await savePendingWorkouts(currentUser.uid, queue);
    }
    const localCopy = { ...workoutData, _localId: workoutId, _syncStatus: 'pending' };
    cachedHistory = [localCopy, ...cachedHistory.filter((item) => item._localId !== workoutId)].slice(0, 30);
    writeHistoryCache(currentUser.uid, cachedHistory);
    schedulePendingWorkoutSync();
  }

  function hasPendingWorkoutsForCurrentUser() {
    return Boolean(currentUser) && pendingWorkoutsMemory.some((item) => item.userId === currentUser.uid);
  }

  function clearPendingWorkoutSyncRetry() {
    if (pendingSyncRetryTimer) {
      window.clearTimeout(pendingSyncRetryTimer);
      pendingSyncRetryTimer = null;
    }
    pendingSyncRetryDelayMs = PENDING_SYNC_RETRY_MIN_MS;
  }

  function schedulePendingWorkoutSync(delayMs = pendingSyncRetryDelayMs) {
    if (!currentUser || !navigator.onLine || !hasPendingWorkoutsForCurrentUser() || pendingSyncRetryTimer) return;
    pendingSyncRetryTimer = window.setTimeout(async () => {
      pendingSyncRetryTimer = null;
      await syncPendingWorkouts();
    }, Math.max(0, delayMs));
  }

  async function syncPendingWorkouts() {
    if (!currentUser || !navigator.onLine || pendingSyncInProgress) return;
    const queue = pendingWorkoutsMemory.filter((item) => item.userId === currentUser.uid);
    if (queue.length === 0) {
      clearPendingWorkoutSyncRetry();
      return;
    }
    pendingSyncInProgress = true;
    renderPendingSyncStatus();

    const remaining = [];
    let syncedCount = 0;
    try {
    for (const item of queue) {
      item.status = 'syncing';
      await savePendingWorkouts(currentUser.uid, queue);
      renderPendingSyncStatus();
      try {
        await setDocWithNetworkTimeout(doc(db, 'workouts', item.id), item.data);
        item.status = 'synced';
        syncedCount += 1;
      } catch (error) {
        item.status = 'error';
        item.error = String(error?.message || 'Slanje nije uspjelo');
        remaining.push(item);
        if (!isOfflineError(error)) console.error('Greška pri sinhronizaciji treninga:', error);
      }
    }
    await savePendingWorkouts(currentUser.uid, remaining);
    if (remaining.length && navigator.onLine) {
      pendingSyncRetryDelayMs = Math.min(pendingSyncRetryDelayMs * 2, PENDING_SYNC_RETRY_MAX_MS);
      schedulePendingWorkoutSync();
    } else if (remaining.length === 0) {
      clearPendingWorkoutSyncRetry();
    }
    renderPendingSyncStatus();
    if (syncedCount > 0) {
      await loadCloudData();
      ShowToast(remaining.length ? `Sinhronizovano: ${syncedCount}. Čeka još: ${remaining.length}.` : 'Trening sinhronizovan sa Cloudom.');
    }
    } finally {
      pendingSyncInProgress = false;
    }
  }

  window.syncPendingWorkoutsNow = syncPendingWorkouts;

  window.finishWorkout = async function() {
    if (!currentUser) {
      ShowToast("Morate biti prijavljeni da biste sačuvali trening!", 'error');
      return;
    }

    const blocks = document.querySelectorAll('.exercise-block');
    const workoutId = createWorkoutId();
    const startedAt = currentWorkout?.date ? new Date(currentWorkout.date).getTime() : Date.now();
    const durationSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
    const workoutData = { 
      userId: currentUser.uid,
      userEmail: currentUser.email,
      name: currentWorkout ? currentWorkout.name : "Trening", 
      date: new Date().toISOString(), 
      durationSeconds,
      exercises: [] 
    };

    blocks.forEach(b => {
      const exName = b.getAttribute('data-name');
      const noteText = b.querySelector('.ex-note')?.value.trim() || '';

      if (b.classList.contains('custom-cardio-block')) {
        const min = parseFloat(b.querySelector('.cardio-minutes')?.value || b.getAttribute('data-minutes')) || 0;
        const cal = parseFloat(b.querySelector('.cardio-calories')?.value || b.getAttribute('data-calories')) || 0;
        const exObj = { name: exName, minutes: min, calories: cal, sets: [] };
        if (noteText) exObj.notes = noteText;
        workoutData.exercises.push(exObj);
      } else {
        const sets = [];
        const measurementType = b.getAttribute('data-measurement-type') || getExerciseMeasurementType(exName, exName);
        const isDuration = measurementType === 'seconds';
        b.querySelectorAll('.set-row').forEach((row, idx) => {
          if (idx === 0) return;
          if (isDuration) {
            const seconds = row.querySelector('.set-seconds')?.value;
            if (seconds) sets.push({ seconds: parseInt(seconds, 10) });
            } else if (measurementType === 'reps') {
              const reps = row.querySelector('.set-reps')?.value;
              if (reps) sets.push({ reps: parseInt(reps, 10) });
            } else {
            const kg = row.querySelector('.set-kg')?.value;
            const reps = row.querySelector('.set-reps')?.value;
            if (kg && reps) sets.push({ weight: parseFloat(kg), reps: parseInt(reps, 10) });
          }
        });

        if (sets.length > 0) {
          const exObj = { name: exName, sets: sets };
          if (noteText) exObj.notes = noteText;
          workoutData.exercises.push(exObj);
        }
      }
    });

    if (workoutData.exercises.length === 0) {
      ShowToast('Unesite bar jednu kompletiranu vježbu ili kardio!', 'error');
      return;
    }

    try {
      await setDocWithNetworkTimeout(doc(db, "workouts", workoutId), workoutData);
      
      vibrate([100, 50, 100]);
      ShowToast('Trening sačuvan u "workouts" kolekciju! ☁️💪');
      
      currentWorkout = null;
      clearWorkoutDraft();
      await loadCloudData();
      switchTab('dashboard');
    } catch (e) {
      if (isOfflineError(e)) {
        await queueWorkoutForSync(workoutId, workoutData);
        currentWorkout = null;
        clearWorkoutDraft();
        renderDashboard();
        ShowToast('Sačuvano na uređaju — čeka internet.');
        switchTab('dashboard');
        return;
      }
      console.error("Greška pri čuvanju: ", e);
      ShowToast('Greška pri čuvanju na cloud: ' + e.message, 'error');
    }
  };

function getHistoryCacheKey(userId) {
  return `gym_history_cache_v${HISTORY_CACHE_VERSION}_${userId}`;
}

function readHistoryCache(userId) {
  try {
    const raw = localStorage.getItem(getHistoryCacheKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 30) : [];
  } catch {
    return [];
  }
}

function writeHistoryCache(userId, history) {
  try {
    localStorage.setItem(getHistoryCacheKey(userId), JSON.stringify(history.slice(0, 30)));
  } catch (error) {
    console.warn('Lokalni cache istorije nije mogao biti sačuvan:', error);
  }
}

async function loadCloudData() {
  if (!currentUser) return;
  cachedHistory = readHistoryCache(currentUser.uid);
  checkDraftState();
  renderDashboard();
  try {
    const q = query(
      collection(db, "workouts"), 
      where("userId", "==", currentUser.uid),
      orderBy("date", "desc"),
      limit(30)
    );
    const querySnapshot = await getDocs(q);
    cachedHistory = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.date && data.exercises && data.exercises.length > 0) {
        // Keep the Firestore document ID only in local memory/cache. It is needed
        // for targeted edits and deletes, but is never written into the workout.
        cachedHistory.push({ id: docSnap.id, ...data });
      }
    });
    writeHistoryCache(currentUser.uid, cachedHistory);
    checkDraftState();
    renderDashboard();
    if (document.getElementById('view-history')?.classList.contains('active')) renderHistory();
  } catch (e) {
    console.error("Greška pri učitavanju sa clouda: ", e);
  }
}

function renderPendingSyncStatus() {
  const container = document.getElementById('pending-sync-container');
  if (!container || !currentUser) return;
  const pending = pendingWorkoutsMemory.filter((item) => item.userId === currentUser.uid);
  if (pending.length === 0) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  const connectionText = navigator.onLine ? 'Internet je dostupan — pokušavam poslati.' : 'Čeka internetnu vezu.';
  const rows = pending.map((item) => {
    const name = item.data?.name || 'Trening';
    const date = item.data?.date ? formatDateClean(item.data.date, false) : 'Novi zapis';
    const status = item.status === 'syncing' ? 'Šalje se…' : item.status === 'error' ? `Greška: ${item.error || 'pokušaj ponovo'}` : 'Čeka sinhronizaciju';
    return `<li style="margin: 6px 0;"><strong>${escapeHtml(name)}</strong><span style="color:var(--text-muted);"> · ${escapeHtml(date)} · ${escapeHtml(status)}</span></li>`;
  }).join('');

  container.style.display = 'block';
  container.innerHTML = `
    <div class="flex-between" style="gap: 10px; align-items: flex-start;">
      <div>
        <strong style="color: var(--accent-purple);">⏳ ${pending.length} trening${pending.length === 1 ? '' : 'a'} čeka sinhronizaciju</strong>
        <div style="color:var(--text-muted); font-size:0.85rem; margin-top:4px;">${connectionText}</div>
      </div>
      <button class="btn btn-secondary" style="width:auto; padding:8px 10px; font-size:0.8rem;" data-action="sync-pending-workouts">Pokušaj sada</button>
    </div>
    <ul style="margin: 10px 0 0 18px; padding:0;">${rows}</ul>`;
}

  function renderDashboard() {
    const greeting = document.getElementById('dashboard-greeting');
    if (greeting) greeting.textContent = getDashboardGreeting();
    renderDashboardPrimaryAction();
    renderWeeklyGoalCard();
    renderPendingSyncStatus();
    const container = document.getElementById('last-workout-container');
    if (cachedHistory.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted);">Još nema zapisa na Cloud-u.</p>';
      return;
    }

    const last = cachedHistory[0];
    const dateStr = formatDateClean(last.date, false);

    const exercisesHtml = last.exercises.map(ex => {
      let contentHtml = '';
      if (ex.sets && ex.sets.length > 0) {
        contentHtml = ex.sets.map(s => `<span style="background: rgba(255,255,255,0.06); border: 1px solid var(--bg-card-border); padding: 4px 10px; border-radius: 8px; font-size: 0.8rem; font-weight: 800; color: #fff;">${escapeHtml(formatSetPerformance(s, ex))}</span>`).join(' ');
      } else if (ex.minutes || ex.calories) {
        contentHtml = `<span style="background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3); padding: 4px 10px; border-radius: 8px; font-size: 0.8rem; font-weight: 800; color: var(--accent-purple);">${ex.minutes ? escapeHtml(ex.minutes) + ' min' : ''} ${ex.calories ? '· ' + escapeHtml(ex.calories) + ' kcal' : ''}</span>`;
      }

      return `
        <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--bg-card-border);">
          <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-main); margin-bottom: 6px;">${escapeHtml(ex.name)}</div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">${contentHtml}</div>
          ${ex.notes ? `<div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 5px;">📝 ${escapeHtml(ex.notes)}</div>` : ''}
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="flex-between" style="margin-bottom: 6px;">
        <strong style="font-size: 1.25rem; font-weight: 900; color: #fff;">${escapeHtml(last.name || 'Trening')}</strong>
        <span class="badge" style="color: var(--primary); font-size: 0.8rem;">${dateStr}</span>
      </div>
      ${exercisesHtml}
    `;
  }

  function getWeeklyGoalStorageKey(userId = currentUser?.uid) {
    return userId ? `gym_weekly_goal_v1_${userId}` : '';
  }

  function getWeeklyTrainingGoal() {
    const saved = Number(localStorage.getItem(getWeeklyGoalStorageKey()));
    if (Number.isInteger(saved) && saved >= 1 && saved <= 7) return saved;
    const profileGoal = Number(currentProfileData?.trainingFrequency);
    return Number.isInteger(profileGoal) && profileGoal >= 1 && profileGoal <= 7 ? profileGoal : 3;
  }

  function getLocalWeekStart(date) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return start;
  }

  function getWorkoutDate(workout) {
    const raw = workout?.date;
    // A date-only string represents the user's local training day, not midnight UTC.
    // Parsing it at local noon keeps the day stable across time zones and DST changes.
    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [year, month, day] = raw.split('-').map(Number);
      return new Date(year, month - 1, day, 12);
    }
    const date = raw?.toDate instanceof Function ? raw.toDate() : new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function getLocalCalendarDayKey(date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  function getWeeklyTrainingDayCounts() {
    const daysByWeek = new Map();
    for (const workout of cachedHistory) {
      const date = getWorkoutDate(workout);
      if (!date) continue;
      const start = getLocalWeekStart(date);
      const weekKey = getLocalCalendarDayKey(start);
      if (!daysByWeek.has(weekKey)) daysByWeek.set(weekKey, new Set());
      daysByWeek.get(weekKey).add(getLocalCalendarDayKey(date));
    }
    return new Map(Array.from(daysByWeek, ([weekKey, days]) => [weekKey, days.size]));
  }

  function getWeekCount(counts, start) {
    return counts.get(getLocalCalendarDayKey(start)) || 0;
  }

  function getWeeklyStreak(counts, goal, currentWeekStart, currentWeekCount) {
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    if (getWeekCount(counts, previousWeekStart) < goal) return null;

    let weeks = 0;
    let cursor = new Date(previousWeekStart);
    let reachedCacheLimit = false;
    const validDates = cachedHistory.map(getWorkoutDate).filter(Boolean);
    const oldestDate = validDates.length ? new Date(Math.min(...validDates.map((date) => date.getTime()))) : null;
    const oldestWeekStart = oldestDate ? getLocalWeekStart(oldestDate) : null;

    while (weeks < 260) {
      if (getWeekCount(counts, cursor) < goal) break;
      weeks += 1;
      cursor.setDate(cursor.getDate() - 7);
      if (oldestWeekStart && cursor < oldestWeekStart) {
        reachedCacheLimit = cachedHistory.length >= 30;
        break;
      }
    }

    if (currentWeekCount >= goal) weeks += 1;
    return { weeks, reachedCacheLimit };
  }

  function getWeeklyGoalCopy(language = getCurrentLanguage()) {
    const copy = {
      sr: {
        title: 'Sedmični cilj',
        thisWeek: 'Ove sedmice',
        count: (count, goal) => `${count} od ${goal} treninga`,
        remaining: (count) => count === 1 ? 'Još jedan trening do cilja.' : `Još ${count} treninga do cilja.`,
        achieved: 'Sedmični cilj ostvaren. Svaka čast!',
        newWeek: 'Nova sedmica, novi početak.',
        none: 'Još nema treninga ove sedmice.',
        streak: (weeks, plus) => `${weeks}${plus ? '+' : ''} ${weeks === 1 ? 'sedmica' : 'sedmice'} u nizu`,
        goalLabel: (goal) => `${goal} ${goal === 1 ? 'trening' : 'treninga'} sedmično`,
        eyebrow: 'SEDMIČNI CILJ',
        settingTitle: 'Koliko treninga želiš sedmično?',
        settingHelp: 'Izaberi cilj koji ti odgovara. Možeš ga promijeniti kad god želiš.',
        settingLabel: 'Treninzi sedmično',
        save: 'Sačuvaj cilj',
        localNote: 'Ovaj cilj se čuva na ovom uređaju.',
        saved: 'Sedmični cilj je sačuvan.'
      },
      en: {
        title: 'Weekly goal',
        thisWeek: 'This week',
        count: (count, goal) => `${count} of ${goal} ${goal === 1 ? 'workout' : 'workouts'}`,
        remaining: (count) => `${count} ${count === 1 ? 'workout' : 'workouts'} left to reach your goal.`,
        achieved: 'Weekly goal reached. Well done!',
        newWeek: 'New week, fresh start.',
        none: 'No workouts yet this week.',
        streak: (weeks, plus) => `${weeks}${plus ? '+' : ''} ${weeks === 1 ? 'week' : 'weeks'} in a row`,
        goalLabel: (goal) => `${goal} ${goal === 1 ? 'workout' : 'workouts'} per week`,
        eyebrow: 'WEEKLY GOAL',
        settingTitle: 'How many workouts per week?',
        settingHelp: 'Choose a goal that works for you. You can change it any time.',
        settingLabel: 'Workouts per week',
        save: 'Save goal',
        localNote: 'This goal is saved on this device.',
        saved: 'Weekly goal saved.'
      },
      de: {
        title: 'Wochenziel',
        thisWeek: 'Diese Woche',
        count: (count, goal) => `${count} von ${goal} ${goal === 1 ? 'Training' : 'Trainingseinheiten'}`,
        remaining: (count) => `Noch ${count} ${count === 1 ? 'Training' : 'Trainingseinheiten'} bis zum Ziel.`,
        achieved: 'Wochenziel erreicht. Gut gemacht!',
        newWeek: 'Neue Woche, neuer Anfang.',
        none: 'Diese Woche noch kein Training.',
        streak: (weeks, plus) => `${weeks}${plus ? '+' : ''} ${weeks === 1 ? 'Woche' : 'Wochen'} in Folge`,
        goalLabel: (goal) => `${goal} ${goal === 1 ? 'Training' : 'Trainingseinheiten'} pro Woche`,
        eyebrow: 'WOCHENZIEL',
        settingTitle: 'Wie oft möchtest du pro Woche trainieren?',
        settingHelp: 'Wähle ein passendes Ziel. Du kannst es jederzeit ändern.',
        settingLabel: 'Trainingseinheiten pro Woche',
        save: 'Ziel speichern',
        localNote: 'Dieses Ziel wird auf diesem Gerät gespeichert.',
        saved: 'Wochenziel gespeichert.'
      }
    }[language] || getWeeklyGoalCopy('sr');

    if (language === 'sr') {
      Object.assign(copy, {
        count: (count, goal) => `${count} od ${goal} dana treninga`,
        remaining: (count) => count === 1 ? 'Jo\u0161 jedan dan do cilja.' : `Jo\u0161 ${count} dana do cilja.`,
        achieved: 'Sedmi\u010dni cilj ostvaren. Svaka \u010dast!',
        none: 'Jo\u0161 nisi trenirao/la ove sedmice.',
        goalLabel: (goal) => goal === 1 ? '1 dan treninga sedmi\u010dno' : `${goal} dana treninga sedmi\u010dno`,
        settingTitle: 'Koliko dana želiš trenirati sedmično?',
        settingHelp: 'Ako trenira\u0161 vi\u0161e puta istog dana, taj dan se broji jednom.',
        settingLabel: 'Dana treninga sedmi\u010dno'
      });
    } else if (language === 'en') {
      Object.assign(copy, {
        count: (count, goal) => `${count} of ${goal} workout days`,
        remaining: (count) => `${count} ${count === 1 ? 'day' : 'days'} left to reach your goal.`,
        achieved: 'Weekly goal reached. Well done!',
        none: 'You have not trained yet this week.',
        goalLabel: (goal) => `${goal} workout days per week`,
        settingTitle: 'How many days would you like to train each week?',
        settingHelp: 'If you work out more than once on the same day, it counts as one day.',
        settingLabel: 'Workout days per week'
      });
    } else if (language === 'de') {
      Object.assign(copy, {
        count: (count, goal) => `${count} von ${goal} Trainingstagen`,
        remaining: (count) => `Noch ${count} ${count === 1 ? 'Tag' : 'Tage'} bis zum Ziel.`,
        achieved: 'Wochenziel erreicht. Gut gemacht!',
        none: 'Diese Woche hast du noch nicht trainiert.',
        goalLabel: (goal) => `${goal} Trainingstage pro Woche`,
        settingTitle: 'An wie vielen Tagen möchtest du pro Woche trainieren?',
        settingHelp: 'Mehrere Workouts am selben Tag zählen als ein Trainingstag.',
        settingLabel: 'Trainingstage pro Woche'
      });
    }

    return copy;
  }

  function renderWeeklyGoalCard() {
    const card = document.getElementById('weekly-goal-card');
    if (!card || !currentUser) { if (card) card.hidden = true; return; }

    const language = getCurrentLanguage();
    const copy = getWeeklyGoalCopy(language);
    const goal = getWeeklyTrainingGoal();
    const now = new Date();
    const currentWeekStart = getLocalWeekStart(now);
    const counts = getWeeklyTrainingDayCounts();
    const thisWeekCount = getWeekCount(counts, currentWeekStart);
    const remaining = Math.max(0, goal - thisWeekCount);
    const streak = getWeeklyStreak(counts, goal, currentWeekStart, thisWeekCount);
    let message;
    if (remaining === 0) message = copy.achieved;
    else if (thisWeekCount === 0) {
      message = now.getDay() === 1 ? copy.newWeek : (language === 'sr'
        ? genderText('Još nisi trenirao ove sedmice.', 'Još nisi trenirala ove sedmice.', 'Još nisi trenirao/la ove sedmice.')
        : copy.none);
    }
    else message = copy.remaining(remaining);

    const progress = Math.min(100, Math.round((thisWeekCount / goal) * 100));
    const countText = copy.count(thisWeekCount, goal);
    const streakMarkup = streak
      ? `<span class="weekly-goal-streak">⚡ ${escapeHtml(copy.streak(streak.weeks, streak.reachedCacheLimit))}</span>`
      : '';
    card.innerHTML = `<div class="weekly-goal-heading"><div><span class="weekly-goal-eyebrow">${escapeHtml(copy.title)}</span><strong>${escapeHtml(copy.thisWeek)}</strong></div>${streakMarkup}</div><div class="weekly-goal-stats"><strong>${escapeHtml(countText)}</strong><span>${escapeHtml(copy.goalLabel(goal))}</span></div><div class="weekly-goal-progress" role="progressbar" aria-label="${escapeHtml(copy.title)}" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${Math.min(thisWeekCount, goal)}"><span style="width:${progress}%"></span></div><p class="weekly-goal-message">${escapeHtml(message)}</p>`;
    card.hidden = false;
  }

  function renderWeeklyGoalSettingsSummary() {
    const summary = document.getElementById('weekly-goal-settings-summary');
    if (summary) summary.textContent = getWeeklyGoalCopy().goalLabel(getWeeklyTrainingGoal());
  }

  window.openWeeklyGoalSettings = function() {
    if (!currentUser) return;
    const language = getCurrentLanguage();
    const copy = getWeeklyGoalCopy(language);
    const modal = document.getElementById('weekly-goal-settings-modal');
    const select = document.getElementById('weekly-goal-select');
    if (!modal || !select) return;
    document.getElementById('weekly-goal-modal-eyebrow').textContent = copy.eyebrow;
    document.getElementById('weekly-goal-modal-title').textContent = copy.settingTitle;
    document.getElementById('weekly-goal-modal-help').textContent = copy.settingHelp;
    document.getElementById('weekly-goal-modal-label').textContent = copy.settingLabel;
    document.querySelector('#weekly-goal-settings-modal [data-action="save-weekly-goal"]').textContent = copy.save;
    document.getElementById('weekly-goal-local-note').textContent = copy.localNote;
    select.innerHTML = Array.from({ length: 7 }, (_, index) => {
      const goal = index + 1;
      return `<option value="${goal}">${escapeHtml(copy.goalLabel(goal))}</option>`;
    }).join('');
    select.value = String(getWeeklyTrainingGoal());
    document.getElementById('weekly-goal-settings-status').textContent = '';
    modal.style.display = 'flex';
  };

  window.saveWeeklyGoal = function() {
    if (!currentUser) return;
    const goal = Number(document.getElementById('weekly-goal-select')?.value);
    if (!Number.isInteger(goal) || goal < 1 || goal > 7) return;
    try {
      localStorage.setItem(getWeeklyGoalStorageKey(), String(goal));
      document.getElementById('weekly-goal-settings-modal').style.display = 'none';
      renderWeeklyGoalSettingsSummary();
      renderWeeklyGoalCard();
      ShowToast(getWeeklyGoalCopy().saved);
    } catch (error) {
      console.warn('Sedmični cilj nije mogao biti sačuvan lokalno:', error);
      const status = document.getElementById('weekly-goal-settings-status');
      if (status) status.textContent = getCurrentLanguage() === 'en' ? 'Could not save this goal on this device.' : getCurrentLanguage() === 'de' ? 'Das Ziel konnte auf diesem Gerät nicht gespeichert werden.' : 'Cilj nije moguće sačuvati na ovom uređaju.';
    }
  };

  function renderDashboardPrimaryAction() {
    const button = document.getElementById('dashboard-primary-action');
    const help = document.getElementById('dashboard-primary-help');
    const guide = document.getElementById('dashboard-guide');
    const comingSoon = document.getElementById('dashboard-coming-soon');
    if (!button || !help) return;

    const activePlans = userRoutines.filter((routine) => routine.isArchived !== true);
    const hasFinishedWorkout = cachedHistory.length > 0;
    if (guide) guide.hidden = activePlans.length > 0 && hasFinishedWorkout;
    if (comingSoon) comingSoon.hidden = activePlans.length > 0;
    delete button.dataset.routineId;
    delete button.dataset.tab;
    if (!activePlans.length) {
      button.dataset.action = 'open-create-routine';
      button.textContent = '➕ Napravi prvi plan';
      help.textContent = 'Počni sa jednim planom treninga koji želiš ponavljati.';
      return;
    }
    button.dataset.action = 'switch-tab';
    button.dataset.tab = 'workouts';
    button.textContent = 'Započni trening';
    help.textContent = 'Izaberi plan koji danas želiš raditi.';
  }

  function parseWorkoutsFromText(rawText) {
    const lines = rawText.split('\n');
    const routines = [];
    
    let currentRoutineName = null;
    let currentExercises = [];
    let sawBlankLine = false;

    const restKeywords = ['odmor', 'oporavak', 'rest', 'off day'];
    const ignoreKeywords = ['trajanje:', 'minuta', 'zagrevanje', 'hlađenje'];

    function saveCurrentRoutine() {
      if (currentRoutineName && currentExercises.length > 0) {
        const isRest = restKeywords.some(keyword => currentRoutineName.toLowerCase().includes(keyword));
        if (!isRest) {
          routines.push({
            name: currentRoutineName,
            emoji: getEmojiForRoutine(currentRoutineName),
            exercises: currentExercises.map((exercise) => normalizeRoutineExercise(exercise))
          });
        }
      }
    }

    lines.forEach(line => {
      let cleanLine = line.trim();
      if (!cleanLine) {
        if (currentRoutineName && currentExercises.length > 0) sawBlankLine = true;
        return;
      }

      const isIgnored = ignoreKeywords.some(k => cleanLine.toLowerCase().startsWith(k));
      if (isIgnored) return;

      const isDayHeader = /^(dan\s*\d+|day\s*\d+|ponedjeljak|utorak|srijeda|četvrtak|petak|subota|nedjelja|gornji|donji|full body|kardio)/i.test(cleanLine);
      const hasSetsReps = /\d+\s*x\s*\d+/i.test(cleanLine);

      const isNewRoutineAfterSeparator = currentRoutineName && sawBlankLine && !hasSetsReps;

      if ((isDayHeader || !hasSetsReps) && !currentRoutineName) {
        currentRoutineName = cleanLine.replace(/^[-–—:]\s*/, '').trim();
      } else if ((isDayHeader && hasSetsReps === false) || isNewRoutineAfterSeparator) {
        saveCurrentRoutine();
        currentRoutineName = cleanLine.replace(/^[-–—:]\s*/, '').trim();
        currentExercises = [];
      } else {
        if (!currentRoutineName) {
          currentRoutineName = "Uvezeni Trening";
        }

        const isRestLine = restKeywords.some(k => cleanLine.toLowerCase().includes(k));
        if (!isRestLine) {
          currentExercises.push(cleanLine);
        }
      }
      sawBlankLine = false;
    });

    saveCurrentRoutine();
    return routines;
  }

  window.handleImportFromNotes = async function() {
    if (!currentUser) {
      ShowToast("Morate biti prijavljeni za uvoz plana!", 'error');
      return;
    }

    const areaInput = document.getElementById('importNotesArea');
    const text = areaInput ? areaInput.value.trim() : '';

    if (!text) {
      ShowToast("Molimo unesite tekst sa vježbama!", 'error');
      return;
    }

    const parsedRoutines = parseWorkoutsFromText(text);

    if (parsedRoutines.length === 0) {
      ShowToast("Nije pronađena nijedna važeća rutina ili su svi dani označeni kao odmor.", 'error');
      return;
    }

    const invalidRoutine = parsedRoutines.find((routine) =>
      String(routine.name || '').trim().length === 0
      || String(routine.name || '').trim().length > 120
      || getRoutineExerciseValidationMessage(routine.exercises)
    );
    if (invalidRoutine) {
      ShowToast('Jedan od uvezenih planova ima predug naziv, nevažeću vježbu ili više od 100 vježbi.', 'error');
      return;
    }

    let importedCount = 0;

    try {
      for (const routine of parsedRoutines) {
        const newRoutine = {
          userId: currentUser.uid,
          emoji: routine.emoji || getEmojiForRoutine(routine.name),
          name: routine.name,
          exercises: routine.exercises,
          createdAt: new Date().toISOString()
        };

        await addDoc(collection(db, "routines"), newRoutine);
        importedCount++;
      }

      if (areaInput) areaInput.value = '';
      document.getElementById('importNotesModal').style.display = 'none';

      ShowToast(`Uspješno uvezeno ${importedCount} treninga! 🎉`);
    } catch (error) {
      console.error("Greška pri čuvanju rutine:", error);
      ShowToast("Greška pri uvozu: " + error.message, 'error');
    }
  };

  function renderHistory() {
    const container = document.getElementById('history-container');
    if (cachedHistory.length === 0) {
      container.innerHTML = '<div class="card"><p style="color: var(--text-muted);">Prazno.</p></div>';
      return;
    }

    container.innerHTML = cachedHistory.map(h => {
      const dateStr = formatDateClean(h.date, true);
      
      const exercisesHtml = h.exercises.map(ex => {
        let contentHtml = '';
        if (ex.sets && ex.sets.length > 0) {
          contentHtml = ex.sets.map(s => `<span style="background: rgba(255,255,255,0.06); border: 1px solid var(--bg-card-border); padding: 4px 10px; border-radius: 8px; font-size: 0.8rem; font-weight: 800; color: #fff;">${escapeHtml(formatSetPerformance(s, ex))}</span>`).join(' ');
        } else if (ex.minutes || ex.calories) {
          contentHtml = `<span style="background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3); padding: 4px 10px; border-radius: 8px; font-size: 0.8rem; font-weight: 800; color: var(--accent-purple);">${ex.minutes ? escapeHtml(ex.minutes) + ' min' : ''} ${ex.calories ? '· ' + escapeHtml(ex.calories) + ' kcal' : ''}</span>`;
        }

        return `
          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--bg-card-border);">
            <div style="font-weight: 800; font-size: 0.92rem; color: var(--text-main); margin-bottom: 4px;">${escapeHtml(ex.name)}</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">${contentHtml}</div>
            ${ex.notes ? `<div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">📝 ${escapeHtml(ex.notes)}</div>` : ''}
          </div>
        `;
      }).join('');

      const canEdit = Boolean(h.id && !h._localId && h._syncStatus !== 'pending' && h.userId === currentUser?.uid);
      const actionMarkup = canEdit
        ? `<button class="history-edit-button" type="button" data-action="open-history-workout-editor" data-workout-id="${escapeHtml(h.id)}">\u270e Uredi</button>`
        : h._syncStatus === 'pending' || h._localId
          ? '<span class="history-sync-pending">\u23f3 \u010ceka sinhronizaciju</span>'
          : '';

      return `
        <div class="card history-card">
          <div class="flex-between" style="margin-bottom: 6px;">
            <strong style="font-size: 1.15rem; font-weight: 800;">${escapeHtml(h.name || 'Trening')}</strong>
            <div class="history-card-actions"><span class="badge">${dateStr}</span>${actionMarkup}</div>
          </div>
          ${exercisesHtml}
        </div>
      `;
    }).join('');
  }

  function getHistoryWorkoutForEdit(workoutId) {
    const workout = cachedHistory.find((item) => item.id === workoutId);
    if (!workout || !currentUser || workout.userId !== currentUser.uid) return null;
    if (workout._localId || workout._syncStatus === 'pending') return null;
    return workout;
  }

  function getDateInputValue(dateValue) {
    const date = getWorkoutDate({ date: dateValue });
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getHistoryExerciseType(exercise) {
    if (exercise?._editorType) return exercise._editorType;
    if (Number.isFinite(Number(exercise?.minutes)) || Number.isFinite(Number(exercise?.calories))) return 'cardio';
    const firstSet = Array.isArray(exercise?.sets) ? exercise.sets[0] : null;
    if (firstSet && Object.prototype.hasOwnProperty.call(firstSet, 'seconds')) return 'seconds';
    if (firstSet && Object.prototype.hasOwnProperty.call(firstSet, 'weight')) return 'weight-reps';
    return 'reps';
  }

  function getHistoryEditorExerciseMarkup(exercise, index) {
    const type = getHistoryExerciseType(exercise);
    const name = exercise?.name || '';
    const note = exercise?.notes || '';
    const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
    const setRows = type === 'cardio'
      ? `<div class="history-editor-cardio-fields"><label><span>Trajanje (min)</span><input class="custom-input history-editor-minutes" type="number" min="0" max="1440" step="1" inputmode="numeric" value="${escapeHtml(exercise?.minutes ?? '')}"></label><label><span>Kalorije (opcionalno)</span><input class="custom-input history-editor-calories" type="number" min="0" max="20000" step="1" inputmode="numeric" value="${escapeHtml(exercise?.calories ?? '')}"></label></div>`
      : `<div class="history-editor-sets">${(sets.length ? sets : [{}]).map((set, setIndex) => {
          const fields = type === 'seconds'
            ? `<label><span>Sekunde</span><input class="custom-input history-editor-set-seconds" type="number" min="1" max="86400" step="1" inputmode="numeric" value="${escapeHtml(set.seconds ?? '')}"></label>`
            : type === 'reps'
              ? `<label><span>Ponavljanja</span><input class="custom-input history-editor-set-reps" type="number" min="1" max="1000" step="1" inputmode="numeric" value="${escapeHtml(set.reps ?? '')}"></label>`
              : `<label><span>Kila\u017ea (kg)</span><input class="custom-input history-editor-set-weight" type="number" min="0" max="5000" step="0.1" inputmode="decimal" value="${escapeHtml(set.weight ?? '')}"></label><label><span>Ponavljanja</span><input class="custom-input history-editor-set-reps" type="number" min="1" max="1000" step="1" inputmode="numeric" value="${escapeHtml(set.reps ?? '')}"></label>`;
          return `<div class="history-editor-set-row"><span class="history-editor-set-number">${setIndex + 1}</span>${fields}<button type="button" class="history-editor-remove-set" data-action="remove-history-workout-set" data-exercise-index="${index}" data-set-index="${setIndex}" aria-label="Ukloni seriju">\u00d7</button></div>`;
        }).join('')}<button class="btn btn-secondary history-editor-add-set" type="button" data-action="add-history-workout-set" data-exercise-index="${index}">+ Dodaj seriju</button></div>`;

    return `<article class="history-editor-exercise" data-history-exercise-index="${index}"><div class="history-editor-exercise-heading"><strong>Vje\u017eba ${index + 1}</strong><button type="button" class="history-editor-remove-exercise" data-action="remove-history-workout-exercise" data-exercise-index="${index}">Ukloni vje\u017ebu</button></div><label><span>Naziv vje\u017ebe</span><input class="custom-input history-editor-exercise-name" type="text" maxlength="120" value="${escapeHtml(name)}"></label><label><span>Na\u010din pra\u0107enja</span><select class="custom-input history-editor-exercise-type" data-exercise-index="${index}"><option value="weight-reps" ${type === 'weight-reps' ? 'selected' : ''}>Kila\u017ea i ponavljanja</option><option value="reps" ${type === 'reps' ? 'selected' : ''}>Samo ponavljanja</option><option value="seconds" ${type === 'seconds' ? 'selected' : ''}>Trajanje u sekundama</option><option value="cardio" ${type === 'cardio' ? 'selected' : ''}>Kardio</option></select></label>${setRows}<label><span>Napomena (opcionalno)</span><textarea class="custom-input history-editor-exercise-note" rows="2" maxlength="500">${escapeHtml(note)}</textarea></label></article>`;
  }

  function renderHistoryWorkoutEditorExercises(exercises) {
    const root = document.getElementById('history-workout-editor-exercises');
    if (!root) return;
    root.innerHTML = exercises.map((exercise, index) => getHistoryEditorExerciseMarkup(exercise, index)).join('');
  }

  function readHistoryWorkoutEditorExercises({ strict = false } = {}) {
    const cards = Array.from(document.querySelectorAll('#history-workout-editor-exercises .history-editor-exercise'));
    const exercises = [];
    for (const card of cards) {
      const name = card.querySelector('.history-editor-exercise-name')?.value.trim() || '';
      const type = card.querySelector('.history-editor-exercise-type')?.value || 'weight-reps';
      const notes = card.querySelector('.history-editor-exercise-note')?.value.trim() || '';
      if (!name) {
        if (strict) throw new Error('Svaka vje\u017eba mora imati naziv.');
        continue;
      }
      const exercise = { name, sets: [] };
      if (notes) exercise.notes = notes;
      if (type === 'cardio') {
        const minutes = Number(card.querySelector('.history-editor-minutes')?.value);
        const calories = Number(card.querySelector('.history-editor-calories')?.value);
        if (strict && (!Number.isFinite(minutes) || minutes < 0 || minutes > 1440 || (!minutes && (!Number.isFinite(calories) || calories <= 0)))) throw new Error(`Unesi trajanje ili kalorije za vje\u017ebu „${name}“.`);
        exercise.minutes = Number.isFinite(minutes) && minutes >= 0 ? minutes : 0;
        exercise.calories = Number.isFinite(calories) && calories >= 0 ? calories : 0;
      } else {
        const rows = Array.from(card.querySelectorAll('.history-editor-set-row'));
        for (const row of rows) {
          if (type === 'seconds') {
            const seconds = Number(row.querySelector('.history-editor-set-seconds')?.value);
            if (Number.isFinite(seconds) && seconds > 0) exercise.sets.push({ seconds: Math.round(seconds) });
          } else if (type === 'reps') {
            const reps = Number(row.querySelector('.history-editor-set-reps')?.value);
            if (Number.isFinite(reps) && reps > 0) exercise.sets.push({ reps: Math.round(reps) });
          } else {
            const weight = Number(row.querySelector('.history-editor-set-weight')?.value);
            const reps = Number(row.querySelector('.history-editor-set-reps')?.value);
            if (Number.isFinite(weight) && weight >= 0 && Number.isFinite(reps) && reps > 0) exercise.sets.push({ weight, reps: Math.round(reps) });
          }
        }
        if (strict && !exercise.sets.length) throw new Error(`Unesi barem jednu seriju za vje\u017ebu „${name}“.`);
      }
      exercises.push(exercise);
    }
    if (strict && !exercises.length) throw new Error('Trening mora imati barem jednu zavr\u0161enu vje\u017ebu.');
    return exercises;
  }

  function getHistoryEditorDraftExercises() {
    try { return readHistoryWorkoutEditorExercises(); } catch { return []; }
  }

  function updateHistoryEditorExercises(mutator) {
    const exercises = getHistoryEditorDraftExercises();
    mutator(exercises);
    renderHistoryWorkoutEditorExercises(exercises);
  }

  function refreshWorkoutViews() {
    if (!currentUser) return;
    writeHistoryCache(currentUser.uid, cachedHistory);
    renderHistory();
    renderDashboard();
    setupAnalyticsUI();
  }

  window.openHistoryWorkoutEditor = function(workoutId) {
    const workout = getHistoryWorkoutForEdit(workoutId);
    if (!workout) { ShowToast('Ovaj trening nije dostupan za ure\u0111ivanje. Sa\u010dekaj da se prvo sinhronizuje.', 'error'); return; }
    editingHistoryWorkoutId = workout.id;
    document.getElementById('history-workout-editor-name').value = workout.name || 'Trening';
    document.getElementById('history-workout-editor-date').value = getDateInputValue(workout.date);
    document.getElementById('history-workout-editor-status').textContent = '';
    renderHistoryWorkoutEditorExercises(workout.exercises || []);
    document.getElementById('history-workout-editor-modal').style.display = 'flex';
  };

  window.addHistoryWorkoutExercise = function() {
    updateHistoryEditorExercises((exercises) => exercises.push({ name: '', sets: [{}] }));
  };

  window.removeHistoryWorkoutExercise = function(index) {
    updateHistoryEditorExercises((exercises) => exercises.splice(Number(index), 1));
  };

  window.addHistoryWorkoutSet = function(index) {
    updateHistoryEditorExercises((exercises) => {
      const exercise = exercises[Number(index)];
      if (!exercise || getHistoryExerciseType(exercise) === 'cardio') return;
      exercise.sets = [...(exercise.sets || []), {}];
    });
  };

  window.removeHistoryWorkoutSet = function(exerciseIndex, setIndex) {
    updateHistoryEditorExercises((exercises) => {
      const exercise = exercises[Number(exerciseIndex)];
      if (!exercise || getHistoryExerciseType(exercise) === 'cardio') return;
      exercise.sets = (exercise.sets || []).filter((_, index) => index !== Number(setIndex));
    });
  };

  window.changeHistoryWorkoutExerciseType = function(index, type) {
    updateHistoryEditorExercises((exercises) => {
      const exercise = exercises[Number(index)];
      if (!exercise) return;
      exercise.sets = type === 'cardio' ? [] : [{}];
      delete exercise.minutes;
      delete exercise.calories;
      exercise._editorType = type;
    });
    const cards = document.querySelectorAll('#history-workout-editor-exercises .history-editor-exercise');
    const card = cards[Number(index)];
    const select = card?.querySelector('.history-editor-exercise-type');
    if (select) select.value = type;
  };

  function getEditorExerciseType(exercise) {
    return exercise?._editorType || getHistoryExerciseType(exercise);
  }

  window.saveHistoryWorkout = async function() {
    const workout = getHistoryWorkoutForEdit(editingHistoryWorkoutId);
    const status = document.getElementById('history-workout-editor-status');
    if (!workout) { if (status) status.textContent = 'Ovaj trening vi\u0161e nije dostupan.'; return; }
    const name = document.getElementById('history-workout-editor-name')?.value.trim() || '';
    const day = document.getElementById('history-workout-editor-date')?.value || '';
    if (!name || name.length > 120) { if (status) status.textContent = 'Unesi naziv treninga do 120 znakova.'; return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) { if (status) status.textContent = 'Izaberi ispravan datum treninga.'; return; }
    let exercises;
    try { exercises = readHistoryWorkoutEditorExercises({ strict: true }); }
    catch (error) { if (status) status.textContent = error.message; return; }
    const originalDate = getWorkoutDate(workout);
    const [year, month, date] = day.split('-').map(Number);
    const savedDate = new Date(year, month - 1, date, originalDate?.getHours() || 12, originalDate?.getMinutes() || 0, originalDate?.getSeconds() || 0).toISOString();
    const button = document.getElementById('history-workout-editor-save');
    if (button) { button.disabled = true; button.textContent = '\u010cuvam\u2026'; }
    if (status) status.textContent = '';
    try {
      await updateDoc(doc(db, 'workouts', workout.id), { name, date: savedDate, exercises });
      cachedHistory = cachedHistory.map((item) => item.id === workout.id ? { ...item, name, date: savedDate, exercises } : item)
        .sort((a, b) => (getWorkoutDate(b)?.getTime() || 0) - (getWorkoutDate(a)?.getTime() || 0));
      document.getElementById('history-workout-editor-modal').style.display = 'none';
      editingHistoryWorkoutId = null;
      refreshWorkoutViews();
      ShowToast('Trening je sa\u010duvan.');
    } catch (error) {
      console.error('Workout history update diagnostic:', error);
      if (status) status.textContent = 'Trening nije mogu\u0107e sa\u010duvati. Provjeri internet i poku\u0161aj ponovo.';
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Sa\u010duvaj promjene'; }
    }
  };

  window.deleteHistoryWorkout = function() {
    const workout = getHistoryWorkoutForEdit(editingHistoryWorkoutId);
    if (!workout) { ShowToast('Ovaj trening vi\u0161e nije dostupan.', 'error'); return; }
    pendingHistoryWorkoutDeleteId = workout.id;
    document.getElementById('history-workout-delete-name').textContent = workout.name || 'ovaj trening';
    document.getElementById('history-workout-delete-date').textContent = formatDateClean(workout.date, true);
    document.getElementById('history-workout-delete-modal').style.display = 'flex';
  };

  window.cancelHistoryWorkoutDelete = function() {
    pendingHistoryWorkoutDeleteId = null;
    document.getElementById('history-workout-delete-modal').style.display = 'none';
  };

  window.confirmHistoryWorkoutDelete = async function() {
    const workout = getHistoryWorkoutForEdit(pendingHistoryWorkoutDeleteId);
    const status = document.getElementById('history-workout-editor-status');
    if (!workout) { window.cancelHistoryWorkoutDelete(); if (status) status.textContent = 'Ovaj trening vi\u0161e nije dostupan.'; return; }
    const button = document.getElementById('confirm-history-workout-delete');
    if (button) { button.disabled = true; button.textContent = 'Bri\u0161em\u2026'; }
    try {
      await deleteDoc(doc(db, 'workouts', workout.id));
      cachedHistory = cachedHistory.filter((item) => item.id !== workout.id);
      pendingHistoryWorkoutDeleteId = null;
      editingHistoryWorkoutId = null;
      document.getElementById('history-workout-delete-modal').style.display = 'none';
      document.getElementById('history-workout-editor-modal').style.display = 'none';
      refreshWorkoutViews();
      ShowToast('Trening je obrisan.');
    } catch (error) {
      console.error('Workout history delete diagnostic:', error);
      if (status) status.textContent = 'Trening nije mogu\u0107e obrisati. Ostao je sa\u010duvan.';
      ShowToast('Trening nije mogu\u0107e obrisati. Provjeri internet i poku\u0161aj ponovo.', 'error');
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Obri\u0161i trening'; }
    }
  };

  function getWorkoutTime(workout) {
    const timestamp = new Date(workout?.date || '').getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  function getWeekStart(timestamp = Date.now()) {
    const date = new Date(timestamp);
    const day = date.getDay() || 7;
    date.setDate(date.getDate() - day + 1);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  function getMonthStart(timestamp = Date.now(), offset = 0) {
    const date = new Date(timestamp);
    return new Date(date.getFullYear(), date.getMonth() + offset, 1).getTime();
  }

  function workoutsInRange(start, end) {
    return cachedHistory.filter((workout) => {
      const time = getWorkoutTime(workout);
      return time !== null && time >= start && time < end;
    });
  }

  function summarizeWorkouts(workouts) {
    const summary = { workouts: workouts.length, sets: 0, volume: 0, durationSeconds: 0, durationCount: 0 };
    workouts.forEach((workout) => {
      const duration = Number(workout.durationSeconds);
      if (Number.isFinite(duration) && duration >= 0) {
        summary.durationSeconds += duration;
        summary.durationCount += 1;
      }
      workout.exercises?.forEach((exercise) => {
        const sets = Array.isArray(exercise.sets) ? exercise.sets : [];
        summary.sets += sets.length;
        sets.forEach((set) => {
          const weight = Number(set.weight);
          const reps = Number(set.reps);
          if (Number.isFinite(weight) && weight > 0 && Number.isFinite(reps) && reps > 0) summary.volume += weight * reps;
        });
      });
    });
    return summary;
  }

  function formatAnalyticsNumber(value) {
    return new Intl.NumberFormat(getCurrentLanguage?.() === 'de' ? 'de-DE' : 'sr-Latn-RS', { maximumFractionDigits: 0 }).format(Math.round(value || 0));
  }

  function formatWorkoutDuration(seconds) {
    const safe = Math.max(0, Math.round(Number(seconds) || 0));
    if (!safe) return 'Nema podatka';
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    if (hours) return `${hours} h ${minutes} min`;
    return `${Math.max(1, minutes)} min`;
  }

  function comparisonItem(label, currentValue, previousValue, formatter = formatAnalyticsNumber) {
    const hasPrevious = previousValue > 0;
    const difference = currentValue - previousValue;
    const state = !hasPrevious || difference === 0 ? 'analytics-delta-neutral' : difference > 0 ? 'analytics-delta-positive' : 'analytics-delta-negative';
    const differenceText = formatter(Math.abs(difference));
    const detail = !hasPrevious
      ? 'Nema ranijeg perioda'
      : difference === 0
        ? 'Isto kao prethodni period'
        : `${difference > 0 ? '+' : '−'}${differenceText} u odnosu na prethodni period`;
    return `<div><small>${escapeHtml(label)}</small><strong>${escapeHtml(formatter(currentValue))}</strong><small class="${state}">${escapeHtml(detail)}</small></div>`;
  }

  function getExerciseRecordValue(exercise) {
    const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
    const weights = sets.map((set) => Number(set.weight)).filter((value) => Number.isFinite(value) && value > 0);
    if (weights.length) return { value: Math.max(...weights), unit: 'kg' };
    const seconds = sets.map((set) => Number(set.seconds)).filter((value) => Number.isFinite(value) && value > 0);
    if (seconds.length) return { value: Math.max(...seconds), unit: 'sek' };
    const reps = sets.map((set) => Number(set.reps)).filter((value) => Number.isFinite(value) && value > 0);
    return reps.length ? { value: Math.max(...reps), unit: 'pon' } : null;
  }

  function getPersonalRecords() {
    const records = new Map();
    [...cachedHistory].sort((a, b) => (getWorkoutTime(a) || 0) - (getWorkoutTime(b) || 0)).forEach((workout) => {
      workout.exercises?.forEach((exercise) => {
        const result = getExerciseRecordValue(exercise);
        if (!result || !exercise?.name) return;
        const current = records.get(exercise.name);
        if (!current || current.unit !== result.unit || result.value > current.value) {
          records.set(exercise.name, { name: exercise.name, ...result, date: workout.date, wasImprovement: Boolean(current) });
        }
      });
    });
    return Array.from(records.values());
  }

  function renderAnalyticsOverview() {
    const root = document.getElementById('analytics-overview');
    if (!root) return;
    if (!cachedHistory.length) {
      root.innerHTML = '<div class="card body-empty-state">Sačuvaj prvi trening da bi se ovdje prikazali poređenja perioda, lični rekordi i mjesečni sažetak.</div>';
      return;
    }

    const now = Date.now();
    const thisWeekStart = getWeekStart(now);
    const lastWeekStart = thisWeekStart - (7 * 86400000);
    const thisMonthStart = getMonthStart(now);
    const lastMonthStart = getMonthStart(now, -1);
    const thisWeek = summarizeWorkouts(workoutsInRange(thisWeekStart, now + 1));
    const lastWeek = summarizeWorkouts(workoutsInRange(lastWeekStart, thisWeekStart));
    const thisMonth = summarizeWorkouts(workoutsInRange(thisMonthStart, now + 1));
    const lastMonth = summarizeWorkouts(workoutsInRange(lastMonthStart, thisMonthStart));
    const exerciseNames = new Set();
    cachedHistory.forEach((workout) => workout.exercises?.forEach((exercise) => { if (exercise?.name) exerciseNames.add(exercise.name); }));
    const records = getPersonalRecords();
    const recordsThisMonth = records.filter((record) => record.wasImprovement && (getWorkoutTime({ date: record.date }) || 0) >= thisMonthStart).length;
    const recentRecords = [...records].sort((a, b) => (getWorkoutTime({ date: b.date }) || 0) - (getWorkoutTime({ date: a.date }) || 0)).slice(0, 5);
    const coverageNote = cachedHistory.length >= 30
      ? 'Pregled koristi posljednjih 30 sačuvanih treninga.'
      : 'Pregled koristi sve trenutno učitane treninge.';

    root.innerHTML = `
      <div class="analytics-period-grid">
        <article class="analytics-summary-card"><span class="settings-eyebrow">POREĐENJE SEDMICE</span><h3>Ova i prošla sedmica</h3><div class="analytics-comparison-grid">${comparisonItem('Treninzi', thisWeek.workouts, lastWeek.workouts)}${comparisonItem('Serije', thisWeek.sets, lastWeek.sets)}${comparisonItem('Volumen (kg)', thisWeek.volume, lastWeek.volume)}${comparisonItem('Vrijeme', thisWeek.durationSeconds, lastWeek.durationSeconds, formatWorkoutDuration)}</div></article>
        <article class="analytics-summary-card"><span class="settings-eyebrow">POREĐENJE MJESECA</span><h3>Ovaj i prošli mjesec</h3><div class="analytics-comparison-grid">${comparisonItem('Treninzi', thisMonth.workouts, lastMonth.workouts)}${comparisonItem('Serije', thisMonth.sets, lastMonth.sets)}${comparisonItem('Volumen (kg)', thisMonth.volume, lastMonth.volume)}${comparisonItem('Vrijeme', thisMonth.durationSeconds, lastMonth.durationSeconds, formatWorkoutDuration)}</div></article>
      </div>
      <article class="analytics-summary-card"><span class="settings-eyebrow">UKUPAN PREGLED</span><h3>Tvoji učitani treninzi</h3><div class="analytics-highlights"><div class="analytics-highlight"><small>Različite vježbe</small><strong>${exerciseNames.size}</strong></div><div class="analytics-highlight"><small>Sačuvani treninzi</small><strong>${cachedHistory.length}</strong></div><div class="analytics-highlight"><small>Ukupan volumen</small><strong>${formatAnalyticsNumber(summarizeWorkouts(cachedHistory).volume)} kg</strong></div></div><p>${coverageNote}</p></article>
      <article class="analytics-summary-card"><span class="settings-eyebrow">MJESEČNI SAŽETAK</span><h3>${escapeHtml(new Intl.DateTimeFormat('sr-Latn-RS', { month: 'long', year: 'numeric' }).format(new Date(now)))}</h3><div class="analytics-highlights"><div class="analytics-highlight"><small>Završeni treninzi</small><strong>${thisMonth.workouts}</strong></div><div class="analytics-highlight"><small>Ukupne serije</small><strong>${thisMonth.sets}</strong></div><div class="analytics-highlight"><small>Novi lični rekordi</small><strong>${recordsThisMonth}</strong></div></div><p>${thisMonth.durationCount ? `Zabilježeno vrijeme treninga: ${formatWorkoutDuration(thisMonth.durationSeconds)}.` : 'Vrijeme treninga će se početi prikazivati nakon narednog sačuvanog treninga.'}</p></article>
      <article class="analytics-summary-card"><span class="settings-eyebrow">LIČNI REKORDI</span><h3>Najbolji zabilježeni rezultati</h3>${recentRecords.length ? `<ul class="analytics-pr-list">${recentRecords.map((record) => `<li><strong>${escapeHtml(record.name)}</strong><span>${escapeHtml(formatAnalyticsNumber(record.value))} ${record.unit}</span></li>`).join('')}</ul>` : '<p>Nema dovoljno podataka za lične rekorde.</p>'}</article>
    `;
  }

  function setupAnalyticsUI() {
    const select = document.getElementById('analytics-ex-select');
    if (!select) return;
    renderAnalyticsOverview();
    const exercisesSet = new Set();

    cachedHistory.forEach(h => {
      h.exercises?.forEach(e => {
        if (e.sets && e.sets.length > 0) exercisesSet.add(e.name);
      });
    });

    const list = Array.from(exercisesSet);
    if (list.length === 0) {
      select.innerHTML = '<option>Nema sačuvanih vježbi</option>';
      const empty = document.getElementById('analytics-empty-state');
      if (empty) { empty.textContent = 'Nema dovoljno sačuvanih treninga za grafikon.'; empty.style.display = 'block'; }
      return;
    }

    select.innerHTML = list.map(ex => `<option value="${escapeHtml(ex)}">${escapeHtml(ex)}</option>`).join('');
    const empty = document.getElementById('analytics-empty-state');
    if (empty) empty.style.display = 'none';
    renderAnalyticsChart();
  }

  window.renderAnalyticsChart = function() {
    const select = document.getElementById('analytics-ex-select');
    const exName = select.value;
    if (!exName) return;
    const metric = document.getElementById('analytics-metric-select')?.value || 'maxWeight';
    const period = document.getElementById('analytics-period-select')?.value || 'all';
    const now = Date.now();
    const periodMs = { week: 7 * 86400000, month: 30 * 86400000, threeMonths: 90 * 86400000 }[period];

    const labels = [];
    const dataPoints = [];
    const dataEntries = [];

    const reversedHistory = [...cachedHistory].reverse().filter((h) => !periodMs || (now - new Date(h.date).getTime()) <= periodMs);

    reversedHistory.forEach(h => {
      const pastEx = h.exercises?.find(e => e.name === exName);
      if (pastEx && pastEx.sets) {
        let maxW = 0;
        let volume = 0;
        pastEx.sets.forEach(s => {
          const w = parseFloat(s.weight) || 0;
          const reps = parseFloat(s.reps) || 0;
          if (w > maxW) maxW = w;
          volume += w * reps;
        });
        const value = metric === 'volume' ? volume : metric === 'sets' ? pastEx.sets.length : metric === 'sessions' ? 1 : maxW;
        if (value > 0) {
          const dateLabel = formatDateClean(h.date, false);
          labels.push(dateLabel);
          dataPoints.push(value);
          dataEntries.push(h);
        }
      }
    });

    const empty = document.getElementById('analytics-empty-state');
    if (empty) { empty.textContent = dataPoints.length < 1 ? 'Nema dovoljno podataka za izabrani period.' : ''; empty.style.display = dataPoints.length < 1 ? 'block' : 'none'; }

    const ctx = document.getElementById('progressChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: `${metric === 'volume' ? 'Volumen (kg)' : metric === 'sets' ? 'Serije' : metric === 'sessions' ? 'Treninzi' : 'Najbolja kilaža (kg)'} (${exName})`,
          data: dataPoints,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          borderWidth: 3,
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: '#3b82f6'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } }
        },
        plugins: { legend: { labels: { color: '#f8fafc', font: { family: 'Plus Jakarta Sans' } } }, tooltip: { callbacks: { title: (items) => dataEntries[items[0]?.dataIndex] ? formatDateClean(dataEntries[items[0].dataIndex].date, true) : '' } } }
      }
    });
  };

  window.exportUserData = async function() {
    if (!currentUser) return;
    const button = document.querySelector('[data-action="export-user-data"]');
    if (button) { button.disabled = true; button.textContent = 'Pripremam…'; }

    try {
      const userId = currentUser.uid;
      const [profileSnapshot, routinesSnapshot, workoutsSnapshot, measurementsSnapshot, foodEntriesSnapshot, mealPlansSnapshot] = await Promise.all([
        getDoc(doc(db, 'users', userId)),
        getDocs(query(collection(db, 'routines'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'workouts'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'bodyMeasurements'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'foodEntries'), where('userId', '==', userId))),
        getDocs(collection(db, 'users', userId, 'mealPlans'))
      ]);
      const payload = {
        app: 'GymLeader',
        exportedAt: new Date().toISOString(),
        profile: profileSnapshot.exists() ? profileSnapshot.data() : null,
        routines: routinesSnapshot.docs.map((item) => item.data()),
        workouts: workoutsSnapshot.docs.map((item) => item.data()),
        bodyMeasurements: measurementsSnapshot.docs.map((item) => item.data()),
        foodEntries: foodEntriesSnapshot.docs.map((item) => item.data()),
        mealPlans: mealPlansSnapshot.docs.map((item) => item.data())
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `gymleader-podaci-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
      ShowToast('Podaci su preuzeti na tvoj uređaj.');
    } catch (error) {
      console.error('User data export diagnostic:', error);
      ShowToast('Izvoz trenutno nije moguće pripremiti. Provjeri internet i pokušaj ponovo.', 'error');
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Preuzmi moje podatke'; }
    }
  };

  window.ShowToast = function(message, type = 'success', placement = 'center') {
    let toast = document.getElementById('custom-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'custom-toast';
    toast.className = 'toast-notification';
      document.body.appendChild(toast);
    }
    toast.classList.toggle('toast-notification-top', placement === 'top');
    toast.innerText = translateUiText(String(message));
    toast.style.borderColor = type === 'error' ? 'var(--danger)' : 'var(--primary)';
    toast.style.boxShadow = type === 'error' ? '0 20px 40px rgba(0,0,0,0.6), 0 0 25px rgba(239, 68, 68, 0.4)' : '0 20px 40px rgba(0,0,0,0.6), 0 0 25px var(--primary-glow)';
    
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  };

  function getProfilePhotoKey(userId) {
    return `gym_profile_photo_v1_${userId}`;
  }

  function bodyTrackingEnabled() {
    return currentProfileData?.bodyTrackingEnabled !== false;
  }

  function getBodyMeasurementsCacheKey(userId) {
    return `gym_body_measurements_cache_v${BODY_MEASUREMENTS_CACHE_VERSION}_${userId}`;
  }

  function readBodyMeasurementsCache(userId) {
    try {
      const parsed = JSON.parse(localStorage.getItem(getBodyMeasurementsCacheKey(userId)) || 'null');
      if (!parsed || !Array.isArray(parsed.items)) return null;
      return { savedAt: Number(parsed.savedAt) || 0, items: parsed.items };
    } catch {
      return null;
    }
  }

  function writeBodyMeasurementsCache(userId, items) {
    try {
      localStorage.setItem(getBodyMeasurementsCacheKey(userId), JSON.stringify({ savedAt: Date.now(), items }));
    } catch (error) {
      console.warn('Lokalni cache mjerenja nije mogao biti sačuvan:', error);
    }
  }

  async function loadBodyMeasurements({ force = false } = {}) {
    if (!currentUser) return;
    if (!bodyTrackingEnabled()) {
      bodyMeasurements = [];
      renderBodyMeasurements();
      return;
    }

    const cached = readBodyMeasurementsCache(currentUser.uid);
    if (cached) {
      bodyMeasurements = [...cached.items].sort((a, b) => String(b.measuredAt).localeCompare(String(a.measuredAt)));
      renderBodyMeasurements();
      if (!force && Date.now() - cached.savedAt < BODY_MEASUREMENTS_CACHE_TTL_MS) return;
    }

    try {
      const snapshot = await getDocs(query(collection(db, 'bodyMeasurements'), where('userId', '==', currentUser.uid)));
      bodyMeasurements = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((a, b) => String(b.measuredAt).localeCompare(String(a.measuredAt)));
      writeBodyMeasurementsCache(currentUser.uid, bodyMeasurements);
      renderBodyMeasurements();
    } catch (error) {
      console.error('Body measurements load diagnostic:', error);
      const status = document.getElementById('body-measurements-status');
      if (status) status.textContent = 'Mjerenja trenutno nije moguće učitati.';
    }
  }

  function getBodyMetricChange(key, days = null) {
    const rows = bodyMeasurements
      .filter((item) => item[key] != null && item[key] !== '' && Number.isFinite(Number(item[key])) && item.measuredAt)
      .sort((first, second) => String(second.measuredAt).localeCompare(String(first.measuredAt)));
    if (!rows.length) return null;
    const latest = rows[0];
    const latestTime = new Date(`${latest.measuredAt.slice(0, 10)}T12:00:00`).getTime();
    const baseline = days == null
      ? rows.slice(1)[0]
      : rows.filter((item) => new Date(`${item.measuredAt.slice(0, 10)}T12:00:00`).getTime() <= latestTime - days * 86400000)[0];
    return {
      value: Number(latest[key]),
      delta: baseline ? Number((Number(latest[key]) - Number(baseline[key])).toFixed(1)) : null
    };
  }

  function renderBodyMeasurementsSummary(root) {
    if (!root) return;
    const metrics = [
      { key: 'weightKg', label: 'Težina', unit: 'kg' },
      { key: 'waistCm', label: 'Struk', unit: 'cm' },
      { key: 'chestCm', label: 'Grudi', unit: 'cm' },
      { key: 'armCm', label: 'Ruka', unit: 'cm' },
      { key: 'legCm', label: 'Noga', unit: 'cm' },
      { key: 'thighCm', label: 'Bedro', unit: 'cm' },
      { key: 'calfCm', label: 'List', unit: 'cm' },
      { key: 'hipsCm', label: 'Kukovi', unit: 'cm' }
    ];
    const formatDelta = (record, unit) => record?.delta == null ? '—' : `${record.delta > 0 ? '+' : ''}${record.delta.toFixed(1)} ${unit}`;
    const cards = metrics.map((metric) => {
      const overall = getBodyMetricChange(metric.key);
      if (!overall) return '';
      const week = getBodyMetricChange(metric.key, 7);
      const month = getBodyMetricChange(metric.key, 30);
      const state = overall.delta == null ? 'is-neutral' : overall.delta > 0 ? 'is-positive' : 'is-negative';
      return `<article class="body-measurement-summary-card"><div><small>${escapeHtml(metric.label)}</small><strong>${overall.value.toFixed(1)} ${metric.unit}</strong><em class="${state}">${escapeHtml(formatDelta(overall, metric.unit))} od početka</em></div><dl><div><dt>Sedmica</dt><dd>${escapeHtml(formatDelta(week, metric.unit))}</dd></div><div><dt>Mjesec</dt><dd>${escapeHtml(formatDelta(month, metric.unit))}</dd></div></dl></article>`;
    }).filter(Boolean).join('');
    if (!cards) return;
    root.querySelector('.body-silhouette-card')?.insertAdjacentHTML('beforeend', `<section class="body-measurements-summary" aria-label="Pregled svih mjera"><div class="body-measurements-summary-heading"><div><span class="settings-eyebrow">SVE MJERE</span><h4>Pregled promjena</h4></div><p>Uporedi svaku unesenu mjeru za sedmicu, mjesec i od početka.</p></div><div class="body-measurements-summary-grid">${cards}</div></section>`);
  }

  function renderBodyMeasurements() {
    const status = document.getElementById('body-tracking-status');
    if (status) status.textContent = bodyTrackingEnabled() ? 'Praćenje je uključeno.' : 'Praćenje je isključeno.';
    const addButton = document.querySelector('[data-action="open-body-measurement-modal"]');
    if (addButton) addButton.hidden = !bodyTrackingEnabled();
    const root = document.getElementById('body-auto-progress');
    if (!root) return;
    if (!bodyTrackingEnabled()) { root.innerHTML = '<div class="card body-empty-state">Praćenje tijela je isključeno. Možeš ga uključiti u Podešavanjima.</div>'; }
    else if (!bodyMeasurements.length) { root.innerHTML = '<div class="card body-empty-state">Dodaj prvo mjerenje da bi se ovdje prikazao tvoj napredak.</div>'; }
    else {
      const hasDetailedLegMeasurements = bodyMeasurements.some((item) => item.thighCm != null || item.calfCm != null);
      const defs = [
        { key:'chestCm', label:'Grudi', side:'left', pos:'chest' }, { key:'armCm', label:'Ruka', side:'right', pos:'arm' },
        { key:'waistCm', label:'Struk', side:'left', pos:'waist' }, { key:'hipsCm', label:'Kukovi', side:'right', pos:'hips' },
        ...(hasDetailedLegMeasurements
          ? [{ key:'thighCm', label:'Bedro', side:'left', pos:'thigh' }, { key:'calfCm', label:'List', side:'right', pos:'calf' }]
          : [{ key:'legCm', label:'Noga', side:'left', pos:'legs' }])
      ];
      const delta = (key, days=null) => {
        const rows=bodyMeasurements.filter(x=>x[key]!=null&&x[key]!==''&&Number.isFinite(Number(x[key]))&&x.measuredAt).sort((a,b)=>String(b.measuredAt).localeCompare(String(a.measuredAt)));
        if (!rows.length) return null;
        const latest=rows[0], time=new Date(`${latest.measuredAt.slice(0,10)}T12:00:00`).getTime();
        const base=(days==null?rows.slice(1):rows.filter(x=>new Date(`${x.measuredAt.slice(0,10)}T12:00:00`).getTime()<=time-days*86400000))[0];
        return {value:Number(latest[key]),date:latest.measuredAt,delta:base?Number((Number(latest[key])-Number(base[key])).toFixed(1)):null};
      };
      const uid=currentUser.uid, mode=localStorage.getItem(`gym-body-progress-mode-v1-${uid}`)==='manual'?'manual':'silhouette';
      const gender=getProfileGender(), female=gender==='female', selectedKey=localStorage.getItem(`gym-body-selected-metric-v1-${uid}`)||'waistCm';
      const selected=defs.find(x=>x.key===selectedKey)||defs[0];
      const svg = `<img class="body-silhouette-svg" src="${female?'/assets/gymleader-body-female.svg?v=20260930-20':'/assets/gymleader-body-male.svg?v=20260930-20'}" alt="${female?'\u017Denska':'Mu\u0161ka'} silueta">`;
      const sign=x=>x==null?'Nema ranijeg zapisa':`${x>0?'+':''}${x.toFixed(1)}`;
      const callouts=defs.map(x=>{const d=delta(x.key);if(!d)return '';const t=d.delta==null?'prvo mjerenje':`${d.delta>0?'+':''}${d.delta.toFixed(1)} cm od početka`;return `<div class="body-callout body-callout-${x.side} body-callout-${x.pos}"><i class="body-callout-line" aria-hidden="true"></i><small>${x.label}</small><strong>${d.value.toFixed(1)} cm</strong><em class="${d.delta==null?'is-neutral':d.delta>0?'is-positive':'is-negative'}">${escapeHtml(t)}</em></div>`}).join('');
      const weight=delta('weightKg'), weightCard=weight?`<div class="body-weight-highlight"><span class="body-weight-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v2m-7 2h14l2 14H3L5 7Zm7 3-2 4h4l-2-4Z"/></svg></span><div><small>Tvoja težina</small><strong>${weight.value.toFixed(1)} kg</strong><em class="${weight.delta==null?'is-neutral':weight.delta>0?'is-positive':'is-negative'}">${escapeHtml(weight.delta==null?'Dodaj još jedno mjerenje':`${weight.delta>0?'+':''}${weight.delta.toFixed(1)} kg od početka`)}</em><small>Posljednje mjerenje: ${escapeHtml(formatDateClean(weight.date))}</small></div></div>`:'<div class="body-weight-highlight"><span class="body-weight-icon" aria-hidden="true">⚖</span><div><small>Tvoja težina</small><strong>Nema zapisa</strong><em class="is-neutral">Dodaj prvo mjerenje.</em></div></div>';
      const metric=delta(selected.key), week=delta(selected.key,7), month=delta(selected.key,30);
      const select=`<label class="body-manual-select-label" for="body-manual-metric-select">Izaberi mjeru</label><select id="body-manual-metric-select" class="custom-input body-manual-select">${defs.map(x=>`<option value="${x.key}" ${x.key===selected.key?'selected':''}>${x.label}</option>`).join('')}</select>`;
      const manual=metric?`<div class="body-manual-result"><span class="body-manual-icon" aria-hidden="true">↗</span><div><small>${selected.label}</small><strong>${metric.value.toFixed(1)} cm</strong><em class="${metric.delta==null?'is-neutral':metric.delta>0?'is-positive':'is-negative'}">${escapeHtml(metric.delta==null?'Prvo mjerenje':`${sign(metric.delta)} cm od početka`)}</em></div></div><div class="body-manual-periods"><div><small>Ove sedmice</small><strong>${escapeHtml(sign(week?.delta))} ${week?'cm':''}</strong></div><div><small>Ovaj mjesec</small><strong>${escapeHtml(sign(month?.delta))} ${month?'cm':''}</strong></div></div>`:`<p class="body-empty-state body-manual-empty">Još nema mjerenja za ${selected.label.toLowerCase()}. Dodaj mjeru da bi se napredak prikazao.</p>`;
      root.innerHTML=`<div class="card body-silhouette-card ${female?'body-gender-female':'body-gender-male'}"><div class="body-auto-heading"><span class="settings-eyebrow">TVOJ PREGLED</span><h3>Šta se promijenilo</h3><p>Prikazujemo samo mjere koje si unio/la. Izaberi kako želiš pregledati napredak.</p></div><div class="body-view-switch" role="group" aria-label="Način prikaza"><button type="button" data-action="set-body-progress-mode" data-mode="silhouette" aria-pressed="${mode==='silhouette'}">Silueta</button><button type="button" data-action="set-body-progress-mode" data-mode="manual" aria-pressed="${mode==='manual'}">Izaberi mjeru</button></div><div class="body-progress-views ${mode==='manual'?'is-manual':''}"><section class="body-silhouette-view" aria-label="Napredak na silueti"><div class="body-silhouette-stage">${svg}<div class="body-callouts">${callouts||'<p class="body-empty-state">Dodaj mjerenje obima da vidiš napredak uz siluetu.</p>'}</div></div>${weightCard}</section><section class="body-manual-view" aria-label="Ručno izabrana mjera">${select}${manual}</section></div></div>`;
    }
    if (bodyTrackingEnabled() && bodyMeasurements.length) renderBodyMeasurementsSummary(root);
    const list=document.getElementById('body-measurements-list');
    const editToggle = document.getElementById('body-measurements-edit-toggle');
    if (editToggle) {
      editToggle.textContent = bodyMeasurementsEditMode ? '✓ Gotovo' : '✎ Uredi';
      editToggle.setAttribute('aria-pressed', String(bodyMeasurementsEditMode));
      editToggle.setAttribute('aria-label', bodyMeasurementsEditMode ? 'Završi uređivanje mjerenja' : 'Uredi sačuvana mjerenja');
      editToggle.title = bodyMeasurementsEditMode ? 'Gotovo' : 'Uredi sačuvana mjerenja';
    }
    if (list) list.innerHTML = bodyMeasurements.length
      ? bodyMeasurements.map((item) => {
        const values = [
          item.weightKg != null && `Težina ${item.weightKg} kg`, item.waistCm != null && `struk ${item.waistCm} cm`,
          item.chestCm != null && `grudi ${item.chestCm} cm`, item.armCm != null && `ruka ${item.armCm} cm`,
          item.legCm != null && `noga ${item.legCm} cm`, item.thighCm != null && `bedro ${item.thighCm} cm`,
          item.calfCm != null && `list ${item.calfCm} cm`, item.hipsCm != null && `kukovi ${item.hipsCm} cm`
        ].filter(Boolean).join(' · ');
        return `<li class="body-measurement-item"><div class="body-measurement-item-copy"><strong>${escapeHtml(formatDateClean(item.measuredAt))}</strong><span>${escapeHtml(values || 'Bez unesenih vrijednosti')}${item.note ? `<small>${escapeHtml(item.note)}</small>` : ''}</span></div><div class="body-measurement-actions" ${bodyMeasurementsEditMode ? '' : 'hidden'}><button class="btn btn-secondary" type="button" data-action="edit-body-measurement" data-measurement-id="${escapeHtml(item.id)}">Uredi</button><button class="btn btn-danger" type="button" data-action="delete-body-measurement" data-measurement-id="${escapeHtml(item.id)}">Obriši</button></div></li>`;
      }).join('')
      : '<li class="body-empty-state">Nema sačuvanih mjerenja. Dodaj prvo mjerenje da pratiš promjene kroz vrijeme.</li>';
    renderBodyChart();
  }

  function renderBodyChart() {
    const canvas = document.getElementById('body-weight-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (bodyChartInstance) bodyChartInstance.destroy();
    const metric = document.getElementById('body-metric-select')?.value || 'weightKg';
    const labels = { weightKg: 'Težina (kg)', waistCm: 'Struk (cm)', chestCm: 'Grudi (cm)', armCm: 'Ruka (cm)', legCm: 'Noga (cm)', thighCm: 'Bedro (cm)', calfCm: 'List (cm)', hipsCm: 'Kukovi (cm)' };
    const entries = [...bodyMeasurements].reverse().filter((item) => item[metric] != null);
    const values = entries.map((item) => Number(item[metric]));
    const changeSummary = document.getElementById('body-change-summary');
    if (changeSummary) {
      const first = values[0];
      const last = values[values.length - 1];
      const delta = values.length > 1 ? last - first : 0;
      changeSummary.textContent = values.length > 1 ? `${labels[metric]}: ${delta > 0 ? '+' : ''}${delta.toFixed(1)} ${metric === 'weightKg' ? 'kg' : 'cm'} od prvog mjerenja.` : 'Dodaj još jedno mjerenje da vidiš promjenu.';
    }
    bodyChartInstance = new Chart(canvas, { type: 'line', data: { labels: entries.map((item) => formatDateClean(item.measuredAt, false)), datasets: [{ label: labels[metric], data: values, borderColor: '#38BDF8', backgroundColor: 'rgba(56,189,248,.16)', fill: true, tension: .35, pointRadius: 3 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94A3B8' } }, tooltip: { callbacks: { title: (items) => entries[items[0]?.dataIndex] ? formatDateClean(entries[items[0].dataIndex].measuredAt, true) : '' } } }, scales: { x: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(148,163,184,.08)' } }, y: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(148,163,184,.08)' } } } } });
  }

  window.openBodyMeasurementModal = function() {
    if (!bodyTrackingEnabled()) { ShowToast('Praćenje tijela je isključeno u Podešavanjima.'); return; }
    editingBodyMeasurementId = null;
    document.querySelectorAll('#body-measurement-modal input, #body-measurement-modal textarea').forEach((input) => { input.value = ''; });
    const date = document.getElementById('body-measured-at');
    if (date) date.value = new Date().toISOString().slice(0, 10);
    document.getElementById('body-measurement-title').textContent = 'Dodaj mjerenje';
    document.getElementById('body-measurement-save-button').textContent = 'Sačuvaj mjerenje';
    document.getElementById('body-measurement-delete-button').hidden = true;
    document.getElementById('body-measurement-status').textContent = '';
    document.getElementById('body-measurement-modal')?.style.setProperty('display', 'flex');
  };

  async function resolveBodyMeasurementRecord(measurementId) {
    let item = bodyMeasurements.find((measurement) => measurement.id === measurementId);
    if (item?.id?.startsWith('local-')) {
      const cachedItem = item;
      await loadBodyMeasurements({ force: true });
      const keys = ['measuredAt', 'weightKg', 'waistCm', 'chestCm', 'armCm', 'legCm', 'thighCm', 'calfCm', 'hipsCm', 'note'];
      item = bodyMeasurements.find((measurement) => keys.every((key) => (measurement[key] ?? '') === (cachedItem[key] ?? '')));
    }
    return item && !item.id?.startsWith('local-') ? item : null;
  }

  window.openBodyMeasurementForEdit = async function(measurementId) {
    if (!currentUser || !bodyTrackingEnabled()) return;
    const item = await resolveBodyMeasurementRecord(measurementId);
    if (!item) { ShowToast('Ovo mjerenje nije pronađeno.', 'error'); return; }
    editingBodyMeasurementId = item.id;
    const fields = { weightKg: 'body-weight', waistCm: 'body-waist', chestCm: 'body-chest', armCm: 'body-arm', legCm: 'body-leg', thighCm: 'body-thigh', calfCm: 'body-calf', hipsCm: 'body-hips' };
    document.getElementById('body-measured-at').value = item.measuredAt || '';
    Object.entries(fields).forEach(([key, id]) => { document.getElementById(id).value = item[key] ?? ''; });
    document.getElementById('body-note').value = item.note || '';
    document.getElementById('body-measurement-title').textContent = 'Uredi mjerenje';
    document.getElementById('body-measurement-save-button').textContent = 'Sačuvaj promjene';
    document.getElementById('body-measurement-delete-button').hidden = false;
    document.getElementById('body-measurement-status').textContent = '';
    document.getElementById('body-measurement-modal')?.style.setProperty('display', 'flex');
  };

  window.saveBodyMeasurement = async function() {
    if (!currentUser || !bodyTrackingEnabled()) return;
    const fields = { weightKg: 'body-weight', waistCm: 'body-waist', chestCm: 'body-chest', armCm: 'body-arm', legCm: 'body-leg', thighCm: 'body-thigh', calfCm: 'body-calf', hipsCm: 'body-hips' };
    const date = document.getElementById('body-measured-at')?.value || '';
    const data = { userId: currentUser.uid, measuredAt: date, note: document.getElementById('body-note')?.value.trim() || '' };
    const bounds = { weightKg: [25, 400], waistCm: [30, 250], chestCm: [30, 250], armCm: [10, 100], legCm: [20, 150], thighCm: [20, 150], calfCm: [15, 100], hipsCm: [30, 250] };
    for (const [key, id] of Object.entries(fields)) {
      const raw = document.getElementById(id)?.value.trim();
      if (!raw) continue;
      const value = Number(raw), [min, max] = bounds[key];
      if (!Number.isFinite(value) || value < min || value > max) { ShowToast(`Provjeri unesenu vrijednost za ${key === 'weightKg' ? 'težinu' : 'obim'}.`, 'error'); return; }
      data[key] = value;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T12:00:00`).getTime())) { ShowToast('Izaberi ispravan datum mjerenja.', 'error'); return; }
    if (!Object.keys(bounds).some((key) => data[key] != null)) { ShowToast('Unesi barem jednu vrijednost.', 'error'); return; }
    const button = document.getElementById('body-measurement-save-button');
    if (button) { button.disabled = true; button.textContent = 'Čuvam…'; }
    try {
      if (editingBodyMeasurementId) {
        const id = editingBodyMeasurementId;
        await setDoc(doc(db, 'bodyMeasurements', id), data);
        bodyMeasurements = bodyMeasurements.map((item) => item.id === id ? { ...item, ...data } : item).sort((a, b) => String(b.measuredAt).localeCompare(String(a.measuredAt)));
      } else {
        const saved = await addDoc(collection(db, 'bodyMeasurements'), data);
        bodyMeasurements = [...bodyMeasurements, { id: saved.id, ...data }].sort((a, b) => String(b.measuredAt).localeCompare(String(a.measuredAt)));
      }
      writeBodyMeasurementsCache(currentUser.uid, bodyMeasurements);
      document.getElementById('body-measurement-modal').style.display = 'none';
      editingBodyMeasurementId = null;
      document.querySelectorAll('#body-measurement-modal input, #body-measurement-modal textarea').forEach((input) => { input.value = ''; });
      renderBodyMeasurements();
      ShowToast('Mjerenje je sačuvano.');
    } catch (error) {
      console.error('Body measurement save diagnostic:', error);
      ShowToast('Mjerenje nije moguće sačuvati. Provjeri internet i pokušaj ponovo.', 'error');
    } finally { if (button) { button.disabled = false; button.textContent = editingBodyMeasurementId ? 'Sačuvaj promjene' : 'Sačuvaj mjerenje'; } }
  };

  window.deleteBodyMeasurement = async function(measurementId) {
    if (!currentUser || !measurementId) return;
    const item = await resolveBodyMeasurementRecord(measurementId);
    if (!item) { ShowToast('Ovo mjerenje nije pronađeno.', 'error'); return; }
    pendingBodyMeasurementDeleteId = item.id;
    const modal = document.getElementById('body-measurement-delete-modal');
    const date = document.getElementById('body-measurement-delete-date');
    if (date) date.textContent = formatDateClean(item.measuredAt);
    if (modal) modal.style.display = 'flex';
  };

  window.confirmBodyMeasurementDelete = async function() {
    const measurementId = pendingBodyMeasurementDeleteId;
    if (!measurementId || !currentUser) return;
    const modal = document.getElementById('body-measurement-delete-modal');
    const button = document.getElementById('confirm-body-measurement-delete');
    if (button) button.disabled = true;
    try {
      await deleteDoc(doc(db, 'bodyMeasurements', measurementId));
      bodyMeasurements = bodyMeasurements.filter((measurement) => measurement.id !== measurementId);
      writeBodyMeasurementsCache(currentUser.uid, bodyMeasurements);
      if (editingBodyMeasurementId === measurementId) {
        document.getElementById('body-measurement-modal').style.display = 'none';
        editingBodyMeasurementId = null;
      }
      if (modal) modal.style.display = 'none';
      pendingBodyMeasurementDeleteId = null;
      renderBodyMeasurements();
      ShowToast('Mjerenje je obrisano.');
    } catch (error) {
      console.error('Body measurement delete diagnostic:', error);
      ShowToast('Mjerenje nije moguće obrisati. Provjeri internet i pokušaj ponovo.', 'error');
    } finally {
      if (button) button.disabled = false;
    }
  };

  window.cancelBodyMeasurementDelete = function() {
    pendingBodyMeasurementDeleteId = null;
    const modal = document.getElementById('body-measurement-delete-modal');
    if (modal) modal.style.display = 'none';
  };

  function getFoodSelectedDate() {
    const input = document.getElementById('food-selected-date');
    const localNow = new Date();
    const today = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`;
    if (input && !input.value) input.value = today;
    return input?.value || today;
  }

  function getFoodEntriesCacheKey(userId, date) {
    return userId && date ? `gym_food_entries_cache_v1_${userId}_${date}` : '';
  }

  function readFoodEntriesCache(userId, date) {
    try {
      const cached = JSON.parse(localStorage.getItem(getFoodEntriesCacheKey(userId, date)) || 'null');
      return cached && Array.isArray(cached.items) ? cached : null;
    } catch { return null; }
  }

  function writeFoodEntriesCache(userId, date, items) {
    try { localStorage.setItem(getFoodEntriesCacheKey(userId, date), JSON.stringify({ savedAt: Date.now(), items })); }
    catch (error) { console.warn('Lokalni cache ishrane nije mogao biti sačuvan:', error); }
  }

  function getFoodGoalStorageKey(userId = currentUser?.uid) {
    return userId ? `gym_food_daily_goal_v1_${userId}` : '';
  }

  const NUTRITION_GOAL_FIELDS = {
    calories: 'dailyCaloriesGoal',
    protein: 'dailyProteinGoal',
    carbs: 'dailyCarbsGoal',
    fat: 'dailyFatGoal'
  };

  function validNutritionGoal(value, { integer = false, max = 2000 } = {}) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 1 && number <= max && (!integer || Number.isInteger(number)) ? number : null;
  }

  function getNutritionGoals() {
    const profile = currentProfileData || {};
    const profileCalories = validNutritionGoal(profile[NUTRITION_GOAL_FIELDS.calories], { integer: true, max: 10000 });
    const legacyCalories = validNutritionGoal(localStorage.getItem(getFoodGoalStorageKey()), { integer: true, max: 10000 });
    return {
      calories: profileCalories || legacyCalories,
      protein: validNutritionGoal(profile[NUTRITION_GOAL_FIELDS.protein]),
      carbs: validNutritionGoal(profile[NUTRITION_GOAL_FIELDS.carbs]),
      fat: validNutritionGoal(profile[NUTRITION_GOAL_FIELDS.fat])
    };
  }

  function getFoodDailyGoal() {
    return getNutritionGoals().calories;
  }

  function formatFoodNumber(value) {
    return Number(value || 0).toLocaleString(getCurrentLanguage() === 'de' ? 'de-DE' : getCurrentLanguage() === 'en' ? 'en-GB' : 'sr-Latn-RS', { maximumFractionDigits: 1 });
  }

  function getFoodMealLabel(type) {
    const labels = {
      sr: { breakfast: 'Doručak', lunch: 'Ručak', dinner: 'Večera', snack: 'Užina', other: 'Drugo' },
      en: { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', other: 'Other' },
      de: { breakfast: 'Frühstück', lunch: 'Mittagessen', dinner: 'Abendessen', snack: 'Snack', other: 'Andere' }
    };
    return (labels[getCurrentLanguage()] || labels.sr)[type] || labels.sr.other;
  }

  function getFoodFavoritesStorageKey(userId = currentUser?.uid) {
    return userId ? `gym_food_favorites_v1_${userId}` : '';
  }

  function getFoodFavorites() {
    try {
      const values = JSON.parse(localStorage.getItem(getFoodFavoritesStorageKey()) || '[]');
      return Array.isArray(values) ? values.slice(0, 20) : [];
    } catch { return []; }
  }

  function saveFoodFavorites(items) {
    try { localStorage.setItem(getFoodFavoritesStorageKey(), JSON.stringify(items.slice(0, 20))); }
    catch (error) { console.warn('Omiljeni obroci nisu mogli biti sačuvani lokalno:', error); }
  }

  function getFoodLibraryCategoryLabel(category) {
    const language = getCurrentLanguage();
    return FOOD_LIBRARY_CATEGORIES.find((item) => item.id === category)?.labels?.[language]
      || FOOD_LIBRARY_CATEGORIES.find((item) => item.id === category)?.labels?.sr
      || category;
  }

  function normalizeFoodLibrarySearch(value) {
    return String(value || '')
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\u0111/g, 'd')
      .replace(/\u00df/g, 'ss');
  }

  function ensureFoodLibraryPicker() {
    const mealType = document.getElementById('food-entry-meal-type');
    if (!mealType || document.getElementById('food-library-picker')) return;
    const picker = document.createElement('section');
    picker.id = 'food-library-picker';
    picker.className = 'food-library-picker';
    picker.innerHTML = '<div class="food-library-picker-heading"><strong>Pronađi namirnicu</strong><small>Makroi se popune automatski, a količinu možeš promijeniti.</small></div><input id="food-library-search" class="custom-input" type="search" autocomplete="off" placeholder="Pretraži, npr. piletina ili banana"><div id="food-library-categories" class="food-library-categories" role="group" aria-label="Kategorije namirnica"></div><div id="food-library-results" class="food-library-results"></div><div id="food-favorites" class="food-favorites"></div><button id="save-food-favorite-button" class="food-favorite-button" data-action="save-food-favorite" type="button" hidden>☆ Sačuvaj kao omiljeni obrok</button><p class="food-manual-hint">Ne vidiš namirnicu? Ispod je upiši ručno.</p>';
    mealType.previousElementSibling?.insertAdjacentElement('beforebegin', picker);
    document.getElementById('food-library-search')?.addEventListener('input', renderFoodLibraryPicker);
    document.getElementById('food-entry-quantity')?.addEventListener('input', syncSelectedFoodLibraryQuantity);
    document.getElementById('food-entry-name')?.addEventListener('input', () => { activeFoodLibraryItemId = null; document.getElementById('save-food-favorite-button').hidden = !document.getElementById('food-entry-name').value.trim(); });
    renderFoodLibraryPicker();
  }

  function renderFoodLibraryPicker() {
    const categories = document.getElementById('food-library-categories');
    const results = document.getElementById('food-library-results');
    if (!categories || !results) return;
    const queryText = normalizeFoodLibrarySearch(document.getElementById('food-library-search')?.value || '');
    const language = getCurrentLanguage();
    categories.innerHTML = [`<button type="button" class="${foodLibraryCategory === 'all' ? 'is-active' : ''}" data-action="set-food-library-category" data-food-category="all">Sve</button>`, ...FOOD_LIBRARY_CATEGORIES.map((category) => `<button type="button" class="${foodLibraryCategory === category.id ? 'is-active' : ''}" data-action="set-food-library-category" data-food-category="${category.id}">${escapeHtml(getFoodLibraryCategoryLabel(category.id))}</button>`)].join('');
    const matches = FOOD_LIBRARY.filter((item) => {
      const names = normalizeFoodLibrarySearch(Object.values(item.names).join(' '));
      return (foodLibraryCategory === 'all' || item.category === foodLibraryCategory) && (!queryText || names.includes(queryText));
    }).slice(0, 12);
    results.innerHTML = matches.length ? matches.map((item) => `<button type="button" class="food-library-result" data-action="select-food-library-item" data-food-library-id="${item.id}"><span><strong>${escapeHtml(getFoodLibraryName(item, language))}</strong><small>${escapeHtml(getFoodLibraryCategoryLabel(item.category))} · ${item.portion} ${escapeHtml(item.unit)}${item.allergens.length ? ` · sadrži: ${escapeHtml(item.allergens.join(', '))}` : ''}</small></span><em>${formatFoodNumber(item.calories)} kcal</em></button>`).join('') : '<p class="food-library-empty">Nema rezultata. Možeš upisati vlastitu hranu ispod.</p>';
    renderFoodFavorites();
  }

  function renderFoodFavorites() {
    const root = document.getElementById('food-favorites');
    if (!root) return;
    const favorites = getFoodFavorites();
    root.innerHTML = favorites.length ? `<span>Omiljeni obroci</span><div>${favorites.map((item) => `<button type="button" data-action="select-food-favorite" data-food-favorite-id="${escapeHtml(item.id)}">${escapeHtml(item.name)}</button>`).join('')}</div>` : '';
  }

  function applyFoodLibraryItem(item) {
    if (!item) return;
    activeFoodLibraryItemId = item.id;
    document.getElementById('food-entry-name').value = getFoodLibraryName(item, getCurrentLanguage());
    document.getElementById('food-entry-quantity').value = item.portion;
    document.getElementById('food-entry-unit').value = item.unit;
    document.getElementById('food-entry-calories').value = item.calories;
    document.getElementById('food-entry-protein').value = item.proteinG;
    document.getElementById('food-entry-carbs').value = item.carbsG;
    document.getElementById('food-entry-fat').value = item.fatG;
    document.getElementById('save-food-favorite-button').hidden = false;
  }

  function syncSelectedFoodLibraryQuantity() {
    const item = FOOD_LIBRARY.find((entry) => entry.id === activeFoodLibraryItemId);
    if (!item) return;
    const amount = Number(document.getElementById('food-entry-quantity')?.value);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const ratio = amount / item.portion;
    document.getElementById('food-entry-calories').value = Math.round(item.calories * ratio);
    document.getElementById('food-entry-protein').value = Number((item.proteinG * ratio).toFixed(1));
    document.getElementById('food-entry-carbs').value = Number((item.carbsG * ratio).toFixed(1));
    document.getElementById('food-entry-fat').value = Number((item.fatG * ratio).toFixed(1));
  }

  window.selectFoodLibraryItem = function(id) { applyFoodLibraryItem(FOOD_LIBRARY.find((item) => item.id === id)); };
  window.selectFoodFavorite = function(id) {
    const favorite = getFoodFavorites().find((item) => item.id === id);
    if (!favorite) return;
    activeFoodLibraryItemId = null;
    document.getElementById('food-entry-meal-type').value = favorite.mealType || 'other';
    document.getElementById('food-entry-name').value = favorite.name || '';
    document.getElementById('food-entry-quantity').value = favorite.quantity ?? '';
    document.getElementById('food-entry-unit').value = favorite.unit || '';
    document.getElementById('food-entry-calories').value = favorite.calories ?? '';
    document.getElementById('food-entry-protein').value = favorite.proteinG ?? '';
    document.getElementById('food-entry-carbs').value = favorite.carbsG ?? '';
    document.getElementById('food-entry-fat').value = favorite.fatG ?? '';
    document.getElementById('save-food-favorite-button').hidden = false;
  };
  window.saveFoodFavorite = function() {
    const name = document.getElementById('food-entry-name')?.value.trim() || '';
    const quantity = foodNumber('food-entry-quantity', { min: .1, max: 10000 });
    const calories = foodNumber('food-entry-calories', { required: true, min: 0, max: 10000 });
    const proteinG = foodNumber('food-entry-protein', { min: 0, max: 2000 });
    const carbsG = foodNumber('food-entry-carbs', { min: 0, max: 2000 });
    const fatG = foodNumber('food-entry-fat', { min: 0, max: 2000 });
    const unit = document.getElementById('food-entry-unit')?.value.trim() || '';
    if (!name || !unit || quantity === undefined || calories === undefined || proteinG === undefined || carbsG === undefined || fatG === undefined) { ShowToast('Prvo popuni obrok koji želiš sačuvati.', 'error'); return; }
    const items = getFoodFavorites().filter((item) => item.name.toLocaleLowerCase() !== name.toLocaleLowerCase());
    items.unshift({ id: `favorite-${Date.now()}`, mealType: document.getElementById('food-entry-meal-type').value, name, quantity, unit, calories, proteinG: proteinG ?? 0, carbsG: carbsG ?? 0, fatG: fatG ?? 0 });
    saveFoodFavorites(items);
    renderFoodFavorites();
    ShowToast('Obrok je sačuvan među omiljenima.');
  };

  function renderFoodEntries() {
    const list = document.getElementById('food-entries-list');
    const summary = document.getElementById('food-daily-summary');
    const count = document.getElementById('food-entry-count');
    if (!list || !summary) return;
    const totals = foodEntries.reduce((sum, entry) => ({
      calories: sum.calories + Number(entry.calories || 0), protein: sum.protein + Number(entry.proteinG || 0),
      carbs: sum.carbs + Number(entry.carbsG || 0), fat: sum.fat + Number(entry.fatG || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    const goals = getNutritionGoals();
    const progressCard = (label, value, goal, unit, isCalories = false) => {
      if (!goal) return `<div><small>${label}</small><strong>${formatFoodNumber(value)} ${unit}</strong><em>Bez cilja</em></div>`;
      const difference = goal - value;
      const isOver = difference < 0;
      const detail = isOver
        ? `Preko cilja ${formatFoodNumber(Math.abs(difference))} ${unit}`
        : isCalories
          ? `Još ${formatFoodNumber(difference)} ${unit}`
          : `${formatFoodNumber(value)} / ${formatFoodNumber(goal)} ${unit}`;
      const percent = Math.min(100, Math.max(0, (value / goal) * 100));
      return `<div class="${isOver ? 'is-over' : ''}"><small>${label}</small><strong>${formatFoodNumber(value)} / ${formatFoodNumber(goal)} ${unit}</strong><div class="food-goal-progress" aria-hidden="true"><span style="width:${percent}%"></span></div><em>${detail}</em></div>`;
    };
    summary.innerHTML = [
      progressCard('Kalorije', totals.calories, goals.calories, 'kcal', true),
      progressCard('Proteini', totals.protein, goals.protein, 'g'),
      progressCard('Ugljikohidrati', totals.carbs, goals.carbs, 'g'),
      progressCard('Masti', totals.fat, goals.fat, 'g')
    ].join('');
    const foodGoalHelp = document.getElementById('food-goal-help');
    if (foodGoalHelp) foodGoalHelp.textContent = Object.values(goals).some(Boolean)
      ? 'Lični dnevni ciljevi. Možeš ih promijeniti kad god želiš.'
      : 'Opcionalno. Dnevnik hrane radi i bez ciljeva.';
    const foodGoalHeading = document.querySelector('.food-goal-row strong');
    const foodGoalButton = document.querySelector('.food-goal-row [data-action="open-food-goal-modal"]');
    if (foodGoalHeading) foodGoalHeading.textContent = 'Ciljevi ishrane';
    if (foodGoalButton) foodGoalButton.textContent = 'Podesi ciljeve';
    if (count) count.textContent = foodEntries.length ? `${foodEntries.length} ${foodEntries.length === 1 ? 'unos' : 'unosa'}` : '';
    if (!foodEntries.length) {
      list.innerHTML = '<div class="food-empty-state"><strong>Još nema unosa za ovaj dan.</strong><span>Dodaj obrok kada želiš pratiti kalorije i makronutrijente.</span></div>';
      return;
    }
    list.innerHTML = foodEntries.map((entry) => {
      const quantity = entry.quantity != null ? `${formatFoodNumber(entry.quantity)} ${escapeHtml(entry.unit || '')}`.trim() : '';
      const macros = [`${formatFoodNumber(entry.calories)} kcal`, `P ${formatFoodNumber(entry.proteinG)} g`, `UH ${formatFoodNumber(entry.carbsG)} g`, `M ${formatFoodNumber(entry.fatG)} g`].join(' · ');
      return `<article class="food-entry-item"><div class="food-entry-main"><span class="food-meal-type">${escapeHtml(getFoodMealLabel(entry.mealType))}</span><strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(quantity)}${quantity && entry.note ? ' · ' : ''}${escapeHtml(entry.note || '')}</small><span>${escapeHtml(macros)}</span></div><div class="food-entry-actions"><button class="btn btn-secondary" data-action="edit-food-entry" data-food-entry-id="${escapeHtml(entry.id)}" type="button">Uredi</button><button class="food-delete-button" data-action="delete-food-entry" data-food-entry-id="${escapeHtml(entry.id)}" type="button">Obriši</button></div></article>`;
    }).join('');
  }

  async function loadFoodEntriesForSelectedDay({ force = false } = {}) {
    if (!currentUser) return;
    const date = getFoodSelectedDate();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const cached = readFoodEntriesCache(currentUser.uid, date);
    if (cached) {
      foodEntries = [...cached.items].sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
      foodEntriesLoadedDate = date;
      renderFoodEntries();
      if (!force && Date.now() - Number(cached.savedAt || 0) < FOOD_ENTRIES_CACHE_TTL_MS) return;
    }
    try {
      const snapshot = await getDocs(query(collection(db, 'foodEntries'), where('userId', '==', currentUser.uid), where('date', '==', date), limit(100)));
      foodEntries = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
      foodEntriesLoadedDate = date;
      writeFoodEntriesCache(currentUser.uid, date, foodEntries);
      renderFoodEntries();
      const status = document.getElementById('food-entries-status');
      if (status) status.textContent = '';
    } catch (error) {
      console.error('Food entries load diagnostic:', error);
      const status = document.getElementById('food-entries-status');
      if (status) status.textContent = 'Unosi ishrane trenutno nisu dostupni. Provjeri internet i pokušaj ponovo.';
    }
  }

  window.openFoodEntryModal = function() {
    if (!currentUser) return;
    ensureFoodLibraryPicker();
    editingFoodEntryId = null;
    activeFoodLibraryItemId = null;
    foodLibraryCategory = 'all';
    document.querySelectorAll('#food-entry-modal input, #food-entry-modal textarea').forEach((field) => { field.value = ''; });
    document.getElementById('food-entry-meal-type').value = 'breakfast';
    document.getElementById('food-entry-title').textContent = 'Dodaj obrok';
    document.getElementById('food-entry-save-button').textContent = 'Sačuvaj obrok';
    document.getElementById('food-entry-status').textContent = '';
    document.getElementById('save-food-favorite-button').hidden = true;
    renderFoodLibraryPicker();
    document.getElementById('food-entry-modal').style.display = 'flex';
  };

  window.openFoodEntryForEdit = function(id) {
    const entry = foodEntries.find((item) => item.id === id);
    if (!entry) { ShowToast('Ovaj unos nije pronađen.', 'error'); return; }
    editingFoodEntryId = id;
    ensureFoodLibraryPicker();
    activeFoodLibraryItemId = null;
    document.getElementById('food-entry-meal-type').value = entry.mealType || 'other';
    document.getElementById('food-entry-name').value = entry.name || '';
    document.getElementById('food-entry-quantity').value = entry.quantity ?? '';
    document.getElementById('food-entry-unit').value = entry.unit || '';
    document.getElementById('food-entry-calories').value = entry.calories ?? '';
    document.getElementById('food-entry-protein').value = entry.proteinG ?? '';
    document.getElementById('food-entry-carbs').value = entry.carbsG ?? '';
    document.getElementById('food-entry-fat').value = entry.fatG ?? '';
    document.getElementById('food-entry-note').value = entry.note || '';
    document.getElementById('food-entry-title').textContent = 'Uredi obrok';
    document.getElementById('food-entry-save-button').textContent = 'Sačuvaj promjene';
    document.getElementById('food-entry-status').textContent = '';
    document.getElementById('save-food-favorite-button').hidden = false;
    renderFoodLibraryPicker();
    document.getElementById('food-entry-modal').style.display = 'flex';
  };

  function foodNumber(id, { required = false, min = 0, max = 2000 } = {}) {
    const raw = document.getElementById(id)?.value.trim() || '';
    if (!raw && !required) return null;
    const number = Number(raw);
    return Number.isFinite(number) && number >= min && number <= max ? number : undefined;
  }

  window.saveFoodEntry = async function() {
    if (!currentUser) return;
    const date = getFoodSelectedDate();
    const mealType = document.getElementById('food-entry-meal-type')?.value;
    const name = document.getElementById('food-entry-name')?.value.trim() || '';
    const quantity = foodNumber('food-entry-quantity', { min: .1, max: 10000 });
    const calories = foodNumber('food-entry-calories', { required: true, min: 0, max: 10000 });
    const proteinG = foodNumber('food-entry-protein', { min: 0, max: 2000 });
    const carbsG = foodNumber('food-entry-carbs', { min: 0, max: 2000 });
    const fatG = foodNumber('food-entry-fat', { min: 0, max: 2000 });
    const unit = document.getElementById('food-entry-unit')?.value.trim() || '';
    const note = document.getElementById('food-entry-note')?.value.trim() || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !['breakfast', 'lunch', 'dinner', 'snack', 'other'].includes(mealType) || !name || name.length > 120 || !unit || unit.length > 30 || quantity === undefined || calories === undefined || proteinG === undefined || carbsG === undefined || fatG === undefined || note.length > 500) {
      ShowToast('Provjeri naziv, količinu, jedinicu i nutritivne vrijednosti.', 'error'); return;
    }
    if (!editingFoodEntryId && foodEntries.length >= 100) { ShowToast('Za ovaj dan možeš sačuvati najviše 100 unosa.', 'error'); return; }
    const data = { userId: currentUser.uid, date, mealType, name, quantity, unit, calories, proteinG: proteinG ?? 0, carbsG: carbsG ?? 0, fatG: fatG ?? 0, note, createdAt: editingFoodEntryId ? (foodEntries.find((item) => item.id === editingFoodEntryId)?.createdAt || new Date().toISOString()) : new Date().toISOString() };
    const button = document.getElementById('food-entry-save-button');
    if (button) { button.disabled = true; button.textContent = 'Čuvam…'; }
    try {
      if (editingFoodEntryId) {
        await setDoc(doc(db, 'foodEntries', editingFoodEntryId), data);
        foodEntries = foodEntries.map((item) => item.id === editingFoodEntryId ? { ...item, ...data } : item);
      } else {
        const saved = await addDoc(collection(db, 'foodEntries'), data);
        foodEntries = [...foodEntries, { id: saved.id, ...data }];
      }
      foodEntries.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
      writeFoodEntriesCache(currentUser.uid, date, foodEntries);
      foodEntriesLoadedDate = date;
      editingFoodEntryId = null;
      document.getElementById('food-entry-modal').style.display = 'none';
      renderFoodEntries();
      ShowToast('Obrok je sačuvan.');
    } catch (error) {
      console.error('Food entry save diagnostic:', error);
      ShowToast('Obrok nije moguće sačuvati. Provjeri internet i pokušaj ponovo.', 'error');
    } finally { if (button) { button.disabled = false; button.textContent = editingFoodEntryId ? 'Sačuvaj promjene' : 'Sačuvaj obrok'; } }
  };

  window.deleteFoodEntry = function(id) {
    const entry = foodEntries.find((item) => item.id === id);
    if (!entry) { ShowToast('Ovaj unos nije pronađen.', 'error'); return; }
    pendingFoodEntryDeleteId = id;
    document.getElementById('food-entry-delete-name').textContent = entry.name;
    document.getElementById('food-entry-delete-modal').style.display = 'flex';
  };

  window.confirmFoodEntryDelete = async function() {
    if (!currentUser || !pendingFoodEntryDeleteId) return;
    const id = pendingFoodEntryDeleteId;
    const button = document.getElementById('confirm-food-entry-delete');
    if (button) button.disabled = true;
    try {
      await deleteDoc(doc(db, 'foodEntries', id));
      foodEntries = foodEntries.filter((item) => item.id !== id);
      writeFoodEntriesCache(currentUser.uid, getFoodSelectedDate(), foodEntries);
      pendingFoodEntryDeleteId = null;
      document.getElementById('food-entry-delete-modal').style.display = 'none';
      renderFoodEntries();
      ShowToast('Unos je obrisan.');
    } catch (error) { console.error('Food entry delete diagnostic:', error); ShowToast('Unos nije moguće obrisati. Provjeri internet i pokušaj ponovo.', 'error'); }
    finally { if (button) button.disabled = false; }
  };

  window.cancelFoodEntryDelete = function() { pendingFoodEntryDeleteId = null; document.getElementById('food-entry-delete-modal').style.display = 'none'; };
  function nutritionGoalInput(id, { integer = false, max = 2000 } = {}) {
    const raw = document.getElementById(id)?.value.trim() || '';
    if (!raw) return { value: null };
    const value = validNutritionGoal(raw, { integer, max });
    return value == null ? { error: true } : { value };
  }

  function setNutritionGoalModalCopy() {
    const title = document.getElementById('food-goal-title');
    const help = document.querySelector('#food-goal-modal .profile-modal-help');
    const action = document.querySelector('#food-goal-modal [data-action="save-food-goal"]');
    const clear = document.querySelector('#food-goal-modal [data-action="clear-food-goal"]');
    const localNote = document.querySelector('#food-goal-modal .weekly-goal-local-note');
    if (title) title.textContent = 'Ciljevi ishrane';
    if (help) help.textContent = 'Ovo su tvoji lični dnevni podsjetnici. Sva polja su opcionalna i možeš ih promijeniti ili ukloniti kad god želiš.';
    if (action) action.textContent = 'Sačuvaj ciljeve';
    if (clear) clear.textContent = 'Ukloni sve ciljeve';
    if (localNote) localNote.textContent = 'Možeš koristiti dnevnik hrane i kada nijedan cilj nije postavljen.';
    const calorieInput = document.getElementById('food-daily-goal-input');
    if (!calorieInput || document.getElementById('food-protein-goal-input')) return;
    const macroGrid = document.createElement('div');
    macroGrid.className = 'food-goal-macro-grid';
    macroGrid.innerHTML = '<div><label class="settings-label" for="food-protein-goal-input">Proteini (g)</label><input id="food-protein-goal-input" class="custom-input" type="number" min="1" max="2000" step="0.1" inputmode="decimal" placeholder="npr. 140"></div><div><label class="settings-label" for="food-carbs-goal-input">Ugljikohidrati (g)</label><input id="food-carbs-goal-input" class="custom-input" type="number" min="1" max="2000" step="0.1" inputmode="decimal" placeholder="npr. 250"></div><div><label class="settings-label" for="food-fat-goal-input">Masti (g)</label><input id="food-fat-goal-input" class="custom-input" type="number" min="1" max="2000" step="0.1" inputmode="decimal" placeholder="npr. 70"></div>';
    calorieInput.insertAdjacentElement('afterend', macroGrid);
    const calorieLabel = document.querySelector('label[for="food-daily-goal-input"]');
    if (calorieLabel) calorieLabel.textContent = 'Kalorije dnevno';
  }

  window.openFoodGoalModal = function() {
    if (!currentUser) return;
    setNutritionGoalModalCopy();
    const goals = getNutritionGoals();
    document.getElementById('food-daily-goal-input').value = goals.calories || '';
    document.getElementById('food-protein-goal-input').value = goals.protein || '';
    document.getElementById('food-carbs-goal-input').value = goals.carbs || '';
    document.getElementById('food-fat-goal-input').value = goals.fat || '';
    document.getElementById('food-goal-status').textContent = '';
    document.getElementById('food-goal-modal').style.display = 'flex';
  };

  window.saveFoodGoal = async function() {
    if (!currentUser) return;
    const status = document.getElementById('food-goal-status');
    const values = {
      calories: nutritionGoalInput('food-daily-goal-input', { integer: true, max: 10000 }),
      protein: nutritionGoalInput('food-protein-goal-input'),
      carbs: nutritionGoalInput('food-carbs-goal-input'),
      fat: nutritionGoalInput('food-fat-goal-input')
    };
    if (Object.values(values).some((item) => item.error)) {
      status.textContent = 'Unesi pozitivan broj u svakom polju koje želiš pratiti.';
      return;
    }
    const updates = {};
    Object.entries(NUTRITION_GOAL_FIELDS).forEach(([key, field]) => {
      updates[field] = values[key].value == null ? deleteField() : values[key].value;
    });
    const button = document.querySelector('#food-goal-modal [data-action="save-food-goal"]');
    if (button) { button.disabled = true; button.textContent = 'Čuvam…'; }
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), updates);
      const nextProfile = { ...(currentProfileData || {}) };
      Object.entries(NUTRITION_GOAL_FIELDS).forEach(([key, field]) => {
        if (values[key].value == null) delete nextProfile[field];
        else nextProfile[field] = values[key].value;
      });
      currentProfileData = nextProfile;
      localStorage.removeItem(getFoodGoalStorageKey());
      document.getElementById('food-goal-modal').style.display = 'none';
      renderFoodEntries();
      renderProfileSettings();
      ShowToast('Ciljevi ishrane su sačuvani.');
    } catch (error) {
      console.error('Nutrition goals save diagnostic:', error);
      status.textContent = 'Ciljeve trenutno nije moguće sačuvati. Provjeri internet i pokušaj ponovo.';
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Sačuvaj ciljeve'; }
    }
  };

  window.clearFoodGoal = async function() {
    if (!currentUser) return;
    const status = document.getElementById('food-goal-status');
    const updates = Object.fromEntries(Object.values(NUTRITION_GOAL_FIELDS).map((field) => [field, deleteField()]));
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), updates);
      const nextProfile = { ...(currentProfileData || {}) };
      Object.values(NUTRITION_GOAL_FIELDS).forEach((field) => delete nextProfile[field]);
      currentProfileData = nextProfile;
      localStorage.removeItem(getFoodGoalStorageKey());
      document.getElementById('food-goal-modal').style.display = 'none';
      renderFoodEntries();
      renderProfileSettings();
      ShowToast('Ciljevi ishrane su uklonjeni.');
    } catch (error) {
      console.error('Nutrition goals clear diagnostic:', error);
      status.textContent = 'Ciljeve trenutno nije moguće ukloniti. Provjeri internet i pokušaj ponovo.';
    }
  };

  function mealPlanOptionsFromForm() {
    const value = (id) => document.getElementById(id)?.value;
    const options = {
      goal: value('meal-plan-goal'),
      startDate: value('meal-plan-start'),
      people: Number(value('meal-plan-people')),
      dayCount: Number(value('meal-plan-days')),
      mealCount: Number(value('meal-plan-count')),
      budget: Number(value('meal-plan-budget')),
      currency: value('meal-plan-currency'),
      diet: value('meal-plan-diet'),
      highProtein: document.getElementById('meal-plan-high-protein')?.checked === true,
      simpleOnly: document.getElementById('meal-plan-simple')?.checked === true,
      maxMinutes: Number(value('meal-plan-minutes')),
      allergies: value('meal-plan-allergies')?.trim() || '',
      disliked: value('meal-plan-disliked')?.trim() || ''
    };
    if (!['lose_weight', 'maintain', 'gain_weight'].includes(options.goal)
      || !/^\d{4}-\d{2}-\d{2}$/.test(options.startDate || '')
      || !Number.isInteger(options.people) || options.people < 1 || options.people > 10
      || !Number.isInteger(options.dayCount) || options.dayCount < 1 || options.dayCount > 7
      || !Number.isInteger(options.mealCount) || options.mealCount < 2 || options.mealCount > 5
      || !Number.isFinite(options.budget) || options.budget < 1 || options.budget > 1000000
      || !MEAL_CURRENCIES[options.currency] || !['none', 'vegetarian', 'vegan', 'halal'].includes(options.diet)
      || !Number.isInteger(options.maxMinutes) || options.maxMinutes < 5 || options.maxMinutes > 180
      || options.allergies.length > 1000 || options.disliked.length > 1000) return null;
    return options;
  }

  function mealPlanCurrencyAmount(eur, currency) {
    const config = MEAL_CURRENCIES[currency] || MEAL_CURRENCIES.EUR;
    return `${formatFoodNumber(Math.round(eur * config.factor * 100) / 100)} ${config.symbol}`;
  }

  function formatMealPlanDate(date) {
    const language = getCurrentLanguage();
    const locale = language === 'de' ? 'de-DE' : language === 'en' ? 'en-GB' : 'sr-Latn-RS';
    const parsed = new Date(`${date}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? String(date) : new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'short' }).format(parsed);
  }

  function combinedMealAllergies(...values) {
    return values.map((value) => String(value || '').trim())
      .filter((value) => value && !/^(nemam|nema|none|no allergies|no restrictions|keine)/i.test(value))
      .join(', ');
  }

  function mealPlannerCopy() {
    const copy = {
      sr: {
        savedLoading: 'Učitavanje sačuvanih planova…', savedEmpty: 'Još nema sačuvanih planova.', savedUnavailable: 'Sačuvani planovi trenutno nisu dostupni. Provjeri internet i pokušaj ponovo.',
        day: (count) => `${count} ${count === 1 ? 'dan' : 'dana'}`, mealsPerDay: (count) => `${count} obroka dnevno`, people: (count) => `Za ${count} ${count === 1 ? 'osobu' : 'osoba'}`,
        estimate: 'procjena', perPerson: 'Po osobi: oko', dailyEstimate: 'Procjena po osobi:', totalEstimate: 'Ukupna procjena:', budget: 'Okvirni budžet:',
        breakfast: 'Doručak', lunch: 'Ručak', dinner: 'Večera', snack: 'Užina', open: 'Otvori', delete: 'Obriši', replace: 'Zamijeni', addDiary: 'Dodaj u dnevnik',
        save: 'Sačuvaj plan', newPlan: 'Novi prijedlog', close: 'Zatvori prijedlog', proposal: 'PRIJEDLOG OBROKA',
        unsafe: 'Ovaj obrok sada ne odgovara tvojim ograničenjima. Napravi novi plan.',
        unsafePlan: 'Neka ograničenja su promijenjena ili neprepoznata. Napravi novi plan prije dodavanja obroka.',
        disclaimer: 'Kalorije, makroi i cijene su procjene. Cijene su lokalni okvirni iznosi, bez podataka iz prodavnica; omjeri valuta su ilustrativni. Provjeri sastojke i deklaracije, posebno kod alergija. Ovaj plan nije zamjena za doktora ili nutricionistu.',
        badForm: 'Provjeri datum, budžet, broj osoba, dana i obroka.',
        unknown: (terms) => `Ne prepoznajemo: ${terms}. Upiši tačan naziv namirnice iz naše biblioteke ili poznati alergen, pa pokušaj ponovo.`,
        noRecipes: 'Nema dovoljno odgovarajućih recepata za ova ograničenja i vrijeme pripreme. Promijeni izbor ili sačekaj proširenje biblioteke.',
        lowBudget: (amount) => `Okvirni budžet je ispod najjeftinije procjene za ove izbore (oko ${amount}). Povećaj budžet ili smanji broj dana, osoba ili obroka.`,
        swapUnavailable: 'Nema druge odgovarajuće zamjene unutar ovih ograničenja i budžeta.', swapped: 'Obrok je zamijenjen. Sačuvaj plan ako želiš zadržati izmjenu.',
        diaryReview: 'Pregledaj obrok i klikni „Sačuvaj obrok“ za potvrdu.', diaryNote: 'Iz planera obroka; nutritivne vrijednosti su procjena.',
        tooLong: 'Lista alergija i ograničenja je preduga. Skrati unos.', limitPlans: 'Možeš čuvati najviše 10 planova. Obriši jedan stari plan prije čuvanja novog.',
        loadFirst: 'Prvo učitaj sačuvane planove pa pokušaj ponovo.', changesUnsafe: 'Ograničenja su promijenjena. Napravi novi plan.',
        saved: 'Plan obroka je sačuvan.', saveFailed: 'Plan trenutno nije moguće sačuvati. Provjeri internet i pokušaj ponovo.',
        deleted: 'Sačuvani plan je obrisan.', deleteFailed: 'Plan trenutno nije moguće obrisati.'
      },
      en: {
        savedLoading: 'Loading saved meal plans…', savedEmpty: 'No saved meal plans yet.', savedUnavailable: 'Saved plans are unavailable. Check your connection and try again.',
        day: (count) => `${count} ${count === 1 ? 'day' : 'days'}`, mealsPerDay: (count) => `${count} meals per day`, people: (count) => `For ${count} ${count === 1 ? 'person' : 'people'}`,
        estimate: 'estimate', perPerson: 'Per person: about', dailyEstimate: 'Estimated per person:', totalEstimate: 'Total estimate:', budget: 'Approximate budget:',
        breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', open: 'Open', delete: 'Delete', replace: 'Swap', addDiary: 'Add to food diary',
        save: 'Save plan', newPlan: 'New suggestion', close: 'Close suggestion', proposal: 'MEAL SUGGESTION',
        unsafe: 'This meal no longer matches your restrictions. Create a new plan.',
        unsafePlan: 'Some restrictions have changed or cannot be recognized. Create a new plan before adding meals.',
        disclaimer: 'Calories, macros and prices are estimates. Prices are local illustrative amounts, not store prices; currency factors are illustrative. Check ingredients and labels, especially for allergies. This plan does not replace a doctor or dietitian.',
        badForm: 'Check the date, budget, number of people, days and meals.',
        unknown: (terms) => `Not recognized: ${terms}. Enter a food name from our catalogue or a known allergen, then try again.`,
        noRecipes: 'There are not enough suitable recipes for these restrictions and preparation time. Change your choices or wait for a larger recipe catalogue.',
        lowBudget: (amount) => `Your approximate budget is below the lowest estimate for these choices (about ${amount}). Increase the budget or reduce days, people or meals.`,
        swapUnavailable: 'No other suitable replacement fits these restrictions and budget.', swapped: 'Meal swapped. Save the plan if you want to keep the change.',
        diaryReview: 'Review the meal and click “Save meal” to confirm.', diaryNote: 'From the meal planner; nutrition values are estimates.',
        tooLong: 'The allergy and restriction list is too long. Shorten the entry.', limitPlans: 'You can save up to 10 plans. Delete an old plan before saving a new one.',
        loadFirst: 'Load your saved plans first, then try again.', changesUnsafe: 'Your restrictions have changed. Create a new plan.',
        saved: 'Meal plan saved.', saveFailed: 'The plan could not be saved. Check your connection and try again.',
        deleted: 'Saved plan deleted.', deleteFailed: 'The plan could not be deleted.'
      },
      de: {
        savedLoading: 'Gespeicherte Essenspläne werden geladen…', savedEmpty: 'Noch keine gespeicherten Essenspläne.', savedUnavailable: 'Gespeicherte Pläne sind nicht verfügbar. Prüfe deine Verbindung und versuche es erneut.',
        day: (count) => `${count} ${count === 1 ? 'Tag' : 'Tage'}`, mealsPerDay: (count) => `${count} Mahlzeiten pro Tag`, people: (count) => `Für ${count} ${count === 1 ? 'Person' : 'Personen'}`,
        estimate: 'Schätzung', perPerson: 'Pro Person: etwa', dailyEstimate: 'Geschätzt pro Person:', totalEstimate: 'Gesamtschätzung:', budget: 'Ungefähres Budget:',
        breakfast: 'Frühstück', lunch: 'Mittagessen', dinner: 'Abendessen', snack: 'Snack', open: 'Öffnen', delete: 'Löschen', replace: 'Tauschen', addDiary: 'Ins Ernährungstagebuch',
        save: 'Plan speichern', newPlan: 'Neuer Vorschlag', close: 'Vorschlag schließen', proposal: 'ESSENSVORSCHLAG',
        unsafe: 'Diese Mahlzeit entspricht deinen Einschränkungen nicht mehr. Erstelle einen neuen Plan.',
        unsafePlan: 'Einige Einschränkungen haben sich geändert oder werden nicht erkannt. Erstelle vor dem Hinzufügen von Mahlzeiten einen neuen Plan.',
        disclaimer: 'Kalorien, Makros und Preise sind Schätzungen. Die Preise sind lokale Richtwerte, keine Ladenpreise; Währungsfaktoren sind beispielhaft. Prüfe Zutaten und Etiketten, besonders bei Allergien. Dieser Plan ersetzt keine ärztliche oder ernährungsfachliche Beratung.',
        badForm: 'Prüfe Datum, Budget sowie die Anzahl der Personen, Tage und Mahlzeiten.',
        unknown: (terms) => `Nicht erkannt: ${terms}. Gib einen Namen aus unserem Katalog oder ein bekanntes Allergen ein und versuche es erneut.`,
        noRecipes: 'Für diese Einschränkungen und Zubereitungszeit gibt es nicht genug passende Rezepte. Ändere deine Auswahl oder warte auf einen größeren Rezeptkatalog.',
        lowBudget: (amount) => `Dein ungefähres Budget liegt unter der günstigsten Schätzung für diese Auswahl (etwa ${amount}). Erhöhe das Budget oder reduziere Tage, Personen oder Mahlzeiten.`,
        swapUnavailable: 'Keine andere passende Alternative liegt innerhalb dieser Einschränkungen und des Budgets.', swapped: 'Mahlzeit getauscht. Speichere den Plan, wenn du die Änderung behalten möchtest.',
        diaryReview: 'Prüfe die Mahlzeit und klicke zur Bestätigung auf „Mahlzeit speichern“.', diaryNote: 'Aus dem Essensplaner; Nährwerte sind Schätzungen.',
        tooLong: 'Die Liste mit Allergien und Einschränkungen ist zu lang. Kürze die Eingabe.', limitPlans: 'Du kannst bis zu 10 Pläne speichern. Lösche einen alten Plan, bevor du einen neuen speicherst.',
        loadFirst: 'Lade zuerst deine gespeicherten Pläne und versuche es erneut.', changesUnsafe: 'Deine Einschränkungen haben sich geändert. Erstelle einen neuen Plan.',
        saved: 'Essensplan gespeichert.', saveFailed: 'Der Plan konnte nicht gespeichert werden. Prüfe deine Verbindung und versuche es erneut.',
        deleted: 'Gespeicherter Plan gelöscht.', deleteFailed: 'Der Plan konnte nicht gelöscht werden.'
      }
    };
    return copy[getCurrentLanguage()] || copy.sr;
  }

  function mealPlanRecipeAllowed(item, options) {
    if (!item || !options) return false;
    const currentAllergies = currentProfileData?.foodAllergies || '';
    const combined = { ...options, allergies: combinedMealAllergies(options.allergies, currentAllergies) };
    const available = eligibleMealRecipes(combined);
    return !available.unknown.length && available.recipes.some((candidate) => candidate.id === item.id);
  }

  function renderSavedMealPlans() {
    const root = document.getElementById('meal-planner-saved-list');
    if (!root) return;
    const copy = mealPlannerCopy();
    if (!savedMealPlansLoaded) { root.textContent = copy.savedLoading; return; }
    if (!savedMealPlans.length) { root.textContent = copy.savedEmpty; return; }
    root.innerHTML = savedMealPlans.map((plan) => `<div class="meal-planner-saved-item"><div><strong>${escapeHtml(formatMealPlanDate(plan.startDate))} · ${copy.day(plan.days.length)}</strong><small>${copy.people(plan.people)} · ${copy.mealsPerDay(plan.mealCount)} · ${copy.estimate} ${escapeHtml(mealPlanCurrencyAmount(plan.estimatedCostEur, plan.currency))}</small></div><span><button class="btn btn-secondary" data-action="show-saved-meal-plan" data-meal-plan-id="${escapeHtml(plan.id)}" type="button">${copy.open}</button><button class="food-delete-button" data-action="delete-meal-plan" data-meal-plan-id="${escapeHtml(plan.id)}" type="button">${copy.delete}</button></span></div>`).join('');
  }

  async function loadSavedMealPlans(force = false) {
    if (!currentUser || (savedMealPlansLoaded && !force)) return;
    const userId = currentUser.uid;
    const root = document.getElementById('meal-planner-saved-list');
    if (root && !savedMealPlansLoaded) root.textContent = mealPlannerCopy().savedLoading;
    try {
      const snapshot = await getDocs(query(collection(db, 'users', userId, 'mealPlans'), orderBy('createdAt', 'desc'), limit(10)));
      if (currentUser?.uid !== userId) return;
      savedMealPlans = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
        .filter((plan) => plan.userId === userId && validStoredMealPlan(plan));
      savedMealPlansLoaded = true;
      renderSavedMealPlans();
    } catch (error) {
      console.error('Meal plans load diagnostic:', error);
      if (root) root.textContent = mealPlannerCopy().savedUnavailable;
    }
  }

  function renderMealPlan() {
    const root = document.getElementById('meal-planner-result');
    if (!root) return;
    if (!activeMealPlan || !activeMealPlanOptions) { root.innerHTML = ''; return; }
    const plan = activeMealPlan;
    const options = activeMealPlanOptions;
    const copy = mealPlannerCopy();
    const currentRestrictions = { ...options, allergies: combinedMealAllergies(options.allergies, currentProfileData?.foodAllergies) };
    const available = eligibleMealRecipes(currentRestrictions);
    const allowedIds = new Set(available.recipes.map((item) => item.id));
    const unsafe = available.unknown.length > 0 || plan.days.some((day) => day.meals.some((meal) => !allowedIds.has(meal.recipeId)));
    const cost = mealPlanCurrencyAmount(plan.estimatedCostEur, options.currency);
    const days = plan.days.map((day, dayIndex) => {
      const totals = mealPlanTotals(day);
      if (!totals) return '';
      const meals = day.meals.map((meal, mealIndex) => {
        const item = getMealRecipe(meal.recipeId);
        const nutrition = recipeNutrition(item);
        const ingredients = recipeIngredients(item, getCurrentLanguage());
        const allowed = allowedIds.has(item.id);
        const slotLabel = copy[meal.slot] || copy.snack;
        const portions = ingredients.map((ingredient) => `${escapeHtml(ingredient.name)} ${formatFoodNumber(ingredient.quantity * options.people)} ${escapeHtml(ingredient.unit)}`).join(' · ');
        return `<article class="meal-planner-meal"><small>${slotLabel} · ${item.minutes} min · ${copy.estimate} ${escapeHtml(mealPlanCurrencyAmount(item.costEur * options.people, options.currency))}</small><strong>${escapeHtml(getMealRecipeName(item, getCurrentLanguage()))}</strong><p>${copy.people(options.people)}: ${portions}</p><p>${copy.perPerson} ${formatFoodNumber(nutrition.calories)} kcal · P ${formatFoodNumber(nutrition.proteinG)} g · UH ${formatFoodNumber(nutrition.carbsG)} g · M ${formatFoodNumber(nutrition.fatG)} g</p>${allowed ? `<div class="meal-planner-meal-actions"><button class="btn btn-secondary" data-action="replace-meal-plan-meal" data-day-index="${dayIndex}" data-meal-index="${mealIndex}" type="button">${copy.replace}</button><button class="btn btn-secondary" data-action="add-meal-plan-meal-to-diary" data-day-index="${dayIndex}" data-meal-index="${mealIndex}" type="button">${copy.addDiary}</button></div>` : `<p>${copy.unsafe}</p>`}</article>`;
      }).join('');
      return `<section class="card meal-planner-day"><h4>${escapeHtml(formatMealPlanDate(day.date))}</h4><div class="meal-planner-meals">${meals}</div><div class="meal-planner-day-totals">${copy.dailyEstimate} ${formatFoodNumber(totals.calories)} kcal · P ${formatFoodNumber(totals.proteinG)} g · UH ${formatFoodNumber(totals.carbsG)} g · M ${formatFoodNumber(totals.fatG)} g</div></section>`;
    }).join('');
    root.innerHTML = `<div class="card meal-planner-result-head"><span class="settings-eyebrow">${copy.proposal}</span><h3>${copy.day(plan.days.length)} · ${copy.mealsPerDay(options.mealCount)}</h3><div class="meal-planner-summary"><span>${copy.people(options.people)}</span><span>${copy.totalEstimate} ${escapeHtml(cost)}</span><span>${copy.budget} ${formatFoodNumber(options.budget)} ${escapeHtml(options.currency)}</span></div><p>${copy.disclaimer}</p>${unsafe ? `<p>${copy.unsafePlan}</p>` : ''}<div class="meal-planner-result-actions">${!plan.id && !unsafe ? `<button class="btn" data-action="save-meal-plan" type="button">${copy.save}</button>` : ''}<button class="btn btn-secondary" data-action="open-meal-planner" type="button">${copy.newPlan}</button><button class="btn btn-secondary" data-action="discard-meal-plan" type="button">${copy.close}</button></div><p id="meal-planner-save-status" class="settings-status" role="status"></p></div>${days}`;
  }

  window.openMealPlanner = function() {
    if (!currentUser) return;
    const language = getCurrentLanguage();
    if (language !== 'sr') {
      document.querySelectorAll('#meal-plan-goal option, #meal-plan-diet option').forEach((option) => { option.textContent = translateUiText(option.textContent, language); });
      document.querySelectorAll('#meal-plan-days option').forEach((option) => { const count = Number(option.value); option.textContent = `${count} ${language === 'de' ? (count === 1 ? 'Tag' : 'Tage') : (count === 1 ? 'day' : 'days')}`; });
      document.querySelectorAll('#meal-plan-count option').forEach((option) => { const count = Number(option.value); option.textContent = `${count} ${language === 'de' ? 'Mahlzeiten' : 'meals'}`; });
      document.querySelectorAll('#meal-plan-minutes option').forEach((option) => { option.textContent = `${option.value} ${language === 'de' ? 'Minuten' : 'minutes'}`; });
    }
    const profileGoal = currentProfileData?.goal;
    document.getElementById('meal-plan-goal').value = ['lose_weight', 'maintain', 'gain_weight'].includes(profileGoal) ? profileGoal : 'maintain';
    document.getElementById('meal-plan-start').value = getFoodSelectedDate();
    document.getElementById('meal-plan-allergies').value = currentProfileData?.foodAllergies || '';
    document.getElementById('meal-planner-form-status').textContent = '';
    document.getElementById('meal-planner-modal').style.display = 'flex';
  };

  window.generateMealPlan = function() {
    if (!currentUser) return;
    const status = document.getElementById('meal-planner-form-status');
    const copy = mealPlannerCopy();
    const options = mealPlanOptionsFromForm();
    if (!options) { status.textContent = copy.badForm; return; }
    options.allergies = combinedMealAllergies(options.allergies, currentProfileData?.foodAllergies);
    if (options.allergies.length > 1000) { status.textContent = copy.tooLong; return; }
    const result = buildMealPlan(options);
    if (result.error === 'unknown-restrictions') {
      status.textContent = copy.unknown(result.unknown.join(', '));
      return;
    }
    if (result.error === 'no-recipes') { status.textContent = copy.noRecipes; return; }
    if (result.error === 'budget') { status.textContent = copy.lowBudget(mealPlanCurrencyAmount(result.minimumCostEur, options.currency)); return; }
    activeMealPlanOptions = options;
    activeMealPlan = { ...result, ...options, userId: currentUser.uid, createdAt: new Date().toISOString() };
    document.getElementById('meal-planner-modal').style.display = 'none';
    renderMealPlan();
    document.getElementById('meal-planner-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.replaceMealPlanMeal = function(dayIndex, mealIndex) {
    if (!activeMealPlan || !activeMealPlanOptions) return;
    const liveOptions = { ...activeMealPlanOptions, allergies: combinedMealAllergies(activeMealPlanOptions.allergies, currentProfileData?.foodAllergies) };
    const updated = replaceMealInPlan(activeMealPlan, dayIndex, mealIndex, liveOptions);
    if (!updated) { ShowToast(mealPlannerCopy().swapUnavailable, 'error'); return; }
    activeMealPlan = { ...updated };
    delete activeMealPlan.id;
    renderMealPlan();
    ShowToast(mealPlannerCopy().swapped);
  };

  window.saveMealPlan = async function() {
    if (!currentUser || !activeMealPlan || activeMealPlan.id || !activeMealPlanOptions) return;
    const userId = currentUser.uid;
    if (!savedMealPlansLoaded) await loadSavedMealPlans();
    if (currentUser?.uid !== userId || activeMealPlan?.userId !== userId) return;
    if (!savedMealPlansLoaded) { ShowToast(mealPlannerCopy().loadFirst, 'error'); return; }
    if (savedMealPlansLoaded && savedMealPlans.length >= 10) { ShowToast(mealPlannerCopy().limitPlans, 'error'); return; }
    if (activeMealPlan.days.some((day) => day.meals.some((meal) => !mealPlanRecipeAllowed(getMealRecipe(meal.recipeId), activeMealPlanOptions)))) {
      ShowToast(mealPlannerCopy().changesUnsafe, 'error'); return;
    }
    const button = document.querySelector('[data-action="save-meal-plan"]');
    if (button) button.disabled = true;
    const { id: ignoredId, ...data } = activeMealPlan;
    try {
      const saved = await addDoc(collection(db, 'users', userId, 'mealPlans'), data);
      if (currentUser?.uid !== userId) return;
      activeMealPlan = { ...data, id: saved.id };
      savedMealPlans = [{ ...data, id: saved.id }, ...savedMealPlans].slice(0, 10);
      savedMealPlansLoaded = true;
      renderSavedMealPlans();
      renderMealPlan();
      ShowToast(mealPlannerCopy().saved);
    } catch (error) {
      console.error('Meal plan save diagnostic:', error);
      const status = document.getElementById('meal-planner-save-status');
      if (status) status.textContent = mealPlannerCopy().saveFailed;
      if (button) button.disabled = false;
    }
  };

  window.showSavedMealPlan = function(id) {
    const plan = savedMealPlans.find((item) => item.id === id);
    if (!plan) return;
    activeMealPlan = { ...plan, days: plan.days.map((day) => ({ ...day, meals: day.meals.map((meal) => ({ ...meal })) })) };
    activeMealPlanOptions = { ...plan };
    renderMealPlan();
    document.getElementById('meal-planner-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.deleteMealPlan = function(id) {
    if (!savedMealPlans.some((item) => item.id === id)) return;
    pendingMealPlanDeleteId = id;
    document.getElementById('meal-planner-delete-modal').style.display = 'flex';
  };

  window.cancelMealPlanDelete = function() {
    pendingMealPlanDeleteId = null;
    document.getElementById('meal-planner-delete-modal').style.display = 'none';
  };

  window.confirmMealPlanDelete = async function() {
    if (!currentUser || !pendingMealPlanDeleteId) return;
    const id = pendingMealPlanDeleteId;
    const userId = currentUser.uid;
    const button = document.getElementById('confirm-meal-plan-delete');
    if (button) button.disabled = true;
    try {
      await deleteDoc(doc(db, 'users', userId, 'mealPlans', id));
      if (currentUser?.uid !== userId) return;
      savedMealPlans = savedMealPlans.filter((item) => item.id !== id);
      if (activeMealPlan?.id === id) { activeMealPlan = null; activeMealPlanOptions = null; renderMealPlan(); }
      renderSavedMealPlans();
      window.cancelMealPlanDelete();
      ShowToast(mealPlannerCopy().deleted);
    } catch (error) {
      console.error('Meal plan delete diagnostic:', error);
      ShowToast(mealPlannerCopy().deleteFailed, 'error');
    } finally { if (button) button.disabled = false; }
  };

  window.addMealPlanMealToDiary = async function(dayIndex, mealIndex) {
    if (!currentUser || !activeMealPlan || !activeMealPlanOptions) return;
    const userId = currentUser.uid;
    const day = activeMealPlan.days[dayIndex];
    const meal = day?.meals?.[mealIndex];
    const item = getMealRecipe(meal?.recipeId);
    if (!item || !mealPlanRecipeAllowed(item, activeMealPlanOptions)) {
      ShowToast(mealPlannerCopy().unsafe, 'error'); return;
    }
    document.getElementById('food-selected-date').value = day.date;
    await loadFoodEntriesForSelectedDay();
    if (currentUser?.uid !== userId || activeMealPlan?.userId !== userId) return;
    window.openFoodEntryModal();
    const nutrition = recipeNutrition(item);
    document.getElementById('food-entry-meal-type').value = meal.slot === 'snack' ? 'snack' : meal.slot;
    document.getElementById('food-entry-name').value = getMealRecipeName(item, getCurrentLanguage());
    document.getElementById('food-entry-quantity').value = '1';
    document.getElementById('food-entry-unit').value = 'porcija';
    document.getElementById('food-entry-calories').value = nutrition.calories;
    document.getElementById('food-entry-protein').value = nutrition.proteinG;
    document.getElementById('food-entry-carbs').value = nutrition.carbsG;
    document.getElementById('food-entry-fat').value = nutrition.fatG;
    document.getElementById('food-entry-note').value = mealPlannerCopy().diaryNote;
    ShowToast(mealPlannerCopy().diaryReview);
  };

  async function setBodyTrackingEnabled(enabled) {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { bodyTrackingEnabled: enabled });
      currentProfileData = { ...(currentProfileData || {}), bodyTrackingEnabled: enabled };
      const bodyToggle = document.getElementById('body-tracking-toggle');
      const settingsToggle = document.getElementById('settings-body-tracking-toggle');
      if (bodyToggle) bodyToggle.checked = enabled;
      if (settingsToggle) settingsToggle.checked = enabled;
      renderBodyMeasurements();
      ShowToast(enabled ? 'Praćenje tijela je uključeno.' : 'Praćenje tijela je isključeno.');
    } catch (error) {
      console.error('Body tracking setting diagnostic:', error);
      ShowToast('Podešavanje nije moguće sačuvati.', 'error');
    }
  }

  window.toggleBodyTracking = function() {
    return setBodyTrackingEnabled(document.getElementById('body-tracking-toggle')?.checked === true);
  };

  window.openBodySettings = function() {
    const toggle = document.getElementById('settings-body-tracking-toggle');
    if (toggle) toggle.checked = bodyTrackingEnabled();
    document.getElementById('body-settings-modal')?.style.setProperty('display', 'flex');
  };

  window.toggleBodyTrackingFromSettings = function() {
    return setBodyTrackingEnabled(document.getElementById('settings-body-tracking-toggle')?.checked === true);
  };

  function setRequiredProfileFieldVisible(id, visible) {
    const field = document.getElementById(id);
    if (!field) return;
    const label = document.querySelector(`label[for="${id}"]`);
    [field, label].filter(Boolean).forEach((element) => {
      element.hidden = !visible;
    });
    const preferenceButton = field.nextElementSibling?.matches('.profile-preference-none') ? field.nextElementSibling : null;
    if (preferenceButton) preferenceButton.hidden = !visible;
  }

  const PROFILE_WIZARD_DRAFT_PREFIX = 'gymleader-profile-wizard-draft:';
  let profileWizardState = { steps: [], current: 0, onlyMissing: true, scope: 'onboarding' };
  const PROFILE_WIZARD_STEPS = [
    { id: 'name', fields: ['name'] },
    { id: 'gender', fields: ['gender'] },
    { id: 'age', fields: ['age'] },
    { id: 'body', fields: ['height', 'weight'] },
    { id: 'goal', fields: ['goal'] },
    { id: 'focus', fields: ['focus'] },
    { id: 'frequency', fields: ['frequency'] },
    { id: 'location', fields: ['location'] },
    { id: 'experience', fields: ['experience'] },
    { id: 'minutes', fields: ['minutes'] },
    { id: 'muscles', fields: ['muscles'] },
    { id: 'preferred', fields: ['preferred'] },
    { id: 'avoided', fields: ['avoided'] },
    { id: 'food', fields: ['food'] }
  ];

  function getProfileWizardDraftKey() {
    return currentUser?.uid ? `${PROFILE_WIZARD_DRAFT_PREFIX}${currentUser.uid}` : '';
  }

  function readProfileWizardDraft() {
    try {
      const key = getProfileWizardDraftKey();
      return key ? JSON.parse(localStorage.getItem(key) || 'null') || {} : {};
    } catch { return {}; }
  }

  function saveProfileWizardDraft() {
    try {
      const key = getProfileWizardDraftKey();
      if (key) localStorage.setItem(key, JSON.stringify(readRequiredProfileForm()));
    } catch { /* A local draft is only a convenience. */ }
  }

  function clearProfileWizardDraft() {
    try {
      const key = getProfileWizardDraftKey();
      if (key) localStorage.removeItem(key);
    } catch { /* Nothing to clear. */ }
  }

  function ensureProfilePreferenceMarkup(modal) {
    const section = modal?.querySelector('.profile-preferences-section');
    if (!section || section.dataset.ready === 'true') return;
    section.innerHTML = `
      <span class="settings-label">Preferencije za buduće prijedloge</span>
      <p class="profile-modal-help">Odgovori na svako polje ili izaberi opciju „Nemam“.</p>
      <label class="settings-label" for="required-profile-preferred-exercises">Vježbe koje želiš raditi</label>
      <textarea id="required-profile-preferred-exercises" class="custom-input" rows="2" maxlength="1000" placeholder="npr. čučanj, bench press, zgibovi"></textarea>
      <button class="profile-preference-none" type="button" data-action="set-profile-preference" data-target="required-profile-preferred-exercises" data-value="Nemam posebne vježbe koje želim.">Nemam posebnu želju</button>
      <label class="settings-label" for="required-profile-avoided-exercises">Vježbe koje želiš izbjegavati</label>
      <textarea id="required-profile-avoided-exercises" class="custom-input" rows="2" maxlength="1000" placeholder="npr. čučanj, mrtvo dizanje ili bench press"></textarea>
      <button class="profile-preference-none" type="button" data-action="set-profile-preference" data-target="required-profile-avoided-exercises" data-value="Nemam vježbi koje izbjegavam.">Nemam vježbi koje izbjegavam</button>
      <label class="settings-label" for="required-profile-food-allergies">Alergije i hrana koju moraš izbjegavati</label>
      <textarea id="required-profile-food-allergies" class="custom-input" rows="2" maxlength="1000" placeholder="npr. kikiriki, laktoza, gluten"></textarea>
      <button class="profile-preference-none" type="button" data-action="set-profile-preference" data-target="required-profile-food-allergies" data-value="Nemam alergije ni ograničenja hrane.">Nemam alergije ni ograničenja hrane</button>
      <p class="profile-modal-help">Ovo nije medicinska zaštita. Prije jela uvijek provjeri sastojke i savjet stručnjaka ako imaš alergiju.</p>`;
    const preferredLabel = section.querySelector('label[for="required-profile-preferred-exercises"]');
    const avoidedLabel = section.querySelector('label[for="required-profile-avoided-exercises"]');
    const foodLabel = section.querySelector('label[for="required-profile-food-allergies"]');
    if (preferredLabel) {
      preferredLabel.textContent = 'Preferiram ove vježbe';
      preferredLabel.insertAdjacentHTML('beforebegin', '<div class="profile-preference-heading profile-preference-training-heading"><strong>Trening</strong><small>Upiši vježbe koje voliš ili izaberi „Nemam posebnu želju“.</small></div>');
    }
    if (avoidedLabel) avoidedLabel.textContent = 'Ne želim ove vježbe';
    if (foodLabel) {
      foodLabel.textContent = 'Alergije i hrana koju izbjegavam';
      foodLabel.insertAdjacentHTML('beforebegin', '<div class="profile-preference-heading profile-preference-food-heading"><strong>Ishrana</strong><small>Upiši alergije ili namirnice koje moraš izbjegavati.</small></div>');
    }
    section.dataset.ready = 'true';
  }

  function ensureProfileWizardMarkup(modal) {
    const form = modal?.querySelector('.profile-required-form');
    if (!form || form.dataset.wizardReady === 'true') return;
    modal.querySelector('.profile-required-content > [data-action="save-required-profile"], .profile-required-content > [data-action="save-profile-details"]')?.remove();
    form.innerHTML = `
      <div class="profile-wizard-progress" aria-live="polite"><span id="profile-wizard-step-label"></span><div><i id="profile-wizard-progress-fill"></i></div></div>
      <section class="profile-wizard-step profile-question-card" data-profile-step="name"><span class="profile-question-icon">👋</span><h4>Kako da te zovemo?</h4><p>Možeš unijeti ime ili nadimak.</p><div class="profile-wizard-field" data-profile-field="name"><input id="required-profile-name" class="custom-input" type="text" maxlength="100" autocomplete="name" placeholder="Ime ili nadimak"><small class="profile-field-error"></small></div></section>
      <section class="profile-wizard-step profile-question-card" data-profile-step="gender"><span class="profile-question-icon">🧑</span><h4>Kako da ti se obraćamo?</h4><p>Ovo pomaže GymLeaderu da poruke zvuče prirodno.</p><fieldset class="profile-wizard-field profile-wizard-choice" data-profile-field="gender"><div class="profile-question-options"><label><input type="radio" name="required-profile-gender" value="male"><span>👨 Muško</span></label><label><input type="radio" name="required-profile-gender" value="female"><span>👩 Žensko</span></label><label><input type="radio" name="required-profile-gender" value="unspecified"><span>🙈 Ne želim odgovoriti</span></label></div><small class="profile-field-error"></small></fieldset></section>
      <section class="profile-wizard-step profile-question-card" data-profile-step="age"><span class="profile-question-icon">🎂</span><h4>Koliko imaš godina?</h4><p>Unesi broj između 13 i 100.</p><div class="profile-wizard-field" data-profile-field="age"><input id="required-profile-age" class="custom-input profile-question-input" type="number" min="13" max="100" inputmode="numeric" placeholder="Godine"><small class="profile-field-error"></small></div></section>
      <section class="profile-wizard-step profile-question-card" data-profile-step="body"><span class="profile-question-icon">📏</span><h4>Kolika je tvoja visina i težina?</h4><p>Ovo služi samo za personalizaciju tvog profila.</p><div class="profile-question-number-grid"><div class="profile-wizard-field" data-profile-field="height"><label for="required-profile-height">Visina (cm)</label><input id="required-profile-height" class="custom-input" type="number" min="100" max="250" step="0.1" inputmode="decimal" placeholder="npr. 180"><small class="profile-field-error"></small></div><div class="profile-wizard-field" data-profile-field="weight"><label for="required-profile-weight">Težina (kg)</label><input id="required-profile-weight" class="custom-input" type="number" min="25" max="400" step="0.1" inputmode="decimal" placeholder="npr. 80"><small class="profile-field-error"></small></div></div></section>
      <section class="profile-wizard-step profile-question-card" data-profile-step="goal"><span class="profile-question-icon">🎯</span><h4>Šta želiš postići?</h4><p>Izaberi trenutni cilj.</p><fieldset class="profile-wizard-field profile-wizard-choice" data-profile-field="goal"><div class="profile-question-options"><label><input type="radio" name="required-profile-goal" value="lose_weight"><span>🔥 Smršati</span></label><label><input type="radio" name="required-profile-goal" value="maintain"><span>⚖️ Održavati težinu</span></label><label><input type="radio" name="required-profile-goal" value="gain_weight"><span>💪 Dobiti na težini</span></label></div><small class="profile-field-error"></small></fieldset></section>
      <section class="profile-wizard-step profile-question-card" data-profile-step="focus"><span class="profile-question-icon">🏋️</span><h4>Na čemu želiš raditi?</h4><p>Ovaj izbor usmjerava prijedloge treninga.</p><fieldset class="profile-wizard-field profile-wizard-choice" data-profile-field="focus"><div class="profile-question-options"><label><input type="radio" name="required-profile-focus" value="strength"><span>🏆 Povećanje snage</span></label><label><input type="radio" name="required-profile-focus" value="muscle_progress"><span>💪 Mišićni napredak</span></label><label><input type="radio" name="required-profile-focus" value="general_fitness"><span>⚡ Opšta kondicija</span></label></div><small class="profile-field-error"></small></fieldset></section>
      <section class="profile-wizard-step profile-question-card" data-profile-step="frequency"><span class="profile-question-icon">📅</span><h4>Koliko puta sedmično želiš trenirati?</h4><p>Možeš promijeniti plan kada ti se raspored promijeni.</p><div class="profile-wizard-field" data-profile-field="frequency"><input id="required-profile-frequency" class="custom-input profile-question-input" type="number" min="1" max="14" inputmode="numeric" placeholder="Broj treninga"><small class="profile-field-error"></small></div></section>
      <section class="profile-wizard-step profile-question-card" data-profile-step="location"><span class="profile-question-icon">📍</span><h4>Gdje treniraš?</h4><p>Predložićemo vježbe prema dostupnoj opremi.</p><fieldset class="profile-wizard-field profile-wizard-choice" data-profile-field="location"><div class="profile-question-options"><label><input type="radio" name="required-profile-location" value="gym"><span>🏋️ Teretana</span></label><label><input type="radio" name="required-profile-location" value="home"><span>🏠 Kod kuće</span></label><label><input type="radio" name="required-profile-location" value="street"><span>🤸 Street workout</span></label><label><input type="radio" name="required-profile-location" value="other"><span>✨ Drugo</span></label></div><small class="profile-field-error"></small></fieldset></section>
      <section class="profile-wizard-step profile-question-card" data-profile-step="experience"><span class="profile-question-icon">🌱</span><h4>Kakvo je tvoje iskustvo?</h4><p>Izaberi odgovor koji ti najviše odgovara.</p><fieldset class="profile-wizard-field profile-wizard-choice" data-profile-field="experience"><div class="profile-question-options"><label><input type="radio" name="required-profile-experience" value="beginner"><span>🌱 Početnik</span></label><label><input type="radio" name="required-profile-experience" value="intermediate"><span>📈 Srednji nivo</span></label><label><input type="radio" name="required-profile-experience" value="advanced"><span>🚀 Napredni nivo</span></label></div><small class="profile-field-error"></small></fieldset></section>
      <section class="profile-wizard-step profile-question-card" data-profile-step="minutes"><span class="profile-question-icon">⏱️</span><h4>Koliko obično traje tvoj trening?</h4><p>Unesi broj minuta između 10 i 300.</p><div class="profile-wizard-field" data-profile-field="minutes"><input id="required-profile-minutes" class="custom-input profile-question-input" type="number" min="10" max="300" step="5" inputmode="numeric" placeholder="Minute"><small class="profile-field-error"></small></div></section>
      <section class="profile-wizard-step profile-question-card" data-profile-step="muscles"><span class="profile-question-icon">🧠</span><h4>Koje mišićne grupe želiš trenirati?</h4><p>Možeš izabrati cijelo tijelo ili više grupa.</p><fieldset class="profile-wizard-field profile-wizard-choice" data-profile-field="muscles"><div class="profile-question-options profile-question-options-compact"><label><input type="checkbox" name="required-profile-muscles" value="full_body"><span>🌐 Cijelo tijelo</span></label><label><input type="checkbox" name="required-profile-muscles" value="chest"><span>🫁 Grudi</span></label><label><input type="checkbox" name="required-profile-muscles" value="back"><span>🔙 Leđa</span></label><label><input type="checkbox" name="required-profile-muscles" value="legs"><span>🦵 Noge</span></label><label><input type="checkbox" name="required-profile-muscles" value="shoulders"><span>🏔️ Ramena</span></label><label><input type="checkbox" name="required-profile-muscles" value="arms"><span>💪 Ruke</span></label><label><input type="checkbox" name="required-profile-muscles" value="glutes"><span>🍑 Gluteus</span></label><label><input type="checkbox" name="required-profile-muscles" value="core"><span>🧱 Stomak</span></label></div><small class="profile-field-error"></small></fieldset></section>
      <section class="profile-wizard-step profile-question-card" data-profile-step="preferred"><span class="profile-question-icon">⭐</span><h4>Koje vježbe voliš raditi?</h4><p>Upiši ih ili označi da nemaš posebnu želju.</p><div class="profile-wizard-field" data-profile-field="preferred"><textarea id="required-profile-preferred-exercises" class="custom-input" rows="3" maxlength="1000" placeholder="npr. čučanj, bench press, zgibovi"></textarea><button class="profile-preference-none" type="button" data-action="set-profile-preference" data-target="required-profile-preferred-exercises" data-value="Nemam posebne vježbe koje želim." data-label="Nemam posebnu želju">＋ Nemam posebnu želju</button><small class="profile-field-error"></small></div></section>
      <section class="profile-wizard-step profile-question-card" data-profile-step="avoided"><span class="profile-question-icon">🚫</span><h4>Koje vježbe želiš izbjeći?</h4><p>Upiši ih ili označi da nemaš ograničenja.</p><div class="profile-wizard-field" data-profile-field="avoided"><textarea id="required-profile-avoided-exercises" class="custom-input" rows="3" maxlength="1000" placeholder="npr. čučanj ili mrtvo dizanje"></textarea><button class="profile-preference-none" type="button" data-action="set-profile-preference" data-target="required-profile-avoided-exercises" data-value="Nemam vježbi koje izbjegavam." data-label="Nemam vježbi koje izbjegavam">＋ Nemam vježbi koje izbjegavam</button><small class="profile-field-error"></small></div></section>
      <section class="profile-wizard-step profile-question-card" data-profile-step="food"><span class="profile-question-icon">🥗</span><h4>Imaš li alergije ili ograničenja hrane?</h4><p>Upiši odgovor ili označi da ih nemaš.</p><div class="profile-wizard-field" data-profile-field="food"><textarea id="required-profile-food-allergies" class="custom-input" rows="3" maxlength="1000" placeholder="npr. kikiriki, laktoza, gluten"></textarea><button class="profile-preference-none" type="button" data-action="set-profile-preference" data-target="required-profile-food-allergies" data-value="Nemam alergije ni ograničenja hrane." data-label="Nemam alergije ni ograničenja hrane">＋ Nemam alergije ni ograničenja hrane</button><small class="profile-field-error"></small></div></section>
      <section class="profile-wizard-step profile-question-card" data-profile-step="review"><span class="profile-question-icon">✅</span><h4>Pregledaj svoje odgovore</h4><p>Možeš se vratiti nazad i promijeniti bilo koji odgovor prije čuvanja.</p><div id="profile-wizard-review" class="profile-wizard-review"></div></section>
      <p id="profile-required-status" class="settings-status" role="status"></p>
      <div class="profile-wizard-actions"><button id="profile-wizard-back" class="btn btn-secondary" data-action="profile-wizard-back" type="button">Nazad</button><button id="profile-wizard-next" class="btn" data-action="profile-wizard-next" type="button">Dalje</button></div>`;
    form.dataset.wizardReady = 'true';
    return;
    form.innerHTML = `
      <div class="profile-wizard-progress" aria-live="polite"><span id="profile-wizard-step-label"></span><div><i id="profile-wizard-progress-fill"></i></div></div>
      <section class="profile-wizard-step" data-profile-step="basics">
        <h4>Osnovni podaci</h4><p>Ovo nam pomaže da ti se GymLeader obraća prirodno.</p>
        <div class="profile-wizard-field" data-profile-field="name"><label class="settings-label" for="required-profile-name">Ime ili nadimak</label><input id="required-profile-name" class="custom-input" type="text" maxlength="100" autocomplete="name" placeholder="Kako da te zovemo?"><small class="profile-field-error"></small></div>
        <fieldset class="profile-wizard-field profile-wizard-choice" data-profile-field="gender"><legend>Kako da ti se obraćamo?</legend><div class="gender-options compact-gender-options"><label><input type="radio" name="required-profile-gender" value="male"><span>Muško</span></label><label><input type="radio" name="required-profile-gender" value="female"><span>Žensko</span></label><label><input type="radio" name="required-profile-gender" value="unspecified"><span>Ne želim odgovoriti</span></label></div><small class="profile-field-error"></small></fieldset>
        <div class="profile-required-two-col"><div class="profile-wizard-field" data-profile-field="age"><label class="settings-label" for="required-profile-age">Godine</label><input id="required-profile-age" class="custom-input" type="number" min="13" max="100" inputmode="numeric" placeholder="npr. 28"><small class="profile-field-error"></small></div><div class="profile-wizard-field" data-profile-field="height"><label class="settings-label" for="required-profile-height">Visina (cm)</label><input id="required-profile-height" class="custom-input" type="number" min="100" max="250" step="0.1" inputmode="decimal" placeholder="npr. 180"><small class="profile-field-error"></small></div></div>
        <div class="profile-wizard-field" data-profile-field="weight"><label class="settings-label" for="required-profile-weight">Trenutna težina (kg)</label><input id="required-profile-weight" class="custom-input" type="number" min="25" max="400" step="0.1" inputmode="decimal" placeholder="npr. 80"><small class="profile-field-error"></small></div>
      </section>
      <section class="profile-wizard-step" data-profile-step="training">
        <h4>Cilj i način treniranja</h4><p>Izaberi ono što ti trenutno najviše odgovara. Sve možeš promijeniti kasnije.</p>
        <div class="profile-wizard-field" data-profile-field="goal"><label class="settings-label" for="required-profile-goal">Cilj tjelesne težine</label><select id="required-profile-goal" class="custom-input"><option value="">Izaberi cilj</option><option value="lose_weight">Mršanje</option><option value="maintain">Održavanje težine</option><option value="gain_weight">Povećanje težine</option></select><small class="profile-field-error"></small></div>
        <div class="profile-wizard-field" data-profile-field="focus"><label class="settings-label" for="required-profile-focus">Fokus treninga</label><select id="required-profile-focus" class="custom-input"><option value="">Izaberi fokus</option><option value="strength">Povećanje snage</option><option value="muscle_progress">Mišićni napredak</option><option value="general_fitness">Opšta kondicija</option></select><small class="profile-field-error"></small></div>
        <div class="profile-wizard-field" data-profile-field="frequency"><label class="settings-label" for="required-profile-frequency">Koliko puta želiš trenirati sedmično?</label><input id="required-profile-frequency" class="custom-input" type="number" min="1" max="14" inputmode="numeric" placeholder="npr. 3"><small class="profile-field-error"></small></div>
        <fieldset class="profile-wizard-field profile-wizard-choice" data-profile-field="location"><legend>Gdje treniraš?</legend><div class="gender-options compact-gender-options"><label><input type="radio" name="required-profile-location" value="gym"><span>Teretana</span></label><label><input type="radio" name="required-profile-location" value="home"><span>Kuća</span></label><label><input type="radio" name="required-profile-location" value="street"><span>Street workout</span></label><label><input type="radio" name="required-profile-location" value="other"><span>Drugo</span></label></div><small class="profile-field-error"></small></fieldset>
        <div class="profile-wizard-field" data-profile-field="experience"><label class="settings-label" for="required-profile-experience">Koliko dugo treniraš?</label><select id="required-profile-experience" class="custom-input"><option value="">Izaberi iskustvo</option><option value="beginner">Početnik — tek počinjem ili treniram kratko</option><option value="intermediate">Srednji nivo — treniram redovno</option><option value="advanced">Napredni nivo — treniram godinama</option></select><small class="profile-field-error"></small></div>
        <div class="profile-wizard-field" data-profile-field="minutes"><label class="settings-label" for="required-profile-minutes">Koliko minuta obično treniraš?</label><input id="required-profile-minutes" class="custom-input" type="number" min="10" max="300" step="5" inputmode="numeric" placeholder="npr. 60"><small class="profile-field-error"></small></div>
        <fieldset class="profile-wizard-field profile-wizard-choice" data-profile-field="muscles"><legend>Koje mišićne grupe želiš trenirati?</legend><p class="profile-choice-hint">Izaberi cijelo tijelo ili označi pojedinačne grupe.</p><div class="muscle-full-body"><label><input type="checkbox" name="required-profile-muscles" value="full_body"><span><strong>Cijelo tijelo</strong><small>Odaberi sve mišićne grupe</small></span><i aria-hidden="true">✓</i></label></div><div class="muscle-choice-grid"><label><input type="checkbox" name="required-profile-muscles" value="chest"><span>Grudi</span></label><label><input type="checkbox" name="required-profile-muscles" value="back"><span>Leđa</span></label><label><input type="checkbox" name="required-profile-muscles" value="legs"><span>Noge</span></label><label><input type="checkbox" name="required-profile-muscles" value="shoulders"><span>Ramena</span></label><label><input type="checkbox" name="required-profile-muscles" value="arms"><span>Ruke</span></label><label><input type="checkbox" name="required-profile-muscles" value="glutes"><span>Gluteus</span></label><label><input type="checkbox" name="required-profile-muscles" value="core"><span>Stomak</span></label></div><small class="profile-field-error"></small></fieldset>
      </section>
      <section class="profile-wizard-step" data-profile-step="preferences">
        <h4>Preferencije za buduće prijedloge</h4><p>Odgovori na svako polje ili izaberi „Nemam“. Kasnije će ovo pomoći treningu i ishrani.</p>
        <div class="profile-wizard-field" data-profile-field="preferred"><label class="settings-label" for="required-profile-preferred-exercises">Vježbe koje preferiraš</label><textarea id="required-profile-preferred-exercises" class="custom-input" rows="2" maxlength="1000" placeholder="npr. čučanj, bench press, zgibovi"></textarea><button class="profile-preference-none" type="button" data-action="set-profile-preference" data-target="required-profile-preferred-exercises" data-value="Nemam posebne vježbe koje želim." data-label="Nemam posebnu želju">＋ Nemam posebnu želju</button><small class="profile-field-error"></small></div>
        <div class="profile-wizard-field" data-profile-field="avoided"><label class="settings-label" for="required-profile-avoided-exercises">Vježbe koje želiš izbjeći</label><textarea id="required-profile-avoided-exercises" class="custom-input" rows="2" maxlength="1000" placeholder="npr. čučanj ili mrtvo dizanje"></textarea><button class="profile-preference-none" type="button" data-action="set-profile-preference" data-target="required-profile-avoided-exercises" data-value="Nemam vježbi koje izbjegavam." data-label="Nemam vježbi koje izbjegavam">＋ Nemam vježbi koje izbjegavam</button><small class="profile-field-error"></small></div>
        <div class="profile-wizard-field" data-profile-field="food"><label class="settings-label" for="required-profile-food-allergies">Alergije i hrana koju izbjegavaš</label><textarea id="required-profile-food-allergies" class="custom-input" rows="2" maxlength="1000" placeholder="npr. kikiriki, laktoza, gluten"></textarea><button class="profile-preference-none" type="button" data-action="set-profile-preference" data-target="required-profile-food-allergies" data-value="Nemam alergije ni ograničenja hrane." data-label="Nemam alergije ni ograničenja hrane">＋ Nemam alergije ni ograničenja hrane</button><small class="profile-field-error"></small></div>
        <p class="profile-modal-help">Ovo nije medicinska zaštita. Prije jela uvijek provjeri sastojke i savjet stručnjaka ako imaš alergiju.</p>
      </section>
      <div class="profile-wizard-actions"><button id="profile-wizard-back" class="secondary-btn" data-action="profile-wizard-back" type="button">Nazad</button><button id="profile-wizard-next" class="btn" data-action="profile-wizard-next" type="button">Nastavi</button></div>`;
    form.dataset.wizardReady = 'true';
  }

  function setRequiredProfileGroupVisible(selector, visible) {
    const selected = document.querySelector(selector);
    const group = selected?.matches('input') ? selected.closest('.gender-options') : selected;
    if (!group) return;
    group.hidden = !visible;
    const label = group.previousElementSibling;
    if (label?.classList.contains('settings-label')) label.hidden = !visible;
  }

  function updateRequiredProfileFieldVisibility(onlyMissing) {
    const modal = document.getElementById('profile-required-modal');
    if (!modal) return;
    const profile = currentProfileData || {};
    const goalNote = modal.querySelector('.profile-goal-note');
    if (!onlyMissing) {
      ['required-profile-name', 'required-profile-age', 'required-profile-height', 'required-profile-weight', 'required-profile-goal', 'required-profile-focus', 'required-profile-frequency', 'required-profile-experience', 'required-profile-minutes', 'required-profile-preferred-exercises', 'required-profile-avoided-exercises', 'required-profile-food-allergies'].forEach((id) => setRequiredProfileFieldVisible(id, true));
      setRequiredProfileGroupVisible('input[name="required-profile-gender"]', true);
      setRequiredProfileGroupVisible('input[name="required-profile-location"]', true);
      setRequiredProfileGroupVisible('.muscle-choice-grid', true);
      const preferenceSection = modal.querySelector('.profile-preferences-section');
      if (preferenceSection) preferenceSection.hidden = false;
      if (goalNote) goalNote.hidden = false;
      return;
    }
    const present = (value) => value !== undefined && value !== null && String(value).trim() !== '';
    const inRange = (value, min, max) => Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max;
    const checks = {
      'required-profile-name': present(profile.fullName),
      'required-profile-age': inRange(profile.age, 13, 100),
      'required-profile-height': inRange(profile.heightCm, 100, 250),
      'required-profile-weight': inRange(profile.weightKg, 25, 400),
      'required-profile-goal': present(profile.goal),
      'required-profile-focus': present(profile.trainingFocus),
      'required-profile-frequency': inRange(profile.trainingFrequency, 1, 14),
      'required-profile-experience': present(profile.experienceLevel),
      'required-profile-minutes': inRange(profile.sessionMinutes, 10, 300),
      'required-profile-preferred-exercises': present(profile.preferredExercises),
      'required-profile-avoided-exercises': present(profile.avoidedExercises),
      'required-profile-food-allergies': present(profile.foodAllergies)
    };
    Object.entries(checks).forEach(([id, isPresent]) => setRequiredProfileFieldVisible(id, !isPresent));
    setRequiredProfileGroupVisible('input[name="required-profile-gender"]', !VALID_GENDER_VALUES.has(profile.gender));
    setRequiredProfileGroupVisible('input[name="required-profile-location"]', !present(profile.trainingLocation));
    setRequiredProfileGroupVisible('.muscle-choice-grid', !Array.isArray(profile.targetMuscleGroups) || profile.targetMuscleGroups.length === 0);
    const preferenceSection = modal.querySelector('.profile-preferences-section');
    if (preferenceSection) preferenceSection.hidden = checks['required-profile-preferred-exercises'] && checks['required-profile-avoided-exercises'] && checks['required-profile-food-allergies'];
    const trainingHeading = modal.querySelector('.profile-preference-training-heading');
    const foodHeading = modal.querySelector('.profile-preference-food-heading');
    if (trainingHeading) trainingHeading.hidden = checks['required-profile-preferred-exercises'] && checks['required-profile-avoided-exercises'];
    if (foodHeading) foodHeading.hidden = checks['required-profile-food-allergies'];
    if (goalNote) goalNote.hidden = checks['required-profile-goal'];
  }

  function getProfileWizardMissingFields(profile) {
    const present = (value) => value !== undefined && value !== null && String(value).trim() !== '';
    const inRange = (value, min, max) => Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max;
    return {
      name: !present(profile.fullName),
      gender: !VALID_GENDER_VALUES.has(profile.gender),
      age: !inRange(profile.age, 13, 100), height: !inRange(profile.heightCm, 100, 250), weight: !inRange(profile.weightKg, 25, 400),
      goal: !present(profile.goal), focus: !present(profile.trainingFocus), frequency: !inRange(profile.trainingFrequency, 1, 14),
      location: !present(profile.trainingLocation), experience: !present(profile.experienceLevel), minutes: !inRange(profile.sessionMinutes, 10, 300),
      muscles: !Array.isArray(profile.targetMuscleGroups) || profile.targetMuscleGroups.length === 0,
      preferred: !present(profile.preferredExercises), avoided: !present(profile.avoidedExercises), food: !present(profile.foodAllergies)
    };
  }

  function configureProfileWizard(profile, onlyMissing) {
    const modal = document.getElementById('profile-required-modal');
    if (!modal) return;
    const missing = getProfileWizardMissingFields(profile);
    const scope = profileWizardState.scope || 'onboarding';
    const scopeFields = scope === 'basics'
      ? new Set(['name', 'gender', 'age', 'body'])
      : scope === 'training'
        ? new Set(['goal', 'focus', 'frequency', 'location', 'experience', 'minutes', 'muscles', 'preferred', 'avoided', 'food'])
        : null;
    const steps = PROFILE_WIZARD_STEPS
      .filter((step) => !scopeFields || scopeFields.has(step.id))
      .filter((step) => !onlyMissing || step.fields.some((field) => missing[field]))
      .map((step) => step.id);
    if (steps.length) steps.push('review');
    profileWizardState = { steps, current: Math.min(profileWizardState.current || 0, Math.max(0, steps.length - 1)), onlyMissing, scope };
    modal.querySelectorAll('.profile-wizard-field').forEach((field) => {
      const fieldName = field.dataset.profileField;
      field.hidden = onlyMissing && !missing[fieldName];
      field.classList.remove('has-error');
      const error = field.querySelector('.profile-field-error');
      if (error) error.textContent = '';
    });
    modal.querySelectorAll('.profile-wizard-step').forEach((step) => {
      step.hidden = !steps.includes(step.dataset.profileStep) || step.dataset.profileStep !== steps[profileWizardState.current];
    });
    renderProfileWizardControls();
  }

  function renderProfileWizardControls() {
    const modal = document.getElementById('profile-required-modal');
    if (!modal) return;
    const { steps, current } = profileWizardState;
    const label = modal.querySelector('#profile-wizard-step-label');
    const fill = modal.querySelector('#profile-wizard-progress-fill');
    const progress = modal.querySelector('.profile-wizard-progress');
    const back = modal.querySelector('#profile-wizard-back');
    const next = modal.querySelector('#profile-wizard-next');
    const hideSingleSettingsStep = profileRequiredEditMode && steps.length === 1;
    if (progress) progress.hidden = hideSingleSettingsStep;
    const isReview = steps[current] === 'review';
    const questionCount = Math.max(0, steps.length - 1);
    if (label) label.textContent = isReview ? 'Pregled odgovora' : `Pitanje ${current + 1} od ${questionCount}`;
    if (fill) fill.style.width = `${questionCount ? (isReview ? 100 : ((current + 1) / questionCount) * 100) : 100}%`;
    if (back) back.hidden = current === 0;
    if (next) next.textContent = current === steps.length - 1
      ? (profileRequiredEditMode ? 'Sačuvaj promjene' : 'Sačuvaj profil i nastavi')
      : 'Nastavi';
  }

  function profileFieldError(field, message) {
    const modal = document.getElementById('profile-required-modal');
    const wrapper = modal?.querySelector(`.profile-wizard-field[data-profile-field="${field}"]`);
    if (!wrapper || wrapper.hidden) return false;
    wrapper.classList.add('has-error');
    const error = wrapper.querySelector('.profile-field-error');
    if (error) error.textContent = message;
    return true;
  }

  function validateProfileWizardStep() {
    const step = profileWizardState.steps[profileWizardState.current];
    const values = readRequiredProfileForm();
    const checks = {
      name: [['name', values.fullName && values.fullName.length <= 100, 'Unesi ime ili nadimak.']],
      gender: [['gender', VALID_GENDER_VALUES.has(values.gender), 'Izaberi jednu opciju.']],
      age: [['age', Number.isInteger(values.age) && values.age >= 13 && values.age <= 100, 'Unesi godine od 13 do 100.']],
      body: [['height', Number.isFinite(values.heightCm) && values.heightCm >= 100 && values.heightCm <= 250, 'Unesi visinu od 100 do 250 cm.'], ['weight', Number.isFinite(values.weightKg) && values.weightKg >= 25 && values.weightKg <= 400, 'Unesi težinu od 25 do 400 kg.']],
      goal: [['goal', ['lose_weight', 'maintain', 'gain_weight'].includes(values.goal), 'Izaberi cilj.']],
      focus: [['focus', ['strength', 'muscle_progress', 'general_fitness'].includes(values.trainingFocus), 'Izaberi fokus.']],
      frequency: [['frequency', Number.isInteger(values.trainingFrequency) && values.trainingFrequency >= 1 && values.trainingFrequency <= 14, 'Unesi broj od 1 do 14.']],
      location: [['location', ['gym', 'home', 'street', 'other'].includes(values.trainingLocation), 'Izaberi mjesto treninga.']],
      experience: [['experience', ['beginner', 'intermediate', 'advanced'].includes(values.experienceLevel), 'Izaberi iskustvo u treniranju.']],
      minutes: [['minutes', Number.isInteger(values.sessionMinutes) && values.sessionMinutes >= 10 && values.sessionMinutes <= 300, 'Unesi trajanje od 10 do 300 minuta.']],
      muscles: [['muscles', values.targetMuscleGroups.length > 0, 'Izaberi cijelo tijelo ili barem jednu grupu.']],
      preferred: [['preferred', values.preferredExercises && values.preferredExercises.length <= 1000, 'Upiši odgovor ili izaberi „Nemam“.']],
      avoided: [['avoided', values.avoidedExercises && values.avoidedExercises.length <= 1000, 'Upiši odgovor ili izaberi „Nemam“.']],
      food: [['food', values.foodAllergies && values.foodAllergies.length <= 1000, 'Upiši odgovor ili izaberi „Nemam“.']]
    };
    const invalid = (checks[step] || []).filter(([field, valid, message]) => !valid && profileFieldError(field, message));
    if (invalid.length) {
      const first = document.querySelector('.profile-wizard-field.has-error');
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  }

  window.nextProfileWizardStep = async function() {
    if (!validateProfileWizardStep()) return;
    saveProfileWizardDraft();
    if (profileWizardState.current < profileWizardState.steps.length - 1) {
      profileWizardState.current += 1;
      const modal = document.getElementById('profile-required-modal');
      modal?.querySelectorAll('.profile-wizard-step').forEach((step) => { step.hidden = step.dataset.profileStep !== profileWizardState.steps[profileWizardState.current]; });
      renderProfileWizardReview();
      renderProfileWizardControls();
      modal?.querySelector('.profile-wizard-step:not([hidden])')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    await window.saveRequiredProfile();
    renderProfileWizardControls();
  };

  window.previousProfileWizardStep = function() {
    if (profileWizardState.current === 0) return;
    saveProfileWizardDraft();
    profileWizardState.current -= 1;
    const modal = document.getElementById('profile-required-modal');
    modal?.querySelectorAll('.profile-wizard-step').forEach((step) => { step.hidden = step.dataset.profileStep !== profileWizardState.steps[profileWizardState.current]; });
    renderProfileWizardReview();
    renderProfileWizardControls();
  };

  function renderProfileWizardReview() {
    const container = document.getElementById('profile-wizard-review');
    if (!container || profileWizardState.steps[profileWizardState.current] !== 'review') return;
    const values = readRequiredProfileForm();
    const rows = [['Ime', values.fullName], ['Godine', values.age], ['Visina', values.heightCm ? `${values.heightCm} cm` : ''], ['Težina', values.weightKg ? `${values.weightKg} kg` : ''], ['Cilj', getProfileValueLabel(values.goal)], ['Fokus', getProfileValueLabel(values.trainingFocus)], ['Treninga sedmično', values.trainingFrequency], ['Mjesto', getProfileValueLabel(values.trainingLocation)], ['Iskustvo', getProfileValueLabel(values.experienceLevel)], ['Trajanje', values.sessionMinutes ? `${values.sessionMinutes} min` : ''], ['Mišići', values.targetMuscleGroups.map(getProfileValueLabel).join(', ')]].filter(([, value]) => String(value || '').trim());
    container.innerHTML = rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
  }

  function populateRequiredProfileForm() {
    const modal = document.getElementById('profile-required-modal');
    ensureProfileWizardMarkup(modal);
    const profile = { ...(currentProfileData || {}), ...readProfileWizardDraft() };
    const values = {
      'required-profile-name': profile.fullName || currentUser?.displayName || '',
      'required-profile-age': profile.age ?? '',
      'required-profile-height': profile.heightCm ?? '',
      'required-profile-weight': profile.weightKg ?? '',
      'required-profile-frequency': profile.trainingFrequency ?? '',
      'required-profile-minutes': profile.sessionMinutes ?? '',
      'required-profile-preferred-exercises': profile.preferredExercises ?? '',
      'required-profile-avoided-exercises': profile.avoidedExercises ?? '',
      'required-profile-food-allergies': profile.foodAllergies ?? ''
    };
    Object.entries(values).forEach(([id, value]) => {
      const input = document.getElementById(id);
      if (input && document.activeElement !== input) input.value = value;
    });
    updateProfilePreferenceButtons();
    document.querySelectorAll('input[name="required-profile-gender"]').forEach((input) => { input.checked = input.value === profile.gender; });
    document.querySelectorAll('input[name="required-profile-location"]').forEach((input) => { input.checked = input.value === profile.trainingLocation; });
    const legacyGoal = profile.goal === 'gain_muscle' || profile.goal === 'increase_strength' || profile.goal === 'general_fitness' ? 'maintain' : (profile.goal || '');
    const focusValue = profile.trainingFocus || (profile.goal === 'increase_strength' ? 'strength' : profile.goal === 'general_fitness' ? 'general_fitness' : profile.goal === 'gain_muscle' ? 'muscle_progress' : '');
    document.querySelectorAll('input[name="required-profile-goal"]').forEach((input) => { input.checked = input.value === legacyGoal; });
    document.querySelectorAll('input[name="required-profile-focus"]').forEach((input) => { input.checked = input.value === focusValue; });
    document.querySelectorAll('input[name="required-profile-experience"]').forEach((input) => { input.checked = input.value === (profile.experienceLevel || ''); });
    const muscleGroups = new Set(Array.isArray(profile.targetMuscleGroups) ? profile.targetMuscleGroups : []);
    document.querySelectorAll('input[name="required-profile-muscles"]').forEach((input) => { input.checked = muscleGroups.has(input.value); });
    configureProfileWizard(currentProfileData || {}, !profileRequiredEditMode);
    const title = document.getElementById('profile-required-title');
    const intro = title?.nextElementSibling;
    const preferenceIntro = modal.querySelector('.profile-preferences-section .profile-modal-help');
    if (preferenceIntro) preferenceIntro.textContent = 'Odgovori na svako polje ili izaberi opciju „Nemam“. Ovo će kasnije pomoći prijedlozima treninga i ishrane.';
    if (title) title.textContent = profileRequiredEditMode ? 'Pripremimo GymLeader za tebe' : 'Dovrši samo nove podatke';
    if (intro) intro.textContent = profileRequiredEditMode
      ? 'Ovi podaci pomažu da kasnije dobiješ smislen pregled napretka. Možeš ih promijeniti kada želiš.'
      : 'Popuni samo nova polja koja još nemamo. Ostali podaci su već sačuvani.';
    if (title) title.textContent = profileRequiredEditMode ? 'Uredi svoj profil' : 'Dovrši profil';
    if (intro) intro.textContent = profileRequiredEditMode
      ? 'Pregledaj podatke po kratkim koracima. Možeš ih promijeniti kada želiš.'
      : 'Prikazujemo samo podatke koji još nedostaju.';
    if (profileRequiredEditMode && profileWizardState.scope === 'basics') {
      if (title) title.textContent = 'Lični podaci';
      if (intro) intro.textContent = 'Uredi ime, pol i osnovne podatke o sebi.';
    }
    if (profileRequiredEditMode && profileWizardState.scope === 'training') {
      if (title) title.textContent = 'Ciljevi i treniranje';
      if (intro) intro.textContent = 'Uredi cilj, način treniranja i prijedloge koje želiš dobiti.';
    }
  }

  window.openProfileDetailsEditor = function(scope = 'basics') {
    if (!currentUser) return;
    const modal = document.getElementById('profile-required-modal');
    profileRequiredEditMode = true;
    profileWizardState.current = 0;
    profileWizardState.scope = scope;
    populateRequiredProfileForm();
    const close = document.getElementById('profile-required-close');
    const button = document.getElementById('profile-wizard-next');
    if (close) close.style.display = 'block';
    if (button) { button.dataset.action = 'profile-wizard-next'; renderProfileWizardControls(); }
    if (button) { button.dataset.action = 'save-profile-details'; button.textContent = 'Sačuvaj promjene'; }
    if (button) { button.dataset.action = 'profile-wizard-next'; renderProfileWizardControls(); }
    const status = document.getElementById('profile-required-status');
    if (status) { status.textContent = ''; status.style.color = ''; }
    if (modal) modal.style.display = 'flex';
  };

  window.openTrainingGoalsEditor = function() {
    window.openProfileDetailsEditor('training');
  };

  function updateProfilePreferenceButtons() {
    document.querySelectorAll('.profile-preference-none').forEach((button) => {
      const input = document.getElementById(button.dataset.target || '');
      const selected = Boolean(input && input.value.trim() === button.dataset.value);
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.textContent = selected ? '✓ Odabrano — klikni za uklanjanje' : `＋ ${button.dataset.label || 'Nemam'}`;
    });
  }

  window.setProfilePreference = function(targetId, value) {
    const input = document.getElementById(targetId);
    if (!input) return;
    const selected = input.value.trim() === value;
    input.value = selected ? '' : value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    updateProfilePreferenceButtons();
    if (!selected) input.focus();
  };

  function readRequiredProfileForm() {
    const selectedMuscles = [...document.querySelectorAll('input[name="required-profile-muscles"]:checked')].map((input) => input.value);
    const normalizedMuscles = selectedMuscles.includes('full_body') ? ['full_body'] : selectedMuscles;
    return {
      fullName: document.getElementById('required-profile-name')?.value.trim() || '',
      gender: document.querySelector('input[name="required-profile-gender"]:checked')?.value || '',
      age: Number(document.getElementById('required-profile-age')?.value),
      heightCm: Number(document.getElementById('required-profile-height')?.value),
      weightKg: Number(document.getElementById('required-profile-weight')?.value),
      goal: document.querySelector('input[name="required-profile-goal"]:checked')?.value || '',
      trainingFocus: document.querySelector('input[name="required-profile-focus"]:checked')?.value || '',
      trainingFrequency: Number(document.getElementById('required-profile-frequency')?.value),
      trainingLocation: document.querySelector('input[name="required-profile-location"]:checked')?.value || '',
      experienceLevel: document.querySelector('input[name="required-profile-experience"]:checked')?.value || '',
      sessionMinutes: Number(document.getElementById('required-profile-minutes')?.value),
      targetMuscleGroups: normalizedMuscles,
      preferredExercises: document.getElementById('required-profile-preferred-exercises')?.value.trim() || '',
      avoidedExercises: document.getElementById('required-profile-avoided-exercises')?.value.trim() || '',
      foodAllergies: document.getElementById('required-profile-food-allergies')?.value.trim() || ''
    };
  }

  window.saveRequiredProfile = async function() {
    if (!currentUser) return;
    const status = document.getElementById('profile-required-status');
    const button = document.getElementById('profile-wizard-next');
    const profileValues = readRequiredProfileForm();
    const errors = [];
    if (!Number.isInteger(profileValues.trainingFrequency) || profileValues.trainingFrequency < 1) errors.push('izaberi najmanje 1 trening sedmično');
    if (!profileValues.fullName || profileValues.fullName.length > 100) errors.push('ime ili nadimak');
    if (!VALID_GENDER_VALUES.has(profileValues.gender)) errors.push('pol');
    if (!Number.isInteger(profileValues.age) || profileValues.age < 13 || profileValues.age > 100) errors.push('godine (13–100)');
    if (!Number.isFinite(profileValues.heightCm) || profileValues.heightCm < 100 || profileValues.heightCm > 250) errors.push('visinu (100–250 cm)');
    if (!Number.isFinite(profileValues.weightKg) || profileValues.weightKg < 25 || profileValues.weightKg > 400) errors.push('težinu (25–400 kg)');
    if (!['lose_weight', 'maintain', 'gain_weight'].includes(profileValues.goal)) errors.push('cilj tjelesne težine');
    if (!['strength', 'muscle_progress', 'general_fitness'].includes(profileValues.trainingFocus)) errors.push('fokus treninga');
    if (!Number.isInteger(profileValues.trainingFrequency) || profileValues.trainingFrequency < 0 || profileValues.trainingFrequency > 14) errors.push('broj treninga sedmično');
    if (!['gym', 'home', 'street', 'other'].includes(profileValues.trainingLocation)) errors.push('mjesto treninga');
    if (!['beginner', 'intermediate', 'advanced'].includes(profileValues.experienceLevel)) errors.push('iskustvo');
    if (!Number.isInteger(profileValues.sessionMinutes) || profileValues.sessionMinutes < 10 || profileValues.sessionMinutes > 300) errors.push('trajanje treninga');
    if (!profileValues.targetMuscleGroups.length) errors.push('barem jednu mišićnu grupu');
    if (!profileValues.preferredExercises) errors.push('vježbe koje želiš raditi');
    if (!profileValues.avoidedExercises) errors.push('vježbe koje želiš izbjegavati');
    if (!profileValues.foodAllergies) errors.push('alergije ili ograničenja hrane');
    if (profileValues.preferredExercises.length > 1000 || profileValues.avoidedExercises.length > 1000 || profileValues.foodAllergies.length > 1000) errors.push('predugačke preferencije');
    if (errors.length) {
      if (status) { status.textContent = `Nedostaje: ${errors.join(', ')}.`; status.style.color = 'var(--danger)'; }
      return;
    }
    if (button) { button.disabled = true; button.textContent = 'Čuvam profil…'; }
    if (status) { status.textContent = ''; status.style.color = ''; }
    try {
      const profile = {
        ...profileValues,
        email: currentUser.email || currentProfileData?.email || '',
        createdAt: currentProfileData?.createdAt || new Date().toISOString()
      };
      await setDoc(doc(db, 'users', currentUser.uid), profile, { merge: true });
      currentProfileData = { ...(currentProfileData || {}), ...profile };
      clearProfileWizardDraft();
      document.getElementById('profile-required-modal').style.display = 'none';
      profileRequiredEditMode = false;
      renderProfileSettings();
      renderDashboard();
      ShowToast('Profil je sačuvan. GymLeader je spreman.');
      if (hasPendingNewUserOnboarding()) {
        clearPendingNewUserOnboarding();
        window.openOnboardingModal();
      }
    } catch (error) {
      console.error('Required profile save diagnostic:', error);
      if (status) { status.textContent = 'Profil trenutno nije moguće sačuvati. Provjeri internet i pokušaj ponovo.'; status.style.color = 'var(--danger)'; }
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Sačuvaj profil i nastavi'; }
    }
  };

  window.saveProfileDetails = async function() {
    await window.saveRequiredProfile();
  };

  async function persistGender(gender, statusElementId = '', button = null) {
    if (!currentUser || !VALID_GENDER_VALUES.has(gender)) return false;
    const status = statusElementId ? document.getElementById(statusElementId) : null;
    if (button) { button.disabled = true; button.textContent = 'Čuvam…'; }
    if (status) { status.textContent = ''; status.style.color = ''; }
    try {
      const profile = {
        fullName: currentProfileData?.fullName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Korisnik',
        email: currentUser.email || currentProfileData?.email || '',
        createdAt: currentProfileData?.createdAt || new Date().toISOString(),
        gender
      };
      await setDoc(doc(db, 'users', currentUser.uid), profile, { merge: true });
      currentProfileData = { ...(currentProfileData || {}), ...profile };
      if (status) status.textContent = 'Podatak je sačuvan.';
      renderProfileSettings();
      renderDashboard();
      showGenderProfileGateIfRequired();
      if (statusElementId === 'gender-required-status') ShowToast('Profil je spreman.');
      return true;
    } catch (error) {
      console.error('Gender save diagnostic:', error);
      if (status) {
        status.textContent = 'Pol trenutno nije moguće sačuvati. Provjeri internet i pokušaj ponovo.';
        status.style.color = 'var(--danger)';
      }
      return false;
    } finally {
      if (button) { button.disabled = false; button.textContent = statusElementId === 'gender-required-status' ? 'Sačuvaj i nastavi' : 'Sačuvaj pol'; }
    }
  }

  window.saveRequiredGender = async function() {
    const selected = document.querySelector('input[name="required-gender-option"]:checked')?.value;
    if (selected) await persistGender(selected, 'gender-required-status', document.querySelector('[data-action="save-required-gender"]'));
  };

  window.saveProfileGender = async function() {
    const selected = document.querySelector('input[name="profile-gender-option"]:checked');
    if (!selected) return;
    const saved = await persistGender(selected.value, 'profile-gender-status', document.querySelector('[data-action="save-profile-gender"]'));
    if (saved) document.getElementById('settings-gender-modal')?.style.setProperty('display', 'none');
  };

  function renderProfileSettings() {
    if (!currentUser) return;
    const nameInput = document.getElementById('profile-name-input');
    const emailInput = document.getElementById('profile-email-input');
    const currentEmailInput = document.getElementById('profile-email-current');
    const name = currentProfileData?.fullName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Korisnik';
    const email = currentUser.email || '';
    if (nameInput) nameInput.value = name;
    if (emailInput) emailInput.value = currentUser.email || '';
    if (currentEmailInput) currentEmailInput.value = currentUser.email || '';
    const nameSummary = document.getElementById('settings-name-summary');
    const emailSummary = document.getElementById('settings-email-summary');
    const languageSummary = document.getElementById('settings-language-summary');
    const themeSummary = document.getElementById('settings-theme-summary');
    const themeIcon = document.getElementById('settings-theme-icon');
    const nameInitial = document.getElementById('settings-name-initial');
    const photoSummary = document.getElementById('settings-photo-summary');
    const genderSummary = document.getElementById('settings-gender-summary');
    const foodGoalsSummary = document.getElementById('settings-food-goals-summary');
    const selectedLanguage = getCurrentLanguage();
    const languageNames = { sr: 'Srpski', en: 'English', de: 'Deutsch' };
    const themeNames = {
      sr: isLight => isLight ? 'Svijetli prikaz' : 'Tamni prikaz',
      en: isLight => isLight ? 'Light mode' : 'Dark mode',
      de: isLight => isLight ? 'Heller Modus' : 'Dunkler Modus'
    };
    const isLight = document.documentElement.dataset.theme === 'light';
    if (nameSummary) nameSummary.textContent = name;
    if (emailSummary) emailSummary.textContent = email || '—';
    if (languageSummary) languageSummary.textContent = languageNames[selectedLanguage] || languageNames.sr;
    if (themeSummary) themeSummary.textContent = (themeNames[selectedLanguage] || themeNames.sr)(isLight);
    if (genderSummary) genderSummary.textContent = getGenderLabel();
    if (foodGoalsSummary) {
      const goals = getNutritionGoals();
      const configured = [
        goals.calories ? `${formatFoodNumber(goals.calories)} kcal` : '',
        goals.protein ? `P ${formatFoodNumber(goals.protein)} g` : '',
        goals.carbs ? `UH ${formatFoodNumber(goals.carbs)} g` : '',
        goals.fat ? `M ${formatFoodNumber(goals.fat)} g` : ''
      ].filter(Boolean);
      foodGoalsSummary.textContent = configured.length ? configured.join(' · ') : 'Nisu postavljeni';
    }
    renderWeeklyGoalSettingsSummary();
    document.querySelectorAll('input[name="profile-gender-option"]').forEach((input) => {
      input.checked = input.value === getProfileGender();
    });
    if (themeIcon) themeIcon.textContent = isLight ? '☀' : '☾';
    const photo = localStorage.getItem(getProfilePhotoKey(currentUser.uid)) || '';
    const initial = name.trim().charAt(0).toUpperCase() || 'K';
    if (nameInitial) nameInitial.textContent = initial;
    if (photoSummary) photoSummary.textContent = photo
      ? ({ sr: 'Dodana', en: 'Added', de: 'Hinzugefügt' }[selectedLanguage] || 'Dodana')
      : ({ sr: 'Nije dodata', en: 'Not added', de: 'Nicht hinzugefügt' }[selectedLanguage] || 'Nije dodata');
    ['profile-avatar', 'settings-photo-avatar'].forEach((id) => {
      const avatar = document.getElementById(id);
      if (!avatar) return;
      avatar.textContent = initial;
      avatar.style.backgroundImage = photo ? `url("${photo}")` : '';
      avatar.classList.toggle('has-photo', Boolean(photo));
    });
  }

  window.openSettingsEditor = function(editor) {
    if (!currentUser) return;
    const modalIds = {
      name: 'settings-name-modal',
      email: 'profile-email-modal',
      security: 'settings-security-modal',
      language: 'settings-language-modal',
      appearance: 'settings-appearance-modal',
      photo: 'settings-photo-modal',
      gender: 'settings-gender-modal'
    };
    const modal = document.getElementById(modalIds[editor]);
    if (!modal) return;
    if (editor === 'name') {
      const input = document.getElementById('profile-name-input');
      if (input) input.value = currentProfileData?.fullName || currentUser.displayName || '';
    }
    if (editor === 'gender') {
      document.querySelectorAll('input[name="profile-gender-option"]').forEach((input) => {
        input.checked = input.value === getProfileGender();
      });
      const status = document.getElementById('profile-gender-status');
      if (status) { status.textContent = ''; status.style.color = ''; }
      updateGenderSaveButton('profile-gender-option', 'save-profile-gender');
    }
    if (editor === 'email') window.openProfileEmailModal();
    else if (editor === 'security') window.openSecurityPasswordEditor();
    else modal.style.display = 'flex';
  };

  window.toggleSettingsPassword = function(button) {
    const targetId = button?.dataset?.passwordTarget;
    const input = targetId ? document.getElementById(targetId) : null;
    if (!input || !button) return;
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    button.textContent = visible ? 'Sakrij' : 'Prikaži';
  };

  window.openSecurityPasswordEditor = function() {
    const modal = document.getElementById('settings-security-modal');
    const form = document.getElementById('security-password-form');
    const googleNote = document.getElementById('security-google-note');
    const status = document.getElementById('security-password-status');
    if (!modal || !currentUser) return;
    const providers = currentUser.providerData || [];
    const isGoogleOnly = providers.some(({ providerId }) => providerId === 'google.com')
      && !providers.some(({ providerId }) => providerId === 'password');
    // Custom-token email accounts may expose a generic provider id, so treat
    // every non-Google-only account as an email/password account.
    const hasPasswordProvider = !isGoogleOnly;
    if (form) form.style.display = hasPasswordProvider ? 'block' : 'none';
    if (googleNote) googleNote.style.display = hasPasswordProvider ? 'none' : 'block';
    if (googleNote && !hasPasswordProvider) {
      const googleHelp = googleNote.querySelector('p');
      if (googleHelp) googleHelp.textContent = 'Ovaj nalog nema GymLeader lozinku. Možeš je sada postaviti ispod, bez mijenjanja Gmail lozinke.';
    }
    if (googleNote && !googleNote.querySelector('[data-action="set-google-password"]')) {
      const googlePasswordForm = document.createElement('div');
      googlePasswordForm.className = 'google-password-form';
      googlePasswordForm.innerHTML = `
        <label class="settings-label" for="google-new-password-input">Nova GymLeader lozinka</label>
        <div class="settings-password-wrap">
          <input id="google-new-password-input" class="custom-input" type="password" autocomplete="new-password" placeholder="Napravi posebnu lozinku">
          <button type="button" class="settings-password-toggle" data-action="toggle-settings-password" data-password-target="google-new-password-input">Prikaži</button>
        </div>
        <label class="settings-label" for="google-confirm-password-input">Potvrdi novu lozinku</label>
        <div class="settings-password-wrap">
          <input id="google-confirm-password-input" class="custom-input" type="password" autocomplete="new-password" placeholder="Ponovi lozinku">
          <button type="button" class="settings-password-toggle" data-action="toggle-settings-password" data-password-target="google-confirm-password-input">Prikaži</button>
        </div>
        <div class="settings-password-rules"><span>✓ Najmanje 8 karaktera</span><span>✓ Najmanje jedno slovo i jedan broj</span></div>
        <button class="btn btn-purple settings-modal-save" data-action="set-google-password" type="button">Postavi GymLeader lozinku</button>
        <p id="google-password-status" class="settings-status" role="status"></p>
      `;
      googleNote.appendChild(googlePasswordForm);
    }
    if (form && !form.querySelector('[data-action="open-forgot-password"]')) {
      const resetLink = document.createElement('button');
      resetLink.type = 'button';
      resetLink.className = 'auth-inline-link';
      resetLink.dataset.action = 'open-forgot-password';
      resetLink.textContent = 'Zaboravio/la sam trenutnu lozinku';
      form.appendChild(resetLink);
    }
    if (status) { status.textContent = ''; status.style.color = ''; }
    ['current-password-input', 'new-password-input', 'confirm-new-password-input'].forEach((id) => {
      const input = document.getElementById(id);
      if (input) { input.value = ''; input.type = 'password'; }
    });
    modal.style.display = 'flex';
  };

  window.changePassword = async function() {
    if (!currentUser) return;
    const status = document.getElementById('security-password-status');
    const current = document.getElementById('current-password-input')?.value || '';
    const next = document.getElementById('new-password-input')?.value || '';
    const confirmation = document.getElementById('confirm-new-password-input')?.value || '';
    const showStatus = (message, error = false) => {
      if (!status) return;
      status.textContent = message;
      status.style.color = error ? 'var(--danger)' : 'var(--primary)';
    };
    if (!current) return showStatus('Unesi trenutnu GymLeader lozinku.', true);
    if (!isValidRegistrationPassword(next)) return showStatus('Nova lozinka mora imati najmanje 8 karaktera, jedno slovo i jedan broj.', true);
    if (next !== confirmation) return showStatus('Nove lozinke se ne podudaraju.', true);
    const button = document.querySelector('[data-action="change-password"]');
    if (button) { button.disabled = true; button.textContent = 'Čuvam…'; }
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, current);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, next);
      showStatus('Lozinka je uspješno promijenjena.');
      ['current-password-input', 'new-password-input', 'confirm-new-password-input'].forEach((id) => {
        const input = document.getElementById(id);
        if (input) input.value = '';
      });
    } catch (error) {
      console.error('Password change diagnostic:', error?.code || error);
      const message = error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential'
        ? 'Trenutna lozinka nije tačna.'
        : error?.code === 'auth/requires-recent-login'
          ? 'Ponovo se prijavi pa pokušaj promjenu lozinke.'
          : error?.code === 'auth/too-many-requests'
            ? 'Previše pokušaja. Sačekaj malo pa pokušaj ponovo.'
            : 'Lozinku trenutno nije moguće promijeniti. Pokušaj ponovo.';
      showStatus(message, true);
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Promijeni lozinku'; }
    }
  };

  window.setGooglePassword = async function() {
    if (!currentUser?.email) return;
    const next = document.getElementById('google-new-password-input')?.value || '';
    const confirmation = document.getElementById('google-confirm-password-input')?.value || '';
    const status = document.getElementById('google-password-status');
    const button = document.querySelector('[data-action="set-google-password"]');
    const showStatus = (message, error = false) => {
      if (!status) return;
      status.textContent = message;
      status.style.color = error ? 'var(--danger)' : 'var(--primary)';
    };
    if (!isValidRegistrationPassword(next)) return showStatus('Lozinka mora imati najmanje 8 karaktera, jedno slovo i jedan broj.', true);
    if (next !== confirmation) return showStatus('Lozinke se ne podudaraju.', true);
    if (button) { button.disabled = true; button.textContent = 'Postavljam…'; }
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, next);
      await linkWithCredential(currentUser, credential);
      await currentUser.reload();
      showStatus('GymLeader lozinka je postavljena. Sada se možeš prijaviti i emailom.', false);
      ['google-new-password-input', 'google-confirm-password-input'].forEach((id) => {
        const input = document.getElementById(id);
        if (input) input.value = '';
      });
      setTimeout(() => window.openSecurityPasswordEditor(), 700);
    } catch (error) {
      console.error('Google password linking diagnostic:', error?.code || error);
      const message = error?.code === 'auth/email-already-in-use'
        ? 'Ovaj email već ima GymLeader lozinku. Zatvori prozor i prijavi se emailom.'
        : error?.code === 'auth/provider-already-linked'
          ? 'GymLeader lozinka je već postavljena za ovaj nalog.'
          : error?.code === 'auth/requires-recent-login'
            ? 'Ponovo se prijavi preko Googlea pa pokušaj ponovo.'
            : 'GymLeader lozinku trenutno nije moguće postaviti. Pokušaj ponovo.';
      showStatus(message, true);
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Postavi GymLeader lozinku'; }
    }
  };

  window.saveProfileName = async function() {
    if (!currentUser) return;
    const name = document.getElementById('profile-name-input')?.value.trim() || '';
    if (!name || name.length > 100) {
      ShowToast('Ime i prezime moraju imati između 1 i 100 karaktera.', 'error');
      return;
    }
    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        fullName: name,
        email: currentUser.email || '',
        createdAt: currentProfileData?.createdAt || new Date().toISOString()
      }, { merge: true });
      await updateProfile(currentUser, { displayName: name });
      currentProfileData = { ...(currentProfileData || {}), fullName: name, email: currentUser.email };
      const headerName = document.getElementById('user-email-display');
      if (headerName) headerName.textContent = name;
      renderProfileSettings();
      document.getElementById('settings-name-modal').style.display = 'none';
      ShowToast('Ime i prezime su sačuvani.');
    } catch (error) {
      ShowToast(error.message || 'Ime nije moguće sačuvati.', 'error');
    }
  };

  window.openDeleteAccountModal = function() {
    const modal = document.getElementById('delete-account-modal');
    if (!currentUser || !modal) return;
    modal.querySelectorAll('input[name="account-delete-reason"]').forEach((input) => { input.checked = false; });
    const details = document.getElementById('account-delete-details');
    const phrase = document.getElementById('account-delete-confirm-text');
    const status = document.getElementById('account-delete-status');
    const confirmButton = document.querySelector('.settings-delete-confirm');
    const language = getCurrentLanguage();
    const words = { sr: 'OBRIŠI', en: 'DELETE', de: 'LÖSCHEN' };
    const prompts = { sr: 'OBRIŠI', en: 'DELETE', de: 'LÖSCHEN' };
    if (details) details.value = '';
    if (phrase) { phrase.value = ''; phrase.dataset.requiredPhrase = prompts[language] || prompts.sr; }
    const word = document.getElementById('account-delete-confirm-word');
    if (word) word.textContent = words[language] || words.sr;
    if (status) status.textContent = '';
    if (confirmButton) confirmButton.disabled = true;
    modal.style.display = 'flex';
  };

  function updateDeleteAccountButton() {
    const modal = document.getElementById('delete-account-modal');
    if (!modal) return;
    const hasReason = Boolean(modal.querySelector('input[name="account-delete-reason"]:checked'));
    const phraseInput = document.getElementById('account-delete-confirm-text');
    const expectedPhrase = phraseInput?.dataset.requiredPhrase || 'OBRIŠI';
    const phraseMatches = phraseInput?.value.trim().toLocaleUpperCase() === expectedPhrase;
    const button = modal.querySelector('.settings-delete-confirm');
    if (button) button.disabled = !(hasReason && phraseMatches);
  }

  async function clearLocalUserData(userId) {
    const prefixes = ['gym_routines_cache_v', 'gym_history_cache_v', 'gym_body_measurements_cache_v', 'gym_profile_photo_v', 'gym_pending_workouts_v', 'gym_legal_acceptance_v1_', 'gym_weekly_goal_v1_', 'gym_food_entries_cache_v1_', 'gym_food_daily_goal_v1_', 'gym_food_favorites_v1_'];
    const matchingKeys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.endsWith(`_${userId}`) && prefixes.some((prefix) => key.startsWith(prefix))) matchingKeys.push(key);
    }
    matchingKeys.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem('active_workout_draft');
    currentWorkout = null;
    activeWorkoutEditMode = false;
    pendingWorkoutsMemory = [];
    pendingWorkoutsLoaded = false;
    cachedHistory = [];
    userRoutines = [];

    try {
      const dbInstance = await openPendingWorkoutsDb();
      await new Promise((resolve, reject) => {
        const transaction = dbInstance.transaction('pendingWorkouts', 'readwrite');
        const store = transaction.objectStore('pendingWorkouts');
        const request = store.getAll();
        request.onsuccess = () => (request.result || []).forEach((item) => {
          if (item.userId === userId) store.delete(item.id);
        });
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.warn('Lokalni red nije mogao biti očišćen:', error);
    }
  }

  window.deleteAccount = async function() {
    if (!currentUser) return;
    const modal = document.getElementById('delete-account-modal');
    const reason = modal?.querySelector('input[name="account-delete-reason"]:checked')?.value;
    const details = document.getElementById('account-delete-details')?.value.trim() || '';
    const phraseInput = document.getElementById('account-delete-confirm-text');
    const button = modal?.querySelector('.settings-delete-confirm');
    const status = document.getElementById('account-delete-status');
    if (!reason || phraseInput?.value.trim().toLocaleUpperCase() !== phraseInput?.dataset.requiredPhrase) {
      updateDeleteAccountButton();
      return;
    }

    const originalButtonText = button?.textContent || '';
    if (button) { button.disabled = true; button.textContent = 'Brisanje naloga…'; }
    if (status) status.textContent = 'Uklanjamo nalog i sve povezane podatke…';
    try {
      const headers = await getProtectedApiHeaders();
      headers.Authorization = `Bearer ${await currentUser.getIdToken(true)}`;
      const response = await fetch('https://your-gym-planner.vercel.app/api/delete-account', {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason, details })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 && result?.code === 'RECENT_LOGIN_REQUIRED') {
          throw new Error('Zbog sigurnosti prijavi se ponovo, pa odmah pokušaj brisanje naloga.');
        }
        throw new Error(result?.error || 'Nalog nije moguće obrisati. Pokušaj ponovo.');
      }

      const deletedUserId = currentUser.uid;
      await clearLocalUserData(deletedUserId);
      modal.style.display = 'none';
      await signOut(auth);
      ShowToast('Nalog i podaci su trajno obrisani.');
    } catch (error) {
      if (status) status.textContent = error.message || 'Brisanje nije uspjelo. Pokušaj ponovo.';
      if (button) { button.disabled = false; button.textContent = originalButtonText; }
    }
  };

  function updateProfilePhotoPreview() {
    const preview = document.getElementById('profile-photo-preview');
    const frame = document.querySelector('.photo-editor-frame');
    if (!preview || !frame || !pendingProfilePhotoImage) return;
    const frameSize = frame.clientWidth || 280;
    const image = pendingProfilePhotoImage;
    const baseScale = Math.max(frameSize / image.width, frameSize / image.height);
    preview.style.width = `${image.width * baseScale}px`;
    preview.style.height = `${image.height * baseScale}px`;
    preview.style.transform = `translate(-50%, -50%) translate(${profilePhotoOffsetX}px, ${profilePhotoOffsetY}px) scale(${profilePhotoZoom})`;
  }

  async function handleProfilePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      ShowToast('Slika mora biti PNG, JPG ili WebP do 5 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const largestSide = Math.max(image.width, image.height);
        const pixels = image.width * image.height;
        if (image.width < 160 || image.height < 160 || largestSide > 4096 || pixels > 16000000) {
          ShowToast('Slika mora imati najmanje 160×160 i najviše 4096 px po strani.', 'error');
          return;
        }
        pendingProfilePhotoImage = image;
        profilePhotoZoom = 1;
        profilePhotoOffsetX = 0;
        profilePhotoOffsetY = 0;
        const preview = document.getElementById('profile-photo-preview');
        const zoom = document.getElementById('profile-photo-zoom');
        if (preview) { preview.src = reader.result; updateProfilePhotoPreview(); }
        if (zoom) zoom.value = '1';
        const modal = document.getElementById('profile-photo-modal');
        if (modal) modal.style.display = 'flex';
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
    return;
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const size = 320;
        const scale = Math.min(1, size / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.78);
        try {
          localStorage.setItem(getProfilePhotoKey(currentUser.uid), compressed);
          renderProfileSettings();
          ShowToast('Profilna slika je sačuvana na ovom uređaju.');
        } catch {
          ShowToast('Slika je prevelika za lokalno čuvanje.', 'error');
        }
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  window.applyProfilePhoto = async function() {
    if (!currentUser || !pendingProfilePhotoImage) return;
    const size = 512;
    const image = pendingProfilePhotoImage;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const context = canvas.getContext('2d');
    const scale = Math.max(size / image.width, size / image.height) * profilePhotoZoom;
    const width = image.width * scale;
    const height = image.height * scale;
    const frameSize = document.querySelector('.photo-editor-frame')?.clientWidth || 280;
    const offsetScale = size / frameSize;
    context.drawImage(image, (size - width) / 2 + profilePhotoOffsetX * offsetScale, (size - height) / 2 + profilePhotoOffsetY * offsetScale, width, height);
    try {
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.82);
      localStorage.setItem(getProfilePhotoKey(currentUser.uid), photoDataUrl);
      pendingProfilePhotoImage = null;
      document.getElementById('profile-photo-modal').style.display = 'none';
      renderProfileSettings();
      ShowToast('Profilna slika je sa\u010duvana na ovom ure\u0111aju.');
      return;
      ShowToast('Profilna slika je saÄuvana na ovom ureÄ‘aju.');
    } catch {
      ShowToast('Slika je prevelika za lokalno Äuvanje.', 'error');
    }
  };

  window.removeProfilePhoto = async function() {
    if (!currentUser) return;
    if (!await showConfirm('Da li sigurno želiš obrisati profilnu sliku?')) return;
    try {
      localStorage.removeItem(getProfilePhotoKey(currentUser.uid));
      pendingProfilePhotoImage = null;
      document.getElementById('profile-photo-modal').style.display = 'none';
      renderProfileSettings();
      ShowToast('Profilna slika je uklonjena.');
    } catch (error) {
      console.error('Uklanjanje profilne slike nije uspjelo:', error);
      ShowToast('Profilnu sliku nije moguće ukloniti.', 'error');
    }
  };

  window.openProfileEmailModal = function() {
    if (!currentUser) return;
    const emailInput = document.getElementById('profile-email-input');
    const codeInput = document.getElementById('profile-email-code-input');
    const status = document.getElementById('profile-email-modal-status');
    if (emailInput) emailInput.value = '';
    if (codeInput) { codeInput.value = ''; codeInput.style.display = 'none'; }
    if (status) status.textContent = '';
    profileEmailCodeTarget = '';
    document.getElementById('profile-email-modal').style.display = 'flex';
  };

  window.requestProfileEmailCode = async function() {
    if (!currentUser) return;
    const emailInput = document.getElementById('profile-email-input');
    const codeInput = document.getElementById('profile-email-code-input');
    const nextEmail = emailInput.value.trim().toLowerCase();
    if (!nextEmail || nextEmail === currentUser.email.toLowerCase()) {
      ShowToast('Unesite novu email adresu.', 'error');
      return;
    }
    try {
      await sendVerificationCodeEmail(nextEmail);
      profileEmailCodeTarget = nextEmail;
      codeInput.style.display = 'block';
      const status = document.getElementById('profile-email-modal-status');
      if (status) status.textContent = 'Kod je poslat na novu email adresu.';
    } catch (error) {
      ShowToast(error.message, 'error');
    }
  };

  window.saveProfileSettings = async function() {
    if (!currentUser) return;
    const name = document.getElementById('profile-name-input').value.trim();
    const email = document.getElementById('profile-email-input').value.trim().toLowerCase();
    const code = document.getElementById('profile-email-code-input').value.trim();
    if (!name || name.length > 100) {
      ShowToast('Ime i prezime moraju imati između 1 i 100 karaktera.', 'error');
      return;
    }
    const emailChanged = email !== String(currentUser.email || '').toLowerCase();
    if (emailChanged && (email !== profileEmailCodeTarget || !/^\d{6}$/.test(code))) {
      ShowToast('Za novu email adresu unesite tačan šestocifreni kod.', 'error');
      return;
    }
    if (!emailChanged) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), { fullName: name, email: currentUser.email });
        await updateProfile(currentUser, { displayName: name });
        currentProfileData = { ...(currentProfileData || {}), fullName: name, email: currentUser.email };
        document.getElementById('user-email-display').innerText = name;
        document.getElementById('profile-settings-status').textContent = 'Profil je uspješno sačuvan.';
        ShowToast('Profil je ažuriran.');
      } catch (error) {
        ShowToast(error.message, 'error');
      }
      return;
    }
    try {
      const headers = await getProtectedApiHeaders();
      headers.Authorization = `Bearer ${await currentUser.getIdToken(true)}`;
      const response = await fetch('https://your-gym-planner.vercel.app/api/update-profile', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, email: emailChanged ? email : undefined, code: emailChanged ? code : undefined })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Profil nije moguće sačuvati.');
      await updateProfile(currentUser, { displayName: name });
      await currentUser.reload();
      currentProfileData = { ...(currentProfileData || {}), fullName: name, email: result.email || currentUser.email };
      document.getElementById('user-email-display').innerText = name;
      renderProfileSettings();
      document.getElementById('profile-email-code-input').style.display = 'none';
      profileEmailCodeTarget = '';
      document.getElementById('profile-email-modal').style.display = 'none';
      const currentEmailInput = document.getElementById('profile-email-current');
      if (currentEmailInput) currentEmailInput.value = currentUser.email || email;
      document.getElementById('profile-settings-status').textContent = 'Profil je uspješno sačuvan.';
      ShowToast('Profil je ažuriran.');
    } catch (error) {
      ShowToast(error.message, 'error');
    }
  };

  function applyTheme(theme) {
    const selectedTheme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = selectedTheme;
    localStorage.setItem('gym-theme', selectedTheme);
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      const isLight = selectedTheme === 'light';
      const language = localStorage.getItem('gym-language') || 'sr';
      const labels = {
        sr: isLight ? 'Svetli prikaz' : 'Tamni prikaz',
        en: isLight ? 'Light mode' : 'Dark mode',
        de: isLight ? 'Heller Modus' : 'Dunkler Modus'
      };
      toggle.setAttribute('aria-checked', String(isLight));
      toggle.setAttribute('aria-label', labels[language] || labels.sr);
      const label = document.getElementById('theme-toggle-label');
      if (label) label.textContent = labels[language] || labels.sr;
    }
  }

  function getCurrentLanguage() {
    const language = localStorage.getItem('gym-language');
    return ['sr', 'en', 'de'].includes(language) ? language : 'sr';
  }

  function normalizeTranslationKey(value) {
    return String(value)
      .replace(/\s+/g, ' ')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  const translationLookup = Object.fromEntries(
    Object.entries(TRANSLATIONS).map(([language, phrases]) => [
      language,
      Object.fromEntries(Object.entries(phrases).map(([source, target]) => [normalizeTranslationKey(source), target]))
    ])
  );

  function translateUiText(value, language = getCurrentLanguage()) {
    if (language === 'sr' || typeof value !== 'string') return value;
    const leading = value.match(/^\s*/)?.[0] || '';
    const trailing = value.match(/\s*$/)?.[0] || '';
    const translated = translationLookup[language]?.[normalizeTranslationKey(value.trim())];
    return translated ? `${leading}${translated}${trailing}` : value;
  }

  const localizedTextSources = new WeakMap();
  const localizedAttributeSources = new WeakMap();

  function localizeElement(element) {
    if (!(element instanceof Element)) return;
    let sources = localizedAttributeSources.get(element);
    if (!sources) {
      sources = new Map();
      localizedAttributeSources.set(element, sources);
    }
    for (const attribute of ['placeholder', 'title', 'aria-label', 'alt']) {
      if (element.hasAttribute(attribute)) {
        if (!sources.has(attribute)) sources.set(attribute, element.getAttribute(attribute));
        const original = sources.get(attribute);
        const translated = translateUiText(original);
        if (translated !== element.getAttribute(attribute)) element.setAttribute(attribute, translated);
      }
    }
  }

  function localizeSubtree(root = document.body) {
    if (!root) return;
    if (root instanceof Element) localizeElement(root);
    const elementRoot = root instanceof Element || root instanceof Document ? root : root.parentElement;
    elementRoot?.querySelectorAll?.('[placeholder], [title], [aria-label], [alt]').forEach(localizeElement);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || parent.closest('script, style, textarea, option, code')) continue;
      if (!localizedTextSources.has(node)) localizedTextSources.set(node, node.nodeValue);
      const translated = translateUiText(localizedTextSources.get(node));
      if (translated !== node.nodeValue) node.nodeValue = translated;
    }
  }

  function localizeTextNode(node) {
    if (!localizedTextSources.has(node)) localizedTextSources.set(node, node.nodeValue);
    const translated = translateUiText(localizedTextSources.get(node));
    if (translated !== node.nodeValue) node.nodeValue = translated;
  }

  function observeLocalization() {
    const observer = new MutationObserver((changes) => {
      if (getCurrentLanguage() === 'sr') return;
      changes.forEach((change) => {
        if (change.type === 'characterData') {
          const parent = change.target.parentElement;
          if (parent && !parent.closest('script, style, textarea, option, code')) {
            localizeTextNode(change.target);
          }
        }
        change.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) localizeSubtree(node);
          if (node.nodeType === Node.TEXT_NODE) localizeTextNode(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function showLanguageLoading(language) {
    const loader = document.getElementById('language-loading');
    if (!loader) return;
    const copy = getLoadingCopy(language);
    document.getElementById('language-loading-title').textContent = copy.title;
    document.getElementById('language-loading-text').textContent = copy.message;
    loader.hidden = false;
  }

  function getLoadingCopy(language) {
    return window.GymLeaderLoadingCopy?.[language] || {
      sr: { title: 'Učitavanje GymLeadera…', message: 'Pripremamo tvoj trening.' },
      en: { title: 'Loading GymLeader…', message: 'Getting your workout ready.' },
      de: { title: 'GymLeader wird geladen…', message: 'Dein Training wird vorbereitet.' }
    }[language] || { title: 'Učitavanje GymLeadera…', message: 'Pripremamo tvoj trening.' };
  }

  function changeAppLanguage(language) {
    const selectedLanguage = ['sr', 'en', 'de'].includes(language) ? language : 'sr';
    localStorage.setItem('gym-language', selectedLanguage);
    localStorage.setItem('gym-language-source', 'manual');
    applyLanguage(selectedLanguage);
    localizeSubtree(document.body);
    window.renderWorkouts?.();
    renderDashboard();
    refreshLanguageSensitiveSettingsSummaries();
    if (document.getElementById('plan-generator-modal')?.style.display === 'flex' && generatedPlanSuggestions.length) renderGeneratedPlanSuggestions();
    localizeSubtree(document.body);
  }

  function refreshLanguageSensitiveSettingsSummaries() {
    if (!currentUser) return;
    const language = getCurrentLanguage();
    const languageNames = { sr: 'Srpski', en: 'English', de: 'Deutsch' };
    const isLight = document.documentElement.dataset.theme === 'light';
    const themeNames = {
      sr: isLight ? 'Svijetli prikaz' : 'Tamni prikaz',
      en: isLight ? 'Light mode' : 'Dark mode',
      de: isLight ? 'Heller Modus' : 'Dunkler Modus'
    };
    const languageSummary = document.getElementById('settings-language-summary');
    const themeSummary = document.getElementById('settings-theme-summary');
    const photoSummary = document.getElementById('settings-photo-summary');
    const foodGoalsSummary = document.getElementById('settings-food-goals-summary');
    if (languageSummary) languageSummary.textContent = languageNames[language];
    if (themeSummary) themeSummary.textContent = themeNames[language];
    if (photoSummary) {
      const hasPhoto = Boolean(localStorage.getItem(getProfilePhotoKey(currentUser.uid)));
      photoSummary.textContent = hasPhoto
        ? ({ sr: 'Dodana', en: 'Added', de: 'Hinzugefügt' }[language])
        : ({ sr: 'Nije dodata', en: 'Not added', de: 'Nicht hinzugefügt' }[language]);
    }
    if (foodGoalsSummary) {
      const goals = getNutritionGoals();
      const configured = [
        goals.calories ? `${formatFoodNumber(goals.calories)} kcal` : '',
        goals.protein ? `P ${formatFoodNumber(goals.protein)} g` : '',
        goals.carbs ? `${language === 'sr' ? 'UH' : 'C'} ${formatFoodNumber(goals.carbs)} g` : '',
        goals.fat ? `${language === 'sr' ? 'M' : 'F'} ${formatFoodNumber(goals.fat)} g` : ''
      ].filter(Boolean);
      foodGoalsSummary.textContent = configured.length ? configured.join(' · ') : ({ sr: 'Nisu postavljeni', en: 'Not set', de: 'Nicht festgelegt' }[language]);
    }
    renderWeeklyGoalSettingsSummary();
  }

  function applyLanguage(language) {
    const selectedLanguage = ['sr', 'en', 'de'].includes(language) ? language : 'sr';
    const pageTitles = {
      sr: 'GymLeader | Planiraj trening i prati napredak',
      en: 'GymLeader | Plan your workouts and track progress',
      de: 'GymLeader | Plane dein Training und verfolge deinen Fortschritt'
    };
    document.title = pageTitles[selectedLanguage];
    document.documentElement.lang = selectedLanguage === 'sr' ? 'sr-Latn' : selectedLanguage;
    const loadingCopy = getLoadingCopy(selectedLanguage);
    const bootText = document.getElementById('auth-boot-text');
    const bootScreen = document.getElementById('auth-boot-screen');
    const loadingTitle = document.getElementById('language-loading-title');
    const loadingText = document.getElementById('language-loading-text');
    if (bootText) bootText.textContent = loadingCopy.message;
    if (bootScreen) bootScreen.setAttribute('aria-label', loadingCopy.title);
    if (loadingTitle) loadingTitle.textContent = loadingCopy.title;
    if (loadingText) loadingText.textContent = loadingCopy.message;
    document.querySelectorAll('.language-option').forEach((button) => {
      button.classList.toggle('active', button.dataset.language === selectedLanguage);
      button.setAttribute('aria-pressed', String(button.dataset.language === selectedLanguage));
    });
    const status = document.getElementById('language-settings-status');
    if (status) {
      status.textContent = 'Odabran je srpski jezik.';
      if (status.firstChild) localizedTextSources.set(status.firstChild, 'Odabran je srpski jezik.');
    }
  }

  function renderLanguageFlagIcons() {
    const flags = {
      sr: '<span class="flag-image"><img src="assets/flag-sr.svg" alt="Srpska zastava"></span>',
      en: '<span class="flag-image"><img class="flag-uk" src="assets/flag-en.svg" alt="British flag"></span>',
      de: '<span class="flag-image"><img src="assets/flag-de.svg" alt="Njemačka zastava"></span>'
    };
    document.querySelectorAll('.language-option').forEach((button) => {
      const language = button.dataset.language;
      const label = language === 'sr' ? 'Srpski' : language === 'en' ? 'English' : 'Deutsch';
      if (flags[language]) button.innerHTML = `${flags[language]}<small>${label}</small>`;
    });
  }

  function initializeAppearanceSettings() {
    applyTheme(localStorage.getItem('gym-theme') || 'dark');
    renderLanguageFlagIcons();
    const savedLanguage = localStorage.getItem('gym-language');
    let initialLanguage;
    if (['sr', 'en', 'de'].includes(savedLanguage)) {
      initialLanguage = savedLanguage;
      // Before the source marker existed, a saved value may have come from an
      // explicit choice. Preserve it instead of guessing from the device.
      if (!localStorage.getItem('gym-language-source')) {
        localStorage.setItem('gym-language-source', 'manual');
      }
    } else {
      initialLanguage = getInitialLanguageFromDevice();
      localStorage.setItem('gym-language', initialLanguage);
      localStorage.setItem('gym-language-source', 'device');
    }
    applyLanguage(initialLanguage);
    localizeSubtree();
    observeLocalization();
  }

  function getInitialLanguageFromDevice() {
    const preferredLanguages = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language].filter(Boolean);
    for (const preference of preferredLanguages) {
      const baseLanguage = String(preference || '').trim().toLowerCase().replace(/_/g, '-').split('-')[0];
      if (baseLanguage === 'sr') return 'sr';
      if (baseLanguage === 'en') return 'en';
      if (baseLanguage === 'de') return 'de';
      if (['hr', 'bs', 'cnr'].includes(baseLanguage)) return 'sr';
    }
    return 'en';
  }

  function showConfirm(message) {
    return new Promise((resolve) => {
      const confirmed = window.confirm(message);
      resolve(confirmed);
    });
  }

  function setupEventHandlers() {
    const authForm = document.getElementById('auth-form');
    if (authForm) authForm.addEventListener('submit', window.handleAuthSubmit);
    document.getElementById('auth-password')?.addEventListener('input', updatePasswordRuleState);
    document.getElementById('auth-password-confirm')?.addEventListener('input', updatePasswordRuleState);
    const saveRegistrationProgress = () => {
      if (currentAuthMode !== 'register') return;
      const email = document.getElementById('auth-email')?.value.trim().toLowerCase() || '';
      const name = document.getElementById('auth-name')?.value.trim() || '';
      if (!email && !name) return;
      const existing = readRegistrationDraft();
      saveRegistrationDraft({
        email,
        name,
        codeSentAt: existing?.email === email ? existing.codeSentAt || null : null
      });
    };
    document.getElementById('auth-email')?.addEventListener('input', saveRegistrationProgress);
    document.getElementById('auth-name')?.addEventListener('input', saveRegistrationProgress);
    window.addEventListener('online', () => {
      clearPendingWorkoutSyncRetry();
      schedulePendingWorkoutSync(0);
    });

    document.getElementById('delete-account-modal')?.addEventListener('input', updateDeleteAccountButton);
    document.getElementById('delete-account-modal')?.addEventListener('change', updateDeleteAccountButton);
    document.getElementById('accept-terms-checkbox')?.addEventListener('change', updateLegalAcceptanceButton);
    document.getElementById('accept-privacy-checkbox')?.addEventListener('change', updateLegalAcceptanceButton);
    document.getElementById('gender-required-modal')?.addEventListener('change', () => updateGenderSaveButton('required-gender-option', 'save-required-gender'));
    document.getElementById('settings-gender-modal')?.addEventListener('change', () => updateGenderSaveButton('profile-gender-option', 'save-profile-gender'));
    document.getElementById('profile-required-modal')?.addEventListener('change', (event) => {
      const input = event.target;
      if (input instanceof HTMLInputElement && input.name === 'required-profile-muscles') {
        const all = document.querySelector('input[name="required-profile-muscles"][value="full_body"]');
        const individual = [...document.querySelectorAll('input[name="required-profile-muscles"]')].filter((item) => item.value !== 'full_body');
        if (input.value === 'full_body' && input.checked) individual.forEach((item) => { item.checked = true; });
        if (input.value === 'full_body' && !input.checked) individual.forEach((item) => { item.checked = false; });
        if (input.value !== 'full_body' && input.checked && all) all.checked = false;
        if (input.value !== 'full_body' && !input.checked && all) all.checked = false;
      }
      input?.closest?.('.profile-wizard-field')?.classList.remove('has-error');
      const error = input?.closest?.('.profile-wizard-field')?.querySelector('.profile-field-error');
      if (error) error.textContent = '';
      saveProfileWizardDraft();
    });
    document.getElementById('profile-required-modal')?.addEventListener('input', (event) => {
      event.target?.closest?.('.profile-wizard-field')?.classList.remove('has-error');
      const error = event.target?.closest?.('.profile-wizard-field')?.querySelector('.profile-field-error');
      if (error) error.textContent = '';
      saveProfileWizardDraft();
    });
    document.getElementById('plan-generator-modal')?.addEventListener('change', (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || !['plan-generator-mode', 'plan-generator-muscle'].includes(input.name)) return;
      if (profileUsesFullBody(currentProfileData)) {
        const fullBodyInput = document.querySelector('input[name="plan-generator-mode"][value="full_body"]');
        if (fullBodyInput) fullBodyInput.checked = true;
      }
      updatePlanGeneratorConfiguration(true);
    });

    const generatorResults = document.getElementById('plan-generator-results');
    let generatorSwipeStart = null;
    generatorResults?.addEventListener('touchstart', (event) => {
      if (event.target?.closest?.('button, input, textarea, select, a') || event.touches.length !== 1) return;
      generatorSwipeStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }, { passive: true });
    generatorResults?.addEventListener('touchend', (event) => {
      if (!generatorSwipeStart || event.changedTouches.length !== 1) return;
      const deltaX = event.changedTouches[0].clientX - generatorSwipeStart.x;
      const deltaY = event.changedTouches[0].clientY - generatorSwipeStart.y;
      generatorSwipeStart = null;
      if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.25) return;
      window.viewGeneratedPlan(deltaX < 0 ? 1 : -1);
    }, { passive: true });

    setupTouchReorder();

    const analyticsSelect = document.getElementById('analytics-ex-select');
    if (analyticsSelect) analyticsSelect.addEventListener('change', window.renderAnalyticsChart);
    document.getElementById('analytics-metric-select')?.addEventListener('change', window.renderAnalyticsChart);
    document.getElementById('analytics-period-select')?.addEventListener('change', window.renderAnalyticsChart);
    document.getElementById('body-metric-select')?.addEventListener('change', renderBodyMeasurements);
    document.getElementById('food-selected-date')?.addEventListener('change', () => loadFoodEntriesForSelectedDay());
    document.getElementById('body-auto-progress')?.addEventListener('change', (event) => {
      if (event.target?.id !== 'body-manual-metric-select' || !currentUser) return;
      localStorage.setItem(`gym-body-selected-metric-v1-${currentUser.uid}`, event.target.value);
      renderBodyMeasurements();
    });
    document.addEventListener('input', (event) => {
      const input = event.target;
      if (!(input instanceof Element) || !input.matches('.exercise-library-search')) return;
      renderExerciseLibraryPicker(input.closest('.exercise-library-picker'));
    });
    document.addEventListener('change', (event) => {
      const input = event.target;
      if (!(input instanceof Element) || !input.matches('.exercise-library-muscle, .exercise-library-equipment, .exercise-library-place')) return;
      renderExerciseLibraryPicker(input.closest('.exercise-library-picker'));
    });
    document.addEventListener('change', (event) => {
      const select = event.target;
      if (!(select instanceof HTMLSelectElement) || !select.matches('.history-editor-exercise-type')) return;
      window.changeHistoryWorkoutExerciseType(select.dataset.exerciseIndex, select.value);
    });

    document.addEventListener('click', (event) => {
      const button = event.target instanceof Element ? event.target.closest('[data-action]') : null;
      if (!button) return;

      const action = button.dataset.action;
      const modalId = button.dataset.modalId;

      if (action !== 'auth-mode' && action !== 'logout' && action !== 'google-login' && action !== 'copy-ai-rules') {
        window.vibrate();
      }

      switch (action) {
        case 'toggle-theme':
          applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
          renderProfileSettings();
          break;
        case 'set-language':
          changeAppLanguage(button.dataset.language);
          break;
        case 'go-home':
          window.goHome();
          break;
        case 'switch-tab':
          window.switchTab(button.dataset.tab);
          break;
        case 'export-user-data':
          window.exportUserData();
          break;
        case 'open-weekly-goal-settings':
          window.openWeeklyGoalSettings();
          break;
        case 'save-weekly-goal':
          window.saveWeeklyGoal();
          break;
        case 'open-food-entry-modal':
          window.openFoodEntryModal();
          break;
        case 'set-food-library-category':
          foodLibraryCategory = button.dataset.foodCategory || 'all';
          renderFoodLibraryPicker();
          break;
        case 'select-food-library-item':
          window.selectFoodLibraryItem(button.dataset.foodLibraryId);
          break;
        case 'select-food-favorite':
          window.selectFoodFavorite(button.dataset.foodFavoriteId);
          break;
        case 'save-food-favorite':
          window.saveFoodFavorite();
          break;
        case 'edit-food-entry':
          window.openFoodEntryForEdit(button.dataset.foodEntryId);
          break;
        case 'save-food-entry':
          window.saveFoodEntry();
          break;
        case 'delete-food-entry':
          window.deleteFoodEntry(button.dataset.foodEntryId);
          break;
        case 'confirm-food-entry-delete':
          window.confirmFoodEntryDelete();
          break;
        case 'cancel-food-entry-delete':
          window.cancelFoodEntryDelete();
          break;
        case 'open-history-workout-editor':
          window.openHistoryWorkoutEditor(button.dataset.workoutId);
          break;
        case 'add-history-workout-exercise':
          window.addHistoryWorkoutExercise();
          break;
        case 'remove-history-workout-exercise':
          window.removeHistoryWorkoutExercise(button.dataset.exerciseIndex);
          break;
        case 'add-history-workout-set':
          window.addHistoryWorkoutSet(button.dataset.exerciseIndex);
          break;
        case 'remove-history-workout-set':
          window.removeHistoryWorkoutSet(button.dataset.exerciseIndex, button.dataset.setIndex);
          break;
        case 'change-history-workout-exercise-type':
          window.changeHistoryWorkoutExerciseType(button.dataset.exerciseIndex, button.value);
          break;
        case 'save-history-workout':
          window.saveHistoryWorkout();
          break;
        case 'delete-history-workout':
          window.deleteHistoryWorkout();
          break;
        case 'confirm-history-workout-delete':
          window.confirmHistoryWorkoutDelete();
          break;
        case 'cancel-history-workout-delete':
          window.cancelHistoryWorkoutDelete();
          break;
        case 'open-food-goal-modal':
          window.openFoodGoalModal();
          break;
        case 'save-food-goal':
          window.saveFoodGoal();
          break;
        case 'clear-food-goal':
          window.clearFoodGoal();
          break;
        case 'open-meal-planner':
          window.openMealPlanner();
          break;
        case 'generate-meal-plan':
          window.generateMealPlan();
          break;
        case 'replace-meal-plan-meal':
          window.replaceMealPlanMeal(Number(button.dataset.dayIndex), Number(button.dataset.mealIndex));
          break;
        case 'add-meal-plan-meal-to-diary':
          window.addMealPlanMealToDiary(Number(button.dataset.dayIndex), Number(button.dataset.mealIndex));
          break;
        case 'save-meal-plan':
          window.saveMealPlan();
          break;
        case 'discard-meal-plan':
          activeMealPlan = null;
          activeMealPlanOptions = null;
          renderMealPlan();
          break;
        case 'refresh-meal-plans':
          loadSavedMealPlans(true);
          break;
        case 'show-saved-meal-plan':
          window.showSavedMealPlan(button.dataset.mealPlanId);
          break;
        case 'delete-meal-plan':
          window.deleteMealPlan(button.dataset.mealPlanId);
          break;
        case 'cancel-meal-plan-delete':
          window.cancelMealPlanDelete();
          break;
        case 'confirm-meal-plan-delete':
          window.confirmMealPlanDelete();
          break;
        case 'auth-mode':
          window.toggleAuthMode(button.dataset.mode);
          break;
        case 'first-visit-register':
          window.answerFirstVisitPrompt('register');
          break;
        case 'first-visit-login':
          window.answerFirstVisitPrompt('login');
          break;
        case 'dismiss-first-visit':
          dismissFirstVisitPrompt();
          break;
        case 'logout':
          window.handleLogout();
          break;
        case 'install-app':
          window.installApp();
          break;
        case 'set-body-progress-mode':
          if (currentUser && ['manual', 'silhouette'].includes(button.dataset.mode)) {
            localStorage.setItem(`gym-body-progress-mode-v1-${currentUser.uid}`, button.dataset.mode);
            renderBodyMeasurements();
          }
          break;
        case 'dismiss-install':
          window.dismissInstallPrompt();
          break;
        case 'google-login':
          window.handleGoogleLogin();
          break;
        case 'open-forgot-password':
          window.openForgotPasswordModal();
          break;
        case 'send-forgot-password':
          window.sendForgotPassword();
          break;
        case 'toggle-settings-password':
          window.toggleSettingsPassword(button);
          break;
        case 'change-password':
          window.changePassword();
          break;
        case 'set-google-password':
          window.setGooglePassword();
          break;
        case 'toggle-auth-password':
          window.toggleAuthPassword(button);
          break;
        case 'resume-registration':
          window.resumeRegistration();
          break;
        case 'discard-registration':
          window.discardRegistration();
          break;
        case 'start-onboarding':
          document.getElementById('onboardingModal')?.style.setProperty('display', 'none');
          window.switchTab('workouts');
          break;
        case 'onboarding-next':
          onboardingStep = Math.min(3, onboardingStep + 1);
          renderOnboardingStep();
          break;
        case 'onboarding-back':
          onboardingStep = Math.max(0, onboardingStep - 1);
          renderOnboardingStep();
          break;
        case 'onboarding-context':
          onboardingContext = button.dataset.context || 'other';
          if (currentUser) localStorage.setItem('gym-onboarding-context-' + currentUser.uid, onboardingContext);
          onboardingStep = Math.min(3, onboardingStep + 1);
          renderOnboardingStep();
          break;
        case 'onboarding-create-plan':
          document.getElementById('onboardingModal')?.style.setProperty('display', 'none');
          window.switchTab('workouts');
          setTimeout(() => window.openPlanCreationChoice(), 150);
          break;
        case 'resume-draft':
          window.resumeDraftWorkout();
          break;
        case 'open-import-modal':
          document.getElementById('createRoutineModal')?.style.setProperty('display', 'none');
          document.getElementById('importNotesModal').style.display = 'flex';
          break;
        case 'toggle-exercise-library':
          window.toggleExerciseLibrary(button.dataset.targetList);
          break;
        case 'add-library-exercise':
          window.addLibraryExerciseToRoutine(button.dataset.exerciseId, button.dataset.targetList);
          break;
        case 'cancel-workout':
          window.cancelWorkout();
          break;
        case 'toggle-active-workout-edit-mode':
          window.toggleActiveWorkoutEditMode();
          break;
        case 'move-exercise-up':
          window.moveExerciseBlock(button, 'up');
          break;
        case 'move-exercise-down':
          window.moveExerciseBlock(button, 'down');
          break;
        case 'toggle-custom-modal':
          window.toggleAddCustomModal();
          break;
        case 'custom-type':
          window.setCustomType(button.dataset.type);
          break;
        case 'append-custom-exercise':
          window.appendCustomExercise();
          break;
        case 'finish-workout':
          window.finishWorkout();
          break;
        case 'open-profile-email-modal':
          window.openProfileEmailModal();
          break;
        case 'open-settings-editor':
          window.openSettingsEditor(button.dataset.editor);
          break;
        case 'open-legal-documents':
          window.openLegalDocuments('terms');
          break;
        case 'show-legal-document':
          renderLegalDocument(button.dataset.legalDocument || 'terms');
          break;
        case 'open-legal-document-from-acceptance':
          window.openLegalDocuments(button.dataset.legalDocument || 'terms');
          break;
        case 'accept-legal-documents':
          window.acceptLegalDocuments();
          break;
        case 'save-required-gender':
          window.saveRequiredGender();
          break;
        case 'save-required-profile':
          window.saveRequiredProfile();
          break;
        case 'profile-wizard-next':
          window.nextProfileWizardStep();
          break;
        case 'profile-wizard-back':
          window.previousProfileWizardStep();
          break;
        case 'save-profile-details':
          window.saveProfileDetails();
          break;
        case 'open-profile-details-editor':
          window.openProfileDetailsEditor();
          break;
        case 'open-training-goals-editor':
          window.openTrainingGoalsEditor();
          break;
        case 'set-profile-preference':
          window.setProfilePreference(button.dataset.target || '', button.dataset.value || '');
          break;
        case 'open-body-measurement-modal':
          window.openBodyMeasurementModal();
          break;
        case 'edit-body-measurement':
          window.openBodyMeasurementForEdit(button.dataset.measurementId);
          break;
        case 'toggle-body-measurement-actions': {
          if (button.id === 'body-measurements-edit-toggle') {
            bodyMeasurementsEditMode = !bodyMeasurementsEditMode;
            renderBodyMeasurements();
            break;
          }
          const item = button.closest('.body-measurement-item');
          const actions = item?.querySelector('.body-measurement-actions');
          const expanded = actions ? actions.hidden : false;
          if (actions) actions.hidden = !expanded;
          button.setAttribute('aria-expanded', String(expanded));
          break;
        }
        case 'delete-body-measurement':
          window.deleteBodyMeasurement(button.dataset.measurementId);
          break;
        case 'delete-active-body-measurement':
          window.deleteBodyMeasurement(editingBodyMeasurementId);
          break;
        case 'confirm-body-measurement-delete':
          window.confirmBodyMeasurementDelete();
          break;
        case 'cancel-body-measurement-delete':
          window.cancelBodyMeasurementDelete();
          break;
        case 'save-body-measurement':
          window.saveBodyMeasurement();
          break;
        case 'toggle-body-tracking':
          window.toggleBodyTracking();
          break;
        case 'open-body-settings':
          window.openBodySettings();
          break;
        case 'toggle-body-tracking-settings':
          window.toggleBodyTrackingFromSettings();
          break;
        case 'save-profile-gender':
          window.saveProfileGender();
          break;
        case 'save-profile-name':
          window.saveProfileName();
          break;
        case 'open-delete-account':
          window.openDeleteAccountModal();
          break;
        case 'confirm-delete-account':
          window.deleteAccount();
          break;
        case 'start-profile-email-change':
          window.requestProfileEmailCode();
          break;
        case 'apply-profile-photo':
          window.applyProfilePhoto();
          break;
        case 'remove-profile-photo':
          window.removeProfilePhoto();
          break;
        case 'save-profile-settings':
          window.saveProfileSettings();
          break;
        case 'sync-pending-workouts':
          window.syncPendingWorkoutsNow();
          break;
        case 'copy-ai-rules':
          window.copyAIRules();
          break;
        case 'import-notes':
          window.handleImportFromNotes();
          break;
        case 'close-modal':
          if (modalId) {
            const returnToGeneratedPlans = modalId === 'createRoutineModal' && Boolean(pendingGeneratedPlanId);
            document.getElementById(modalId).style.display = 'none';
            if (modalId === 'createRoutineModal') {
              pendingGeneratedPlanId = null;
              if (returnToGeneratedPlans && generatedPlanSuggestions.length) {
                document.getElementById('plan-generator-modal')?.style.setProperty('display', 'flex');
                renderGeneratedPlanSuggestions();
              }
            }
          }
          else button.closest('.modal')?.style.setProperty('display', 'none');
          break;
        case 'clear-routine-emoji':
          window.clearRoutineEmoji();
          break;
        case 'set-routine-emoji':
          window.setRoutineEmoji(button.dataset.emoji || '');
          break;
        case 'submit-new-routine':
          window.submitNewRoutine();
          break;
        case 'add-routine-exercise':
          window.addRoutineExercise(button.dataset.exerciseName || '');
          break;
        case 'add-edit-routine-exercise':
          window.addEditRoutineExercise();
          break;
        case 'remove-routine-exercise':
          window.removeRoutineExercise(button);
          break;
        case 'open-create-routine':
          window.openPlanCreationChoice();
          break;
        case 'choose-plan-generator':
          document.getElementById('plan-creation-choice-modal')?.style.setProperty('display', 'none');
          window.openPlanGenerator();
          break;
        case 'choose-manual-plan':
          document.getElementById('plan-creation-choice-modal')?.style.setProperty('display', 'none');
          window.openCreateRoutineModal();
          break;
        case 'open-plan-generator':
          window.openPlanGenerator();
          break;
        case 'generate-personalized-plans':
          window.generatePersonalizedPlans();
          break;
        case 'view-previous-generated-plan':
          window.viewGeneratedPlan(-1);
          break;
        case 'view-next-generated-plan':
          window.viewGeneratedPlan(1);
          break;
        case 'save-generated-plan':
          window.saveGeneratedPlan(button.dataset.generatedPlanId || '');
          break;
        case 'edit-generated-plan':
          window.editGeneratedPlan(button.dataset.generatedPlanId || '');
          break;
        case 'regenerate-generated-plan':
          window.regenerateGeneratedPlan(button.dataset.generatedPlanId || '');
          break;
        case 'save-all-generated-plans':
          window.saveAllGeneratedPlans();
          break;
        case 'toggle-routine-edit-mode':
          window.toggleRoutineEditMode();
          break;
        case 'toggle-archived-routines':
          window.toggleArchivedRoutines();
          break;
        case 'duplicate-routine':
          window.duplicateRoutine(button.dataset.routineId);
          break;
        case 'toggle-routine-favorite':
          window.toggleRoutineFavorite(button.dataset.routineId);
          break;
        case 'toggle-routine-archive':
          window.toggleRoutineArchive(button.dataset.routineId);
          break;
        case 'open-edit-routine':
          if (button.dataset.routineId) window.openEditRoutineModal(button.dataset.routineId);
          break;
        case 'set-edit-routine-emoji':
          window.setEditRoutineEmoji(button.dataset.emoji || '');
          break;
        case 'save-routine-edits':
          window.saveRoutineEdits();
          break;
        case 'delete-editing-routine':
          window.deleteEditingRoutine();
          break;
        case 'start-routine':
          if (button.dataset.routineId) window.startWorkout(button.dataset.routineId);
          break;
        case 'delete-routine':
          if (button.dataset.routineId) window.deleteRoutine(button.dataset.routineId);
          break;
        case 'remove-exercise':
          window.removeExerciseBlock(button);
          break;
        case 'add-set-row':
          window.addSetRowToBlock(button);
          break;
        case 'remove-set-row':
          window.removeSetRow(button);
          break;
        case 'confirm-verification':
          window.confirmVerificationCode();
          break;
      }
    });

    document.addEventListener('input', (event) => {
      const input = event.target instanceof Element ? event.target : null;
      if (!input) return;

      if (input.classList.contains('set-kg')) {
        window.handleKgInput(input);
        return;
      }

      if (input.classList.contains('set-reps')) {
        updateProgress();
        saveWorkoutDraft();
        return;
      }

      if (input.classList.contains('set-seconds')) {
        updateProgress();
        saveWorkoutDraft();
        return;
      }

      if (input.classList.contains('ex-note')) {
        saveWorkoutDraft();
      }
    });
    document.getElementById('profile-photo-input')?.addEventListener('change', handleProfilePhotoChange);
    document.getElementById('profile-photo-zoom')?.addEventListener('input', (event) => {
      profilePhotoZoom = Number(event.target.value) || 1;
      updateProfilePhotoPreview();
    });
    const photoFrame = document.querySelector('.photo-editor-frame');
    if (photoFrame) {
      photoFrame.addEventListener('pointerdown', (event) => {
        if (!pendingProfilePhotoImage) return;
        event.preventDefault();
        photoFrame.setPointerCapture?.(event.pointerId);
        profilePhotoDrag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, offsetX: profilePhotoOffsetX, offsetY: profilePhotoOffsetY };
        photoFrame.classList.add('is-dragging');
      });
      photoFrame.addEventListener('pointermove', (event) => {
        if (!profilePhotoDrag || profilePhotoDrag.pointerId !== event.pointerId) return;
        const frameSize = photoFrame.clientWidth || 280;
        const maxOffset = frameSize * Math.max(0.35, profilePhotoZoom - 0.5);
        profilePhotoOffsetX = Math.max(-maxOffset, Math.min(maxOffset, profilePhotoDrag.offsetX + event.clientX - profilePhotoDrag.startX));
        profilePhotoOffsetY = Math.max(-maxOffset, Math.min(maxOffset, profilePhotoDrag.offsetY + event.clientY - profilePhotoDrag.startY));
        updateProfilePhotoPreview();
      });
      const stopPhotoDrag = (event) => {
        if (profilePhotoDrag?.pointerId === event.pointerId) {
          profilePhotoDrag = null;
          photoFrame.classList.remove('is-dragging');
        }
      };
      photoFrame.addEventListener('pointerup', stopPhotoDrag);
      photoFrame.addEventListener('pointercancel', stopPhotoDrag);
    }
  }

  function registerOfflineWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (!['http:', 'https:'].includes(location.protocol)) return;
    const build = '20261002-static-carousel-arrows-v94';
    navigator.serviceWorker.register(`/sw.js?v=${build}`, { scope: '/', updateViaCache: 'none' })
      .then((registration) => {
        if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        return registration.update();
      })
      .catch((error) => console.warn('Offline worker nije registrovan:', error));
    if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  }

  function setupPwaInstallPrompt() {
    const banner = document.getElementById('pwa-install-banner');
    if (!banner || window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) return;
    if (localStorage.getItem(PWA_INSTALL_DISMISSED_KEY) === 'true') return;

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      banner.hidden = false;
    });
    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      banner.hidden = true;
      localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, 'true');
    });
  }

  window.installApp = async function() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const result = await deferredInstallPrompt.userChoice;
    if (result?.outcome === 'accepted') localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, 'true');
    deferredInstallPrompt = null;
    document.getElementById('pwa-install-banner')?.setAttribute('hidden', '');
  };

  window.dismissInstallPrompt = function() {
    localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, 'true');
    document.getElementById('pwa-install-banner')?.setAttribute('hidden', '');
  };

  initializeAppearanceSettings();
  setupEventHandlers();
  registerOfflineWorker();
  setupPwaInstallPrompt();
  renderRegistrationResume();


async function getProtectedApiHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (appCheck) {
    try {
      const result = await getToken(appCheck, false);
      if (!result.token) throw new Error('Missing App Check token');
      headers['X-Firebase-AppCheck'] = result.token;
    } catch {
      throw new Error('Sigurnosna provjera nije uspjela. Osvježite stranicu i pokušajte ponovo.');
    }
  }
  return headers;
}

async function sendVerificationCodeEmail(email) {
  try {
    // Frontend je hostovan na InfinityFree, a API funkcija na Vercelu.
    // Koristi se stabilni Production domen, ne deployment URL koji se mijenja.
    const apiUrl = 'https://your-gym-planner.vercel.app/api/request-verification';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: await getProtectedApiHeaders(),
      body: JSON.stringify({
        email
      })
    });

    // Odgovor se prvo čita kao tekst, jer proxy ili hosting ponekad vrati HTML
    // stranicu greške umjesto JSON-a.
    const rawResponse = await response.text();
    let result = null;

    if (rawResponse) {
      try {
        result = JSON.parse(rawResponse);
      } catch {
        // Ispod se prikazuje jasna poruka za odgovor koji nije JSON.
      }
    }

    if (!response.ok) {
      const errorMsg = result?.error?.message || result?.error || result?.message || rawResponse;
      console.error(`Server Vratio Grešku (${response.status}):`, errorMsg);
      const requestError = new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      if (response.status === 409 || result?.code === 'ACCOUNT_EXISTS') requestError.code = 'auth/email-already-in-use';
      throw requestError;
    }

    if (!result) {
      throw new Error('Vercel API nije vratio JSON odgovor. Provjerite Vercel Function Logs.');
    }

    if (result.success) {
      console.log('Verifikacioni e-mail je uspješno poslan!');
      return result;
    } else {
      console.error('Greška sa Brevo servisa:', result.error);
      throw new Error('Brevo greška: ' + JSON.stringify(result.error));
    }
  } catch (error) {
    console.error('Mrežna ili server greška:', error);
    throw error;
  }
}
// The verification dialog can be reopened after a refresh. The password is
// intentionally never written to localStorage; the user re-enters it only if
// the browser was closed before confirmation.
window.openVerificationModal = function() {
  let modal = document.getElementById('verificationModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'verificationModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content text-center">
        <h3 style="font-size:1.2rem;font-weight:800;margin-bottom:8px;">🔑 Potvrdi email</h3>
        <p style="color:var(--text-muted);font-size:.85rem;line-height:1.45;margin-bottom:10px;">
          Kod važi 10 minuta. Ako zatvoriš aplikaciju, registraciju možeš nastaviti na ovom uređaju.
        </p>
        <p id="verification-info" class="verification-info" role="status" aria-live="polite"></p>
        <div id="verification-password-wrap" style="display:none;text-align:left;margin-bottom:10px;">
          <label style="display:block;font-weight:700;font-size:.82rem;margin-bottom:6px;">GymLeader lozinka</label>
          <input type="password" id="verify-password-input" class="custom-input" autocomplete="new-password" placeholder="Ponovo unesi lozinku">
          <small style="display:block;color:var(--text-muted);font-size:.72rem;margin-top:5px;">Lozinka se ne čuva na uređaju.</small>
        </div>
        <input type="text" id="verify-code-input" class="custom-input" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" style="text-align:center;font-size:1.5rem;letter-spacing:6px;" maxlength="6" placeholder="000000">
        <div id="verify-error" role="alert" aria-live="assertive" style="color:var(--danger);font-size:.85rem;margin:10px 0;display:none;"></div>
        <div style="display:flex;gap:10px;margin-top:12px;">
          <button class="btn" data-action="confirm-verification">Potvrdi registraciju</button>
          <button class="btn btn-secondary" data-action="close-modal" data-modal-id="verificationModal">Kasnije</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  const verificationInfo = document.getElementById('verification-info');
  if (verificationInfo) {
    const notice = translateUiText('Poslali smo šestocifreni kod na tvoju email adresu. Provjeri i Spam/Neželjenu poštu.');
    verificationInfo.textContent = `${notice} (${pendingVerification.email || ''})`;
  }
  const passwordWrap = document.getElementById('verification-password-wrap');
  if (passwordWrap) passwordWrap.style.display = pendingVerification.password ? 'none' : 'block';
  const codeInput = document.getElementById('verify-code-input');
  const passwordInput = document.getElementById('verify-password-input');
  if (codeInput) codeInput.value = '';
  if (passwordInput) passwordInput.value = '';
  const verifyError = document.getElementById('verify-error');
  if (verifyError) { verifyError.textContent = ''; verifyError.style.display = 'none'; }
  modal.style.display = 'flex';
  (pendingVerification.password ? codeInput : passwordInput)?.focus();
};

window.confirmVerificationCode = async function() {
  const inputCode = document.getElementById('verify-code-input')?.value.trim() || '';
  const verifyPassword = document.getElementById('verify-password-input')?.value || '';
  const verifyError = document.getElementById('verify-error');
  try {
    if (!/^\d{6}$/.test(inputCode)) throw new Error('Unesi tačno 6 cifara iz emaila.');
    const password = pendingVerification.password || verifyPassword;
    if (!isValidRegistrationPassword(password)) throw new Error('Unesi istu GymLeader lozinku koju si napravio pri registraciji.');
    pendingVerification.password = password;
    const response = await fetch('https://your-gym-planner.vercel.app/api/confirm-verification', {
      method: 'POST',
      headers: await getProtectedApiHeaders(),
      body: JSON.stringify({
        email: pendingVerification.email,
        password,
        name: pendingVerification.name,
        code: inputCode
      })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.customToken) {
      const verificationError = new Error('Email verification failed');
      verificationError.code = `verification/${response.status || 500}`;
      throw verificationError;
    }

    await signInWithCustomToken(auth, result.customToken);
    await auth.currentUser?.getIdToken(true);
    clearRegistrationDraft();
    pendingVerification = { email: '', name: '', password: '' };
    document.getElementById('verificationModal').style.display = 'none';
    document.getElementById('auth-form')?.reset();
    pendingNewUserOnboarding = true;
    try {
      const key = getNewUserOnboardingKey(auth.currentUser?.uid);
      if (key) localStorage.setItem(key, '1');
    } catch { /* The current page still keeps the in-memory marker. */ }
    ShowToast('Registracija uspješna! Prvo prihvati pravila i privatnost.', 'success', 'top');
  } catch (error) {
    if (verifyError) { verifyError.textContent = getFriendlyVerificationError(error); verifyError.style.display = 'block'; }
  }
};

window.openOnboardingModal = function() {
  let modal = document.getElementById('onboardingModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'onboardingModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content text-center">
        <div style="font-size:2rem;margin-bottom:8px;">🏋️</div>
        <h3 style="font-size:1.25rem;font-weight:900;margin:0 0 8px;">${escapeHtml(getDashboardGreeting())}</h3>
        <p style="color:var(--text-muted);font-size:.88rem;line-height:1.5;margin:0 auto 16px;max-width:340px;">
          Napravi svoj prvi plan treninga, izaberi vježbe i prati svaku kilažu i ponavljanje.
        </p>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button class="btn" data-action="start-onboarding">Napravi prvi plan →</button>
          <button class="btn btn-secondary" data-action="close-modal" data-modal-id="onboardingModal">Kasnije</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
};

let onboardingStep = 0;
let onboardingContext = '';

function renderOnboardingStep() {
  const modal = document.getElementById('onboardingModal');
  const content = modal?.querySelector('.modal-content');
  if (!content) return;
  const contextOptions = [
    ['gym', '🏋️', 'Treniram u teretani'],
    ['home', '🏠', 'Treniram kod kuće'],
    ['street', '🤸', 'Street workout'],
    ['other', '✨', 'Nešto drugo']
  ];
  const steps = [
    `<div class="onboarding-icon">🏋️</div><span class="onboarding-step-label">KORAK 1 OD 4</span><h3>${escapeHtml(getOnboardingGreeting())}</h3><p>GymLeader ti pomaže da napraviš svoje planove, pratiš kilaže i ponavljanja i vidiš napredak iz treninga u trening.</p>`,
    '<div class="onboarding-icon">📋</div><span class="onboarding-step-label">KORAK 2 OD 4</span><h3>Kako počinješ?</h3><div class="onboarding-mini-list"><div><b>1.</b><span><strong>Napravi plan</strong><small>Nazovi ga, na primjer, Noge ili Dan A.</small></span></div><div><b>2.</b><span><strong>Pokreni trening</strong><small>Upiši serije, kilaže, ponavljanja ili sekunde.</small></span></div><div><b>3.</b><span><strong>Sačuvaj rezultat</strong><small>Sljedeći put vidiš prošle podatke i PR.</small></span></div></div>',
    '<div class="onboarding-icon">🎯</div><span class="onboarding-step-label">KORAK 3 OD 4</span><h3>Šta najčešće treniraš?</h3><p>Ovo samo pomaže da ti prvi plan bude smislenije pripremljen. Možeš ga kasnije promijeniti.</p><div class="onboarding-context-grid">' + contextOptions.map(([value, icon, label]) => `<button type="button" class="onboarding-context ${onboardingContext === value ? 'is-selected' : ''}" data-action="onboarding-context" data-context="${value}"><span>${icon}</span><strong>${label}</strong></button>`).join('') + '</div>',
    `<div class="onboarding-icon">🚀</div><span class="onboarding-step-label">KORAK 4 OD 4</span><h3>${genderText('Spreman si za prvi plan', 'Spremna si za prvi plan', 'Spreman/na si za prvi plan')}</h3><p>Jedan plan predstavlja jedan trening koji možeš ponavljati više puta. Dodaj vježbe jednu po jednu i izaberi način praćenja.</p>`
  ];
  const back = onboardingStep > 0 ? '<button class="btn btn-secondary" data-action="onboarding-back">Nazad</button>' : '';
  const next = onboardingStep < 3 ? '<button class="btn" data-action="onboarding-next">Nastavi →</button>' : '<button class="btn" data-action="onboarding-create-plan">Napravi prvi plan →</button>';
  content.innerHTML = steps[onboardingStep] + '<div class="onboarding-actions">' + back + next + '<button class="onboarding-skip" data-action="close-modal" data-modal-id="onboardingModal">Kasnije</button></div>';
}

window.openOnboardingModal = function() {
  let modal = document.getElementById('onboardingModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'onboardingModal';
    modal.className = 'modal';
    modal.innerHTML = '<div class="modal-content text-center"></div>';
    document.body.appendChild(modal);
  }
  onboardingStep = 0;
  onboardingContext = localStorage.getItem('gym-onboarding-context-' + (currentUser?.uid || 'guest')) || '';
  renderOnboardingStep();
  modal.style.display = 'flex';
};

/*-- FIREBASE ENGINE & AUTH */
  import { TRANSLATIONS } from './translations.js';
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
  if (appCheckSiteKey) {
    // Local development only: opt in from this browser's DevTools.
    if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
        && localStorage.getItem('gym-app-check-debug') === 'true') {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
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
  let editingRoutineId = null;
  let pendingWorkoutsMemory = [];
  let pendingWorkoutsLoaded = false;
  let pendingDbPromise = null;
  let currentProfileData = null;
  let profileReadSucceeded = false;
  let profileRequiredEditMode = false;
  let bodyMeasurements = [];
  let bodyChartInstance = null;
  let pendingProfilePhotoImage = null;
  let profilePhotoZoom = 1;
  let profilePhotoOffsetX = 0;
  let profilePhotoOffsetY = 0;
  let profilePhotoDrag = null;
  let profileEmailCodeTarget = '';
  const HISTORY_CACHE_VERSION = 1;
  const LEGAL_DOCUMENT_VERSION = '2026-09-29';
  let deferredInstallPrompt = null;
  const PWA_INSTALL_DISMISSED_KEY = 'gymleader-install-dismissed-v1';

  const VALID_GENDER_VALUES = new Set(['male', 'female', 'unspecified']);
  const REQUIRED_PROFILE_FIELDS = ['gender', 'age', 'heightCm', 'weightKg', 'goal', 'trainingFrequency', 'trainingLocation', 'experienceLevel', 'sessionMinutes', 'targetMuscleGroups'];

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
    const name = currentProfileData?.fullName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'korisniče';
    return `${genderText('Dobrodošao', 'Dobrodošla', 'Dobro došao/la')}, ${name}!`;
  }

  function isProfileComplete(profile = currentProfileData) {
    if (!profile || !VALID_GENDER_VALUES.has(profile.gender)) return false;
    const numericRanges = {
      age: [13, 100], heightCm: [100, 250], weightKg: [25, 400],
      trainingFrequency: [0, 14], sessionMinutes: [10, 300]
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
      && profile.targetMuscleGroups.length > 0;
  }

  function showGenderProfileGateIfRequired() {
    const modal = document.getElementById('profile-required-modal');
    if (!modal || !currentUser || !profileReadSucceeded) return;
    const needsProfile = !isProfileComplete();
    modal.style.display = needsProfile ? 'flex' : 'none';
    if (needsProfile) {
      profileRequiredEditMode = false;
      const close = document.getElementById('profile-required-close');
      const button = document.querySelector('[data-action="save-required-profile"], [data-action="save-profile-details"]');
      if (close) close.style.display = 'none';
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

  // Firebase normally resolves quickly; this fallback prevents a network issue
  // from leaving the boot screen visible forever.
  window.setTimeout(hideAuthBootScreen, 7000);

  const defaultWorkouts = [
    { id: 'custom-extra', name: 'Poseban / Kardio Dan', emoji: '⚡', exercises: [] }
  ];

  function getEmojiForRoutine(name) {
    if (!name) return '⚡';
    const n = name.toLowerCase();
    if (n.includes('gornji') || n.includes('upper') || n.includes('grudi') || n.includes('prsa')) return '🏋️‍♂️';
    if (n.includes('donji') || n.includes('lower') || n.includes('noge') || n.includes('leg')) return '🦵';
    if (n.includes('kardio') || n.includes('cardio') || n.includes('trcanje')) return '🏃‍♂️';
    if (n.includes('ruke') || n.includes('biceps') || n.includes('triceps')) return '💪';
    if (n.includes('leda') || n.includes('back')) return '🥊';
    if (n.includes('ramena') || n.includes('shoulder')) return '🦾';
    return '⚡';
  }

  window.setRoutineEmoji = function(emoji) {
    const input = document.getElementById('newRoutineEmojiInput');
    if (input) input.value = emoji;
  };

  window.clearRoutineEmoji = function() {
    const input = document.getElementById('newRoutineEmojiInput');
    if (input) input.value = '';
  };

  window.toggleAuthMode = function(mode) {
    currentAuthMode = mode;
    const groupName = document.getElementById('group-name');
    const btnSubmit = document.getElementById('auth-submit-btn');
    const tabLogin = document.getElementById('tab-btn-login');
    const tabRegister = document.getElementById('tab-btn-register');
    const errorDiv = document.getElementById('auth-error');
    const socialText = document.getElementById('social-auth-text');
    const modeHint = document.getElementById('auth-mode-hint');
    const confirmGroup = document.getElementById('group-confirm-password');
    const passwordRules = document.getElementById('register-password-rules');
    const backToLogin = document.getElementById('auth-back-to-login');
    const loginActions = document.getElementById('auth-login-actions');
    const passwordInput = document.getElementById('auth-password');

    if (errorDiv) errorDiv.style.display = 'none';

    if (mode === 'register') {
      if (groupName) groupName.style.display = 'block';
      if (confirmGroup) confirmGroup.style.display = 'block';
      if (passwordRules) passwordRules.style.display = 'flex';
      if (backToLogin) backToLogin.style.display = 'block';
      if (loginActions) loginActions.style.display = 'none';
      if (passwordInput) {
        passwordInput.autocomplete = 'new-password';
        passwordInput.placeholder = 'Napravi lozinku za GymLeader';
      }
      if (btnSubmit) btnSubmit.innerText = 'Kreiraj Novi Nalog 🚀';
      if (tabLogin) tabLogin.classList.remove('is-active');
      if (tabRegister) tabRegister.classList.add('is-active');
      if (socialText) socialText.innerText = 'ili napravi nalog jednim klikom:';
      if (modeHint) modeHint.innerText = 'Napravi besplatan GymLeader nalog za svoje planove i napredak.';
    } else {
      if (groupName) groupName.style.display = 'none';
      if (confirmGroup) confirmGroup.style.display = 'none';
      if (passwordRules) passwordRules.style.display = 'none';
      if (backToLogin) backToLogin.style.display = 'none';
      if (loginActions) loginActions.style.display = 'block';
      if (passwordInput) {
        passwordInput.autocomplete = 'current-password';
        passwordInput.placeholder = 'Lozinka za GymLeader';
      }
      if (btnSubmit) btnSubmit.innerText = 'Prijavi Se na Nalog →';
      if (tabLogin) tabLogin.classList.add('is-active');
      if (tabRegister) tabRegister.classList.remove('is-active');
      if (socialText) socialText.innerText = 'ili se prijavi jednim klikom:';
      if (modeHint) modeHint.innerText = 'Unesi email i lozinku svog GymLeader naloga.';
    }
    updatePasswordRuleState();
    renderRegistrationResume();
  };

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

window.handleAuthSubmit = async function(e) {
  if (e && e.preventDefault) e.preventDefault();
  
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const nameEl = document.getElementById('auth-name');
  const name = nameEl ? nameEl.value.trim() : '';
  const errorDiv = document.getElementById('auth-error');
  
  if (errorDiv) errorDiv.style.display = 'none';

  try {
    if (currentAuthMode === 'register') {
      // 1. Generiši nasumični 6-cifreni kod
      if (password.length < 8) throw new Error('Lozinka mora imati najmanje 8 karaktera.');
      
      // 2. Sačuvaj podatke u privremeni objekat
      pendingVerification = {
        email,
        password,
        name,
        createdAt: Date.now()
      };

      // 3. Pošalji kod preko Brevo API-ja
      await sendVerificationCodeEmail(email);

      // 4. Prikaži modal / polje za unos verifikacionog koda
      openVerificationModal();
      ShowToast("Verifikacioni kod je poslat na vaš email! 📩");
    } else {
      // Prijava (Login)
      await signInWithEmailAndPassword(auth, email, password);
      const form = document.getElementById('auth-form');
      if (form) form.reset();
    }
  } catch (error) {
    console.error("Auth greška:", error);
    if (errorDiv) {
      errorDiv.style.display = 'block';
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorDiv.innerText = 'Ovaj e-mail je već registrovan. Prijavite se.';
          break;
        case 'auth/weak-password':
          errorDiv.innerText = 'Lozinka mora imati najmanje 8 karaktera.';
          break;
        default:
          errorDiv.innerText = 'Greška pri registraciji: ' + error.message;
      }
    }
  }
};

  // Registration flow is defined here after the legacy handler so older cached
  // pages cannot bypass the confirmation and password checks below.
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
        ShowToast('Verifikacioni kod je poslat na tvoj email. 📩');
        return;
      }

      if (!email || !password) throw new Error('Unesi email i GymLeader lozinku.');
      await signInWithEmailAndPassword(auth, email, password);
      document.getElementById('auth-form')?.reset();
    } catch (error) {
      console.error('Auth greška:', error);
      if (!errorDiv) return;
      errorDiv.style.display = 'block';
      if (error?.code === 'auth/invalid-credential' || error?.code === 'auth/invalid-login-credentials') {
        errorDiv.textContent = 'Email ili lozinka nisu tačni. Ako još nemaš GymLeader nalog, prvo se registruj.';
      } else if (error?.code === 'auth/email-already-in-use') {
        errorDiv.textContent = 'Ovaj email je već registrovan. Izaberi Prijavi se.';
      } else if (error?.code === 'auth/too-many-requests') {
        errorDiv.textContent = 'Previše pokušaja. Sačekaj malo pa pokušaj ponovo.';
      } else if (error?.code === 'auth/network-request-failed') {
        errorDiv.textContent = 'Nema internet veze. Provjeri vezu i pokušaj ponovo.';
      } else {
        errorDiv.textContent = currentAuthMode === 'register'
          ? 'Registracija trenutno nije uspjela. Provjeri podatke i pokušaj ponovo.'
          : 'Email ili lozinka nisu tačni. Ako još nemaš GymLeader nalog, prvo se registruj.';
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
      ShowToast('Google prijava trenutno nije uspjela. Pokušaj ponovo.', 'error');
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

  function showLegalAcceptanceIfRequired() {
    if (!currentUser) return;
    const accepted = currentProfileData?.termsVersion === LEGAL_DOCUMENT_VERSION
      && currentProfileData?.privacyVersion === LEGAL_DOCUMENT_VERSION;
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
      document.getElementById('legal-acceptance-modal').style.display = 'none';
      ShowToast('Hvala — možeš nastaviti u GymLeader.');
    } catch (error) {
      console.error('Legal acceptance diagnostic:', error);
      if (status) {
        status.textContent = 'Potvrdu trenutno nije moguće sačuvati. Provjeri internet i pokušaj ponovo.';
        status.style.color = 'var(--danger)';
      }
    } finally {
      if (button) { button.textContent = 'Prihvati i nastavi'; updateLegalAcceptanceButton(); }
    }
  };

  onAuthStateChanged(auth, async (user) => {
    const loginBtn = document.getElementById('login-modal-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const bottomNav = document.getElementById('bottom-nav');
    const mailDisplay = document.getElementById('user-email-display');

    if (user) {
      currentUser = user;
      
      if (bottomNav) bottomNav.style.display = 'flex';
      if (loginBtn) loginBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      
      if (mailDisplay) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          profileReadSucceeded = true;
          currentProfileData = userDoc.exists() ? userDoc.data() : null;
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
      showGenderProfileGateIfRequired();

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
      if (loginBtn) loginBtn.style.display = 'inline-block';
      switchTab('login');
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
    const indexMap = { dashboard: 0, workouts: 1, analytics: 2, body: 2, history: 2, progress: 2, settings: 3 };
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

  window.renderWorkouts = function() {
    const container = document.getElementById('workout-list');
    if (!container) return;
    if (currentUser && userRoutines.length > 0) writeRoutineCache(currentUser.uid, userRoutines);

    let html = `
      <div class="routine-toolbar">
        <button class="btn btn-purple routine-create-button" data-action="open-create-routine">
          ➕ Napravi plan treninga
        </button>
        ${userRoutines.length > 0 ? `
          <button class="btn ${routineEditMode ? 'btn-purple' : 'btn-secondary'} routine-edit-button" data-action="toggle-routine-edit-mode">
            ${routineEditMode ? '✓ Gotovo' : '✎ Uredi planove'}
          </button>
        ` : ''}
      </div>
    `;

    if (userRoutines.length === 0) {
      html += `
        <div class="card routine-empty-state">
          <p class="routine-empty-title">Još nemaš plan treninga.</p>
          <p class="routine-empty-text">Napravi svoj prvi plan, nazovi ga kako želiš i dodaj vježbe.</p>
        </div>
      `;
    } else {
      html += userRoutines.map(w => {
        const emoji = w.emoji || getEmojiForRoutine(w.name);
        const exCount = w.exercises ? w.exercises.length : 0;
        return `
          <div class="card flex-between">
            <div>
              <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 4px;">${escapeHtml(emoji)} ${escapeHtml(w.name)}</h3>
              <p style="color: var(--text-muted); font-size: 0.85rem;">
                ${exCount > 0 ? exCount + ' vježbi' : 'Prazan trening - sam dodaj vježbe'}
              </p>
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

    container.innerHTML = html;
  };

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
    window.renderWorkouts();
  };

  window.openEditRoutineModal = function(routineId) {
    const routine = userRoutines.find((item) => item.id === routineId);
    if (!routine) return;

    editingRoutineId = routine.id;
    document.getElementById('editRoutineEmojiInput').value = routine.emoji || getEmojiForRoutine(routine.name);
    document.getElementById('editRoutineNameInput').value = routine.name || '';
    document.getElementById('editRoutineExercisesInput').value = (routine.exercises || [])
      .map((exercise) => typeof exercise === 'string' ? exercise : (exercise?.name || ''))
      .filter(Boolean)
      .join('\n');
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
    const exercises = document.getElementById('editRoutineExercisesInput').value
      .split('\n')
      .map((exercise) => exercise.trim())
      .filter(Boolean);

    if (!name) {
      ShowToast('Naziv plana je obavezan.', 'error');
      return;
    }

    try {
      await updateDoc(doc(db, 'routines', editingRoutineId), {
        emoji: emoji || getEmojiForRoutine(name),
        name,
        exercises
      });
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

  window.openCreateRoutineModal = function() {
    if (!currentUser) {
      ShowToast("Morate biti prijavljeni!", 'error');
      return;
    }
    document.getElementById('newRoutineEmojiInput').value = '';
    document.getElementById('newRoutineNameInput').value = '';
    resetRoutineExerciseBuilder();
    document.getElementById('createRoutineModal').style.display = 'flex';
  };

  function resetRoutineExerciseBuilder() {
    const list = document.getElementById('new-routine-exercises-list');
    if (!list) return;
    list.innerHTML = '';
    addRoutineExerciseRow();
  }

  function addRoutineExerciseRow(name = '', measurementType = 'weight_reps') {
    const list = document.getElementById('new-routine-exercises-list');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'routine-exercise-row';
    row.innerHTML = `
      <input class="custom-input routine-exercise-name" type="text" maxlength="100" placeholder="npr. Čučanj ili Plank" value="${escapeHtml(name)}">
      <select class="custom-input routine-exercise-type" aria-label="Tip praćenja vježbe">
        <option value="weight_reps" ${measurementType === 'weight_reps' ? 'selected' : ''}>Kilaža + ponavljanja</option>
        <option value="reps" ${measurementType === 'reps' ? 'selected' : ''}>Samo ponavljanja</option>
        <option value="seconds" ${measurementType === 'seconds' ? 'selected' : ''}>Trajanje u sekundama</option>
        <option value="cardio" ${measurementType === 'cardio' ? 'selected' : ''}>Kardio</option>
      </select>
      <button type="button" class="routine-remove-exercise" data-action="remove-routine-exercise" aria-label="Ukloni vježbu">×</button>
    `;
    list.appendChild(row);
  }

  window.addRoutineExercise = function() {
    addRoutineExerciseRow();
    document.querySelector('#new-routine-exercises-list .routine-exercise-row:last-child .routine-exercise-name')?.focus();
  };

  window.removeRoutineExercise = function(button) {
    const list = document.getElementById('new-routine-exercises-list');
    const row = button?.closest('.routine-exercise-row');
    if (!list || !row) return;
    if (list.querySelectorAll('.routine-exercise-row').length <= 1) {
      row.querySelector('.routine-exercise-name').value = '';
      row.querySelector('.routine-exercise-type').value = 'weight_reps';
      return;
    }
    row.remove();
  };

  window.submitNewRoutine = async function() {
    const emojiInput = document.getElementById('newRoutineEmojiInput').value.trim();
    const nameInput = document.getElementById('newRoutineNameInput').value.trim();

    if (!nameInput) {
      ShowToast("Unesite naziv plana!", 'error');
      return;
    }

    const exercises = Array.from(document.querySelectorAll('#new-routine-exercises-list .routine-exercise-row'))
      .map((row) => ({
        name: row.querySelector('.routine-exercise-name')?.value.trim() || '',
        measurementType: row.querySelector('.routine-exercise-type')?.value || 'weight_reps'
      }))
      .filter((exercise) => exercise.name.length > 0);
    if (exercises.length === 0) {
      ShowToast('Dodaj bar jednu vježbu u plan.', 'error');
      return;
    }
    const finalEmoji = emojiInput || getEmojiForRoutine(nameInput);

    const newRoutine = {
      userId: currentUser.uid,
      emoji: finalEmoji,
      name: nameInput,
      exercises,
      createdAt: new Date().toISOString()
    };

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

      if (isCardio) {
        draft.exercises.push({
          name,
          isCardio: true,
          minutes: b.getAttribute('data-minutes'),
          calories: b.getAttribute('data-calories'),
          notes
        });
      } else {
        const sets = [];
        const isDuration = isDurationExercise(name);
        b.querySelectorAll('.set-row').forEach((row, idx) => {
          if (idx === 0) return;
          if (isDuration) {
            sets.push({ seconds: row.querySelector('.set-seconds')?.value || '' });
          } else {
            sets.push({
              weight: row.querySelector('.set-kg')?.value || '',
              reps: row.querySelector('.set-reps')?.value || ''
            });
          }
        });
        draft.exercises.push({ name, sets, notes });
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
      const measurementType = getExerciseMeasurementType(ex, exName);
      const maxW = getMaxWeightFromHistory(exName);
      const targetGoal = calculateTargetGoal(exName);
      let prevLogStr = 'Nema prošlog zapisa';
      let prevNote = '';
      for (let i = 0; i < cachedHistory.length; i++) {
        const pastEx = cachedHistory[i].exercises?.find((item) => item.name === exName);
        if (pastEx) {
          if (pastEx.sets && pastEx.sets.length > 0) {
            prevLogStr = pastEx.sets.map((set) => formatSetPerformance(set, exName)).join(' | ');
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
        card.setAttribute('data-minutes', ex.minutes || '0');
        card.setAttribute('data-calories', ex.calories || '0');

        card.innerHTML = `
          <div class="flex-between">
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--accent-purple);">${escapeHtml(exName)} 🏃‍♂️</h3>
            <button class="btn-remove-ex" style="display:none;" data-action="remove-exercise">Ukloni 🗑️</button>
          </div>
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

        card.innerHTML = `
          <div class="flex-between">
            <h3 style="font-size: 1.15rem; font-weight: 800;">${escapeHtml(ex.name)}</h3>
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
    return isDurationExercise(typeof exercise === 'string' ? exercise : fallbackName) ? 'seconds' : 'weight_reps';
  }

  function formatSetPerformance(set, exName) {
    if (isDurationExercise(exName)) {
      return `${set.seconds ?? set.weight ?? 0} sek`;
    }
    if (set.weight === undefined || set.weight === null || set.weight === '') {
      return `${set.reps ?? 0} pon`;
    }
    return `${set.weight ?? 0}kg × ${set.reps ?? 0}`;
  }

  function calculateTargetGoal(exName) {
    for (let i = 0; i < cachedHistory.length; i++) {
      const pastEx = cachedHistory[i].exercises?.find(e => e.name === exName);
      if (pastEx && pastEx.sets && pastEx.sets.length >= 3) {
        const s1 = pastEx.sets[0];
        const s2 = pastEx.sets[1];
        const s3 = pastEx.sets[2];

        if (isDurationExercise(exName)) {
          const previousSeconds = [s1, s2, s3].map((set) => parseInt(set.seconds ?? set.weight, 10) || 0);
          const nextSeconds = previousSeconds[0] + 5;
          if (getCurrentLanguage() === 'en') return `🎯 Today's goal: Try ${nextSeconds} seconds (Last time: ${previousSeconds.join('/')} sec)`;
          if (getCurrentLanguage() === 'de') return `🎯 Heutiges Ziel: Versuche ${nextSeconds} Sekunden (Letztes Mal: ${previousSeconds.join('/')} Sek.)`;
          return `🎯 Cilj danas: Pokušaj ${nextSeconds} sekundi (Prošli put: ${previousSeconds.join('/')} sek)`;
        }
        
        if (s1.reps >= 12 && s2.reps >= 12 && s3.reps >= 12) {
          if (getCurrentLanguage() === 'en') return `🎯 Today's goal: INCREASE WEIGHT to ${s1.weight + 2.5}kg! (Completed ${s1.weight}kg × 12/12/12)`;
          if (getCurrentLanguage() === 'de') return `🎯 Heutiges Ziel: GEWICHT auf ${s1.weight + 2.5}kg ERHÖHEN! (Geschafft: ${s1.weight}kg × 12/12/12)`;
          return `🎯 Cilj danas: POVEĆAJ KILAŽU na ${s1.weight + 2.5}kg! (Ispunjeno ${s1.weight}kg × 12/12/12)`;
        } else {
          if (getCurrentLanguage() === 'en') return `🎯 Today's goal: Try 12/12/12 at ${s1.weight}kg (Last time: ${s1.reps}/${s2.reps}/${s3.reps})`;
          if (getCurrentLanguage() === 'de') return `🎯 Heutiges Ziel: Versuche 12/12/12 mit ${s1.weight}kg (Letztes Mal: ${s1.reps}/${s2.reps}/${s3.reps})`;
          return `🎯 Cilj danas: Pokušaj 12/12/12 sa ${s1.weight}kg (Prošli put: ${s1.reps}/${s2.reps}/${s3.reps})`;
        }
      }
    }
    return null;
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
      const measurementType = getExerciseMeasurementType(ex, exName);
      const isDuration = measurementType === 'seconds';
      if (measurementType === 'cardio') {
        return `
          <div class="card exercise-block custom-cardio-block" data-name="${escapeHtml(exName)}" data-is-cardio="true" data-measurement-type="cardio" data-minutes="${escapeHtml(ex.minutes || '')}" data-calories="${escapeHtml(ex.calories || '')}">
            <div class="flex-between"><h3 style="font-size:1.15rem;font-weight:800;color:var(--accent-purple);">${escapeHtml(exName)} 🏃</h3><button class="btn-remove-ex" style="display:none;" data-action="remove-exercise">Ukloni 🗑️</button></div>
            <div class="cardio-input-grid"><label>Minute<input type="number" class="custom-input cardio-minutes" min="0" step="1" value="${escapeHtml(ex.minutes || '')}" placeholder="0"></label><label>Kalorije<input type="number" class="custom-input cardio-calories" min="0" step="1" value="${escapeHtml(ex.calories || '')}" placeholder="opcionalno"></label></div>
            <input type="text" class="note-input ex-note" value="${escapeHtml(ex.notes || '')}" placeholder="📝 Napomena (opcionalno)...">
          </div>
        `;
      }
      let prevLogStr = 'Nema prošlog zapisa';
      let prevNote = '';
      const maxW = getMaxWeightFromHistory(exName);
      const targetGoal = calculateTargetGoal(exName);
      
      for (let i = 0; i < cachedHistory.length; i++) {
        const pastEx = cachedHistory[i].exercises?.find(e => e.name === exName);
        if (pastEx) {
          if (pastEx.sets && pastEx.sets.length > 0) {
            prevLogStr = pastEx.sets.map(s => formatSetPerformance(s, exName)).join(' | ');
          } else if (pastEx.minutes) {
            prevLogStr = `${pastEx.minutes} min` + (pastEx.calories ? ` · ${pastEx.calories} kcal` : '');
          }
          if (pastEx.notes) prevNote = pastEx.notes;
          break;
        }
      }

      return `
          <div class="card exercise-block" data-name="${escapeHtml(exName)}" data-maxw="${escapeHtml(maxW)}" data-measurement-type="${measurementType}">
          <div class="flex-between">
            <h3 style="font-size: 1.15rem; font-weight: 800;">${escapeHtml(exName)}</h3>
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
      addSetRowToBlock(block.querySelector('.btn-secondary'));
      addSetRowToBlock(block.querySelector('.btn-secondary'));
      addSetRowToBlock(block.querySelector('.btn-secondary'));
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
  }

  async function syncPendingWorkouts() {
    if (!currentUser || !navigator.onLine) return;
    const queue = pendingWorkoutsMemory.filter((item) => item.userId === currentUser.uid);
    if (queue.length === 0) return;
    renderPendingSyncStatus();

    const remaining = [];
    let syncedCount = 0;
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
    renderPendingSyncStatus();
    if (syncedCount > 0) {
      await loadCloudData();
      ShowToast(remaining.length ? `Sinhronizovano: ${syncedCount}. Čeka još: ${remaining.length}.` : 'Trening sinhronizovan sa Cloudom.');
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
    const workoutData = { 
      userId: currentUser.uid,
      userEmail: currentUser.email,
      name: currentWorkout ? currentWorkout.name : "Trening", 
      date: new Date().toISOString(), 
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
        cachedHistory.push(data);
      }
    });
    writeHistoryCache(currentUser.uid, cachedHistory);
    checkDraftState();
    renderDashboard();
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
        contentHtml = ex.sets.map(s => `<span style="background: rgba(255,255,255,0.06); border: 1px solid var(--bg-card-border); padding: 4px 10px; border-radius: 8px; font-size: 0.8rem; font-weight: 800; color: #fff;">${escapeHtml(formatSetPerformance(s, ex.name))}</span>`).join(' ');
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
            exercises: [...currentExercises]
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
          contentHtml = ex.sets.map(s => `<span style="background: rgba(255,255,255,0.06); border: 1px solid var(--bg-card-border); padding: 4px 10px; border-radius: 8px; font-size: 0.8rem; font-weight: 800; color: #fff;">${escapeHtml(formatSetPerformance(s, ex.name))}</span>`).join(' ');
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

      return `
        <div class="card" style="border-left: 4px solid var(--primary);">
          <div class="flex-between" style="margin-bottom: 6px;">
            <strong style="font-size: 1.15rem; font-weight: 800;">${escapeHtml(h.name || 'Trening')}</strong>
            <span class="badge">${dateStr}</span>
          </div>
          ${exercisesHtml}
        </div>
      `;
    }).join('');
  }

  function setupAnalyticsUI() {
    const select = document.getElementById('analytics-ex-select');
    if (!select) return;
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
        plugins: { legend: { labels: { color: '#f8fafc', font: { family: 'Plus Jakarta Sans' } } }, tooltip: { callbacks: { title: (items) => reversedHistory[items[0]?.dataIndex] ? formatDateClean(reversedHistory[items[0].dataIndex].date, true) : '' } } }
      }
    });
  };

  window.ShowToast = function(message, type = 'success') {
    let toast = document.getElementById('custom-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'custom-toast';
      toast.className = 'toast-notification';
      document.body.appendChild(toast);
    }
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

  async function loadBodyMeasurements() {
    if (!currentUser) return;
    if (!bodyTrackingEnabled()) {
      bodyMeasurements = [];
      renderBodyMeasurements();
      return;
    }
    try {
      const snapshot = await getDocs(query(collection(db, 'bodyMeasurements'), where('userId', '==', currentUser.uid)));
      bodyMeasurements = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((a, b) => String(b.measuredAt).localeCompare(String(a.measuredAt)));
      renderBodyMeasurements();
    } catch (error) {
      console.error('Body measurements load diagnostic:', error);
      const status = document.getElementById('body-measurements-status');
      if (status) status.textContent = 'Mjerenja trenutno nije moguće učitati.';
    }
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
      const defs = [
        { key:'chestCm', label:'Grudi', side:'left', pos:'chest' }, { key:'armCm', label:'Ruka', side:'right', pos:'arm' },
        { key:'waistCm', label:'Struk', side:'left', pos:'waist' }, { key:'hipsCm', label:'Kukovi', side:'right', pos:'hips' },
        { key:'legCm', label:'Noga', side:'left', pos:'legs' }
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
    const list=document.getElementById('body-measurements-list');
    if(list) list.innerHTML=bodyMeasurements.slice(0,12).map(x=>`<li><strong>${escapeHtml(formatDateClean(x.measuredAt))}</strong><span>${x.weightKg!=null?`${x.weightKg} kg`:''}${x.waistCm!=null?` · struk ${x.waistCm} cm`:''}</span></li>`).join('')||'<li class="body-empty-state">Nema sačuvanih mjerenja.</li>';
    renderBodyChart();
  }

  function renderBodyChart() {
    const canvas = document.getElementById('body-weight-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (bodyChartInstance) bodyChartInstance.destroy();
    const metric = document.getElementById('body-metric-select')?.value || 'weightKg';
    const labels = { weightKg: 'Težina (kg)', waistCm: 'Struk (cm)', chestCm: 'Grudi (cm)', armCm: 'Ruka (cm)', legCm: 'Noga (cm)', hipsCm: 'Kukovi (cm)' };
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
    const date = document.getElementById('body-measured-at');
    if (date && !date.value) date.value = new Date().toISOString().slice(0, 10);
    document.getElementById('body-measurement-modal')?.style.setProperty('display', 'flex');
  };

  window.saveBodyMeasurement = async function() {
    if (!currentUser || !bodyTrackingEnabled()) return;
    const fields = { weightKg: 'body-weight', waistCm: 'body-waist', chestCm: 'body-chest', armCm: 'body-arm', legCm: 'body-leg', hipsCm: 'body-hips' };
    const data = { userId: currentUser.uid, measuredAt: document.getElementById('body-measured-at')?.value || new Date().toISOString().slice(0, 10), note: document.getElementById('body-note')?.value.trim() || '' };
    Object.entries(fields).forEach(([key, id]) => { const value = Number(document.getElementById(id)?.value); if (Number.isFinite(value) && value > 0) data[key] = value; });
    if (Object.keys(data).filter((key) => ['weightKg', 'waistCm', 'chestCm', 'armCm', 'legCm', 'hipsCm'].includes(key)).length === 0) { ShowToast('Unesi barem jednu vrijednost.', 'error'); return; }
    const button = document.querySelector('[data-action="save-body-measurement"]');
    if (button) { button.disabled = true; button.textContent = 'Čuvam…'; }
    try {
      await addDoc(collection(db, 'bodyMeasurements'), data);
      bodyMeasurements.unshift({ id: `local-${Date.now()}`, ...data });
      document.getElementById('body-measurement-modal').style.display = 'none';
      document.querySelectorAll('#body-measurement-modal input, #body-measurement-modal textarea').forEach((input) => { if (input.type !== 'date') input.value = ''; });
      renderBodyMeasurements();
      ShowToast('Mjerenje je sačuvano.');
    } catch (error) {
      console.error('Body measurement save diagnostic:', error);
      ShowToast('Mjerenje nije moguće sačuvati. Provjeri internet i pokušaj ponovo.', 'error');
    } finally { if (button) { button.disabled = false; button.textContent = 'Sačuvaj mjerenje'; } }
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

  function populateRequiredProfileForm() {
    const profile = currentProfileData || {};
    const values = {
      'required-profile-name': profile.fullName || currentUser?.displayName || '',
      'required-profile-age': profile.age ?? '',
      'required-profile-height': profile.heightCm ?? '',
      'required-profile-weight': profile.weightKg ?? '',
      'required-profile-frequency': profile.trainingFrequency ?? '',
      'required-profile-minutes': profile.sessionMinutes ?? ''
    };
    Object.entries(values).forEach(([id, value]) => {
      const input = document.getElementById(id);
      if (input && document.activeElement !== input) input.value = value;
    });
    document.querySelectorAll('input[name="required-profile-gender"]').forEach((input) => { input.checked = input.value === profile.gender; });
    document.querySelectorAll('input[name="required-profile-location"]').forEach((input) => { input.checked = input.value === profile.trainingLocation; });
    const goal = document.getElementById('required-profile-goal');
    const experience = document.getElementById('required-profile-experience');
    if (goal) {
      const legacyGoal = profile.goal;
      goal.value = legacyGoal === 'gain_muscle' || legacyGoal === 'increase_strength' || legacyGoal === 'general_fitness' ? 'maintain' : (legacyGoal || '');
    }
    const focus = document.getElementById('required-profile-focus');
    if (focus) focus.value = profile.trainingFocus || (profile.goal === 'increase_strength' ? 'strength' : profile.goal === 'general_fitness' ? 'general_fitness' : profile.goal === 'gain_muscle' ? 'muscle_progress' : '');
    if (experience) experience.value = profile.experienceLevel || '';
    const muscleGroups = new Set(Array.isArray(profile.targetMuscleGroups) ? profile.targetMuscleGroups : []);
    document.querySelectorAll('input[name="required-profile-muscles"]').forEach((input) => { input.checked = muscleGroups.has(input.value); });
  }

  window.openProfileDetailsEditor = function() {
    if (!currentUser) return;
    profileRequiredEditMode = true;
    populateRequiredProfileForm();
    const modal = document.getElementById('profile-required-modal');
    const close = document.getElementById('profile-required-close');
    const button = document.querySelector('[data-action="save-required-profile"], [data-action="save-profile-details"]');
    if (close) close.style.display = 'block';
    if (button) { button.dataset.action = 'save-profile-details'; button.textContent = 'Sačuvaj promjene'; }
    const status = document.getElementById('profile-required-status');
    if (status) { status.textContent = ''; status.style.color = ''; }
    if (modal) modal.style.display = 'flex';
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
      goal: document.getElementById('required-profile-goal')?.value || '',
      trainingFocus: document.getElementById('required-profile-focus')?.value || '',
      trainingFrequency: Number(document.getElementById('required-profile-frequency')?.value),
      trainingLocation: document.querySelector('input[name="required-profile-location"]:checked')?.value || '',
      experienceLevel: document.getElementById('required-profile-experience')?.value || '',
      sessionMinutes: Number(document.getElementById('required-profile-minutes')?.value),
      targetMuscleGroups: normalizedMuscles
    };
  }

  window.saveRequiredProfile = async function() {
    if (!currentUser) return;
    const status = document.getElementById('profile-required-status');
    const button = document.querySelector('[data-action="save-required-profile"]');
    const profileValues = readRequiredProfileForm();
    const errors = [];
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
      document.getElementById('profile-required-modal').style.display = 'none';
      profileRequiredEditMode = false;
      renderProfileSettings();
      renderDashboard();
      ShowToast('Profil je sačuvan. GymLeader je spreman.');
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
    const prefixes = ['gym_routines_cache_v', 'gym_history_cache_v', 'gym_profile_photo_v', 'gym_pending_workouts_v'];
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

  function localizeElement(element) {
    if (!(element instanceof Element)) return;
    for (const attribute of ['placeholder', 'title', 'aria-label', 'alt']) {
      if (element.hasAttribute(attribute)) {
        const original = element.getAttribute(attribute);
        const translated = translateUiText(original);
        if (translated !== original) element.setAttribute(attribute, translated);
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
      const translated = translateUiText(node.nodeValue);
      if (translated !== node.nodeValue) node.nodeValue = translated;
    }
  }

  function observeLocalization() {
    const observer = new MutationObserver((changes) => {
      if (getCurrentLanguage() === 'sr') return;
      changes.forEach((change) => {
        if (change.type === 'characterData') {
          const parent = change.target.parentElement;
          if (parent && !parent.closest('script, style, textarea, option, code')) {
            const translated = translateUiText(change.target.nodeValue);
            if (translated !== change.target.nodeValue) change.target.nodeValue = translated;
          }
        }
        change.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) localizeSubtree(node);
          if (node.nodeType === Node.TEXT_NODE) {
            const translated = translateUiText(node.nodeValue);
            if (translated !== node.nodeValue) node.nodeValue = translated;
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function showLanguageLoading(language) {
    const loader = document.getElementById('language-loading');
    if (!loader) return;
    const copy = {
      sr: ['Učitavanje jezika…', 'Pripremamo aplikaciju za tebe.'],
      en: ['Loading language…', 'Preparing the app for you.'],
      de: ['Sprache wird geladen…', 'Die App wird vorbereitet.']
    }[language] || ['Učitavanje jezika…', 'Pripremamo aplikaciju za tebe.'];
    document.getElementById('language-loading-title').textContent = copy[0];
    document.getElementById('language-loading-text').textContent = copy[1];
    loader.hidden = false;
  }

  function changeAppLanguage(language) {
    const selectedLanguage = ['sr', 'en', 'de'].includes(language) ? language : 'sr';
    if (selectedLanguage === getCurrentLanguage()) return;
    localStorage.setItem('gym-language', selectedLanguage);
    showLanguageLoading(selectedLanguage);
    window.setTimeout(() => window.location.reload(), 360);
  }

  function applyLanguage(language) {
    const selectedLanguage = ['sr', 'en', 'de'].includes(language) ? language : 'sr';
    document.documentElement.lang = selectedLanguage === 'sr' ? 'sr-Latn' : selectedLanguage;
    localStorage.setItem('gym-language', selectedLanguage);
    document.querySelectorAll('.language-option').forEach((button) => {
      button.classList.toggle('active', button.dataset.language === selectedLanguage);
      button.setAttribute('aria-pressed', String(button.dataset.language === selectedLanguage));
    });
    const status = document.getElementById('language-settings-status');
    if (status) status.textContent = selectedLanguage === 'sr' ? 'Odabran je srpski jezik.' : selectedLanguage === 'en' ? 'English selected.' : 'Deutsch ausgewählt.';
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
    applyLanguage(localStorage.getItem('gym-language') || 'sr');
    localizeSubtree();
    observeLocalization();
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
    window.addEventListener('online', syncPendingWorkouts);

    document.getElementById('delete-account-modal')?.addEventListener('input', updateDeleteAccountButton);
    document.getElementById('delete-account-modal')?.addEventListener('change', updateDeleteAccountButton);
    document.getElementById('accept-terms-checkbox')?.addEventListener('change', updateLegalAcceptanceButton);
    document.getElementById('accept-privacy-checkbox')?.addEventListener('change', updateLegalAcceptanceButton);
    document.getElementById('gender-required-modal')?.addEventListener('change', () => updateGenderSaveButton('required-gender-option', 'save-required-gender'));
    document.getElementById('settings-gender-modal')?.addEventListener('change', () => updateGenderSaveButton('profile-gender-option', 'save-profile-gender'));
    document.getElementById('profile-required-modal')?.addEventListener('change', (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.name !== 'required-profile-muscles') return;
      const all = document.querySelector('input[name="required-profile-muscles"][value="full_body"]');
      const individual = [...document.querySelectorAll('input[name="required-profile-muscles"]')].filter((item) => item.value !== 'full_body');
      if (input.value === 'full_body' && input.checked) individual.forEach((item) => { item.checked = true; });
      if (input.value === 'full_body' && !input.checked) individual.forEach((item) => { item.checked = false; });
      if (input.value !== 'full_body' && !input.checked && all) all.checked = false;
    });

    setupTouchReorder();

    const analyticsSelect = document.getElementById('analytics-ex-select');
    if (analyticsSelect) analyticsSelect.addEventListener('change', window.renderAnalyticsChart);
    document.getElementById('analytics-metric-select')?.addEventListener('change', window.renderAnalyticsChart);
    document.getElementById('analytics-period-select')?.addEventListener('change', window.renderAnalyticsChart);
    document.getElementById('body-metric-select')?.addEventListener('change', renderBodyMeasurements);
    document.getElementById('body-auto-progress')?.addEventListener('change', (event) => {
      if (event.target?.id !== 'body-manual-metric-select' || !currentUser) return;
      localStorage.setItem(`gym-body-selected-metric-v1-${currentUser.uid}`, event.target.value);
      renderBodyMeasurements();
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
        case 'auth-mode':
          window.toggleAuthMode(button.dataset.mode);
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
          setTimeout(() => window.openCreateRoutineModal(), 150);
          break;
        case 'resume-draft':
          window.resumeDraftWorkout();
          break;
        case 'open-import-modal':
          document.getElementById('importNotesModal').style.display = 'flex';
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
        case 'save-profile-details':
          window.saveProfileDetails();
          break;
        case 'open-profile-details-editor':
          window.openProfileDetailsEditor();
          break;
        case 'open-body-measurement-modal':
          window.openBodyMeasurementModal();
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
          if (modalId) document.getElementById(modalId).style.display = 'none';
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
          window.addRoutineExercise();
          break;
        case 'remove-routine-exercise':
          window.removeRoutineExercise(button);
          break;
        case 'open-create-routine':
          window.openCreateRoutineModal();
          break;
        case 'toggle-routine-edit-mode':
          window.toggleRoutineEditMode();
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
    navigator.serviceWorker.register('/sw.js?v=20260930-body-anatomy-22', { scope: '/' })
      .then((registration) => registration.update())
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
      throw new Error(`Slanje koda nije uspjelo (${response.status}): ${typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)}`);
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
// Otvaranje modala za unos koda
window.openVerificationModal = function() {
  let modal = document.getElementById('verificationModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'verificationModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content text-center">
        <h3 style="font-size: 1.2rem; font-weight: 800; margin-bottom: 8px;">🔑 Unesite Verifikacioni Kod</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 14px;">
          Poslali smo 6-cifreni kod na <strong>${escapeHtml(pendingVerification.email)}</strong>
        </p>
        <input type="text" id="verify-code-input" class="custom-input" style="text-align: center; font-size: 1.5rem; letter-spacing: 6px;" maxlength="6" placeholder="000000">
        <div id="verify-error" style="color: var(--danger); font-size: 0.85rem; margin-bottom: 10px; display: none;"></div>
        <div style="display: flex; gap: 10px; margin-top: 12px;">
          <button class="btn" data-action="confirm-verification">Potvrdi i Registruj Se</button>
          <button class="btn btn-secondary" data-action="close-modal" data-modal-id="verificationModal">Otkaži</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
};

// Potvrda unesenog koda i konačna registracija na Firebase
window.confirmVerificationCode = async function() {
  const inputCode = document.getElementById('verify-code-input').value.trim();
  const verifyError = document.getElementById('verify-error');

  try {
    const response = await fetch('https://your-gym-planner.vercel.app/api/confirm-verification', {
      method: 'POST',
      headers: await getProtectedApiHeaders(),
      body: JSON.stringify({
        email: pendingVerification.email,
        password: pendingVerification.password,
        name: pendingVerification.name,
        code: inputCode
      })
    });
    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.customToken) {
      throw new Error(result?.error || 'Potvrda koda nije uspjela.');
    }

    await signInWithCustomToken(auth, result.customToken);
    await auth.currentUser?.getIdToken(true);
    pendingVerification = { email: '', name: '', password: '' };
    document.getElementById('verificationModal').style.display = 'none';
    ShowToast('Registracija uspješna! Dovršimo tvoj profil. 🔥');

    const form = document.getElementById('auth-form');
    if (form) form.reset();
  } catch (error) {
    if (verifyError) {
      verifyError.innerText = error.message;
      verifyError.style.display = 'block';
    }
  }
  return;
};

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
          Poslali smo 6-cifreni kod na <strong id="verification-email-label"></strong>.
          Kod važi 10 minuta. Ako zatvoriš aplikaciju, registraciju možeš nastaviti na ovom uređaju.
        </p>
        <div id="verification-password-wrap" style="display:none;text-align:left;margin-bottom:10px;">
          <label style="display:block;font-weight:700;font-size:.82rem;margin-bottom:6px;">GymLeader lozinka</label>
          <input type="password" id="verify-password-input" class="custom-input" autocomplete="new-password" placeholder="Ponovo unesi lozinku">
          <small style="display:block;color:var(--text-muted);font-size:.72rem;margin-top:5px;">Lozinka se ne čuva na uređaju.</small>
        </div>
        <input type="text" id="verify-code-input" class="custom-input" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" style="text-align:center;font-size:1.5rem;letter-spacing:6px;" maxlength="6" placeholder="000000">
        <div id="verify-error" style="color:var(--danger);font-size:.85rem;margin:10px 0;display:none;"></div>
        <div style="display:flex;gap:10px;margin-top:12px;">
          <button class="btn" data-action="confirm-verification">Potvrdi registraciju</button>
          <button class="btn btn-secondary" data-action="close-modal" data-modal-id="verificationModal">Kasnije</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  const emailLabel = document.getElementById('verification-email-label');
  if (emailLabel) emailLabel.textContent = pendingVerification.email || '';
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
    if (!response.ok || !result?.customToken) throw new Error(result?.error || 'Potvrda koda nije uspjela.');

    await signInWithCustomToken(auth, result.customToken);
    await auth.currentUser?.getIdToken(true);
    clearRegistrationDraft();
    pendingVerification = { email: '', name: '', password: '' };
    document.getElementById('verificationModal').style.display = 'none';
    document.getElementById('auth-form')?.reset();
    ShowToast('Registracija uspješna! Dovršimo tvoj profil. 🔥');
    setTimeout(() => window.openOnboardingModal(), 250);
  } catch (error) {
    if (verifyError) { verifyError.textContent = error.message; verifyError.style.display = 'block'; }
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
    `<div class="onboarding-icon">🏋️</div><span class="onboarding-step-label">KORAK 1 OD 4</span><h3>${escapeHtml(getDashboardGreeting())}</h3><p>GymLeader ti pomaže da napraviš svoje planove, pratiš kilaže i ponavljanja i vidiš napredak iz treninga u trening.</p>`,
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

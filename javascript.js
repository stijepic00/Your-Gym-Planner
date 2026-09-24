/*-- FIREBASE ENGINE & AUTH */
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
  import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signInWithCustomToken,
    signInWithPopup, 
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut 
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

    if (errorDiv) errorDiv.style.display = 'none';

    if (mode === 'register') {
      if (groupName) groupName.style.display = 'block';
      if (btnSubmit) btnSubmit.innerText = 'Kreiraj Novi Nalog 🚀';
      if (tabLogin) { tabLogin.style.color = 'var(--text-muted)'; tabLogin.style.borderBottom = 'none'; }
      if (tabRegister) { tabRegister.style.color = 'var(--primary)'; tabRegister.style.borderBottom = '2px solid var(--primary)'; }
      if (socialText) socialText.innerText = 'ili napravi nalog jednim klikom:';
    } else {
      if (groupName) groupName.style.display = 'none';
      if (btnSubmit) btnSubmit.innerText = 'Prijavi Se na Nalog →';
      if (tabLogin) { tabLogin.style.color = 'var(--primary)'; tabLogin.style.borderBottom = '2px solid var(--primary)'; }
      if (tabRegister) { tabRegister.style.color = 'var(--text-muted)'; tabRegister.style.borderBottom = 'none'; }
      if (socialText) socialText.innerText = 'ili se prijavi jednim klikom:';
    }
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

  window.handleGoogleLogin = async function() {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      ShowToast("Greška pri Google prijavi: " + error.message, 'error');
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
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().fullName) {
          mailDisplay.innerText = userDoc.data().fullName;
        } else {
          mailDisplay.innerText = user.email;
        }
        mailDisplay.style.display = 'inline-block';
      }

      await loadCloudData();
      listenToUserRoutines(user.uid);
      switchTab('dashboard');
      ensureInAppHistory();
    } else {
      if (routinesUnsubscribe) {
        routinesUnsubscribe();
        routinesUnsubscribe = null;
      }
      currentUser = null;
      navigationGuardReady = false;
      userRoutines = [];
      if (bottomNav) bottomNav.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (mailDisplay) mailDisplay.style.display = 'none';
      if (loginBtn) loginBtn.style.display = 'inline-block';
      switchTab('login');
    }
  });

  window.handleLogout = async function() {
    if (await showConfirm("Da li želite da se odjavite?")) {
      signOut(auth);
    }
  };

  function formatDateClean(isoString, includeYear = true) {
    if (!isoString) return 'Nedavno';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Nedavno';

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec'];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    return includeYear ? `${day}. ${month} ${year}.` : `${day}. ${month}`;
  }

  window.vibrate = function(ms = 35) {
    if ('vibrate' in navigator) navigator.vibrate(ms);
  };

  window.switchTab = function(tabId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const targetView = document.getElementById(`view-${tabId}`);
    if (targetView) targetView.classList.add('active');

    const navBtns = document.querySelectorAll('.nav-item');
    const indexMap = { dashboard: 0, workouts: 1, analytics: 2, history: 3 };
    if (indexMap[tabId] !== undefined && navBtns[indexMap[tabId]]) {
      navBtns[indexMap[tabId]].classList.add('active');
    }

    if (tabId === 'history') renderHistory();
    if (tabId === 'dashboard') { checkDraftState(); renderDashboard(); }
    if (tabId === 'workouts') renderWorkouts();
    if (tabId === 'analytics') setupAnalyticsUI();
  };

  window.goHome = function() {
    window.switchTab(currentUser ? 'dashboard' : 'login');

    if (currentUser) {
      requestAnimationFrame(() => {
        document.getElementById('dashboard-ready')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  function ensureInAppHistory() {
    if (navigationGuardReady) return;

    const appState = { gymTracker: true };
    history.replaceState(appState, '', location.href);
    history.pushState(appState, '', location.href);
    navigationGuardReady = true;
  }

  window.addEventListener('popstate', () => {
    if (!currentUser) return;
    window.goHome();
    history.pushState({ gymTracker: true }, '', location.href);
  });

  window.renderWorkouts = function() {
    const container = document.getElementById('workout-list');
    if (!container) return;

    let html = `
      <div style="display:flex; gap:8px; margin-bottom:16px;">
        <button class="btn btn-purple" style="flex:1;" data-action="open-create-routine">
          ➕ Napravi Novi Dan / Karticu
        </button>
        <button class="btn ${routineEditMode ? 'btn-purple' : 'btn-secondary'}" style="width:auto; padding:10px 14px;" data-action="toggle-routine-edit-mode">
          ${routineEditMode ? '✓ Gotovo' : '✎ Uredi dane'}
        </button>
      </div>
    `;

    if (userRoutines.length === 0) {
      html += `
        <div class="card" style="text-align: center; padding: 25px 15px;">
          <p style="color: var(--text-muted); font-size: 0.9rem;">
            Nemate kreiranih planova. Kliknite na dugme iznad ili uvezite plan iz Notes-a!
          </p>
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
                : `<button class="btn btn-start-card" data-action="start-routine" data-routine-id="${escapeHtml(w.id)}">Započni →</button>`}
            </div>
          </div>
        `;
      }).join('');
    }

    container.innerHTML = html;
  };

  // UČITAVANJE UŽIVO (StreamBuilder / onSnapshot) - Odgovara novim pravilima
  function listenToUserRoutines(userId) {
    if (routinesUnsubscribe) routinesUnsubscribe();

    const routinesRef = collection(db, "routines");
    const q = query(routinesRef, where("userId", "==", userId));

    routinesUnsubscribe = onSnapshot(q, (querySnapshot) => {
      userRoutines = [];
      querySnapshot.forEach((docSnap) => {
        userRoutines.push({ id: docSnap.id, ...docSnap.data() });
      });
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
      ShowToast('Naziv dana je obavezan.', 'error');
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
      ShowToast('Dan je obrisan.');
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
    document.getElementById('newRoutineExercisesInput').value = '';
    document.getElementById('createRoutineModal').style.display = 'flex';
  };

  window.submitNewRoutine = async function() {
    const emojiInput = document.getElementById('newRoutineEmojiInput').value.trim();
    const nameInput = document.getElementById('newRoutineNameInput').value.trim();
    const exercisesText = document.getElementById('newRoutineExercisesInput').value.trim();

    if (!nameInput) {
      ShowToast("Unesite naziv kartice ili dana!", 'error');
      return;
    }

    const exercises = exercisesText ? exercisesText.split('\n').map(e => e.trim()).filter(e => e.length > 0) : [];
    const finalEmoji = emojiInput || getEmojiForRoutine(nameInput);

    const newRoutine = {
      userId: currentUser.uid,
      emoji: finalEmoji,
      name: nameInput,
      exercises: exercises,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, "routines"), newRoutine);
      document.getElementById('createRoutineModal').style.display = 'none';
      ShowToast("Novi dan uspješno kreiran! 🔥");
    } catch (e) {
      ShowToast("Greška pri kreiranju: " + e.message, 'error');
    }
  };

  window.copyAIRules = function() {
    const rulesText = `Pretvori moj trening plan u striktan format za Gym Tracker aplikaciju:
- Svaki dan mora početi sa nazivom npr. 'Gornji A', 'Donji B', 'Leg Day'
- Ispod svake kartice/dana napiši vježbe u novom redu sa serijama i ponavljanjima (npr. Potisak sa klupe 4x10)
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
        b.querySelectorAll('.set-row').forEach((row, idx) => {
          if (idx === 0) return;
          sets.push({
            weight: row.querySelector('.set-kg')?.value || '',
            reps: row.querySelector('.set-reps')?.value || ''
          });
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
      const maxW = getMaxWeightFromHistory(ex.name);
      
      if (ex.isCardio) {
        const card = document.createElement('div');
        card.className = 'card exercise-block custom-cardio-block';
        card.setAttribute('data-name', ex.name);
        card.setAttribute('data-is-cardio', 'true');
        card.setAttribute('data-minutes', ex.minutes || '0');
        card.setAttribute('data-calories', ex.calories || '0');

        card.innerHTML = `
          <div class="flex-between">
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--accent-purple);">${escapeHtml(ex.name)} 🏃‍♂️</h3>
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
        card.setAttribute('data-name', ex.name);
        card.setAttribute('data-maxw', maxW);

        card.innerHTML = `
          <div class="flex-between">
            <h3 style="font-size: 1.15rem; font-weight: 800;">${escapeHtml(ex.name)}</h3>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="pr-badge-slot"></span>
              <button class="btn-remove-ex" style="display:none;" data-action="remove-exercise">Ukloni 🗑️</button>
            </div>
          </div>
          <div class="sets-container">
            <div class="set-row">
              <span style="font-size: 0.7rem; color: var(--text-muted); font-weight:800;">SET</span>
              <span style="font-size: 0.7rem; color: var(--text-muted); text-align: center; font-weight:800;">KG</span>
              <span style="font-size: 0.7rem; color: var(--text-muted); text-align: center; font-weight:800;">REPS</span>
              <span></span>
            </div>
          </div>
          <button class="btn btn-secondary mt-12" style="padding: 10px; font-size: 0.85rem;" data-action="add-set-row">+ Dodaj Set</button>
          <input type="text" class="note-input ex-note" value="${escapeHtml(ex.notes || '')}" placeholder="✏️ Napomena za ovu vježbu (opcionalno)...">
        `;
        container.appendChild(card);

        const setsContainer = card.querySelector(`.sets-container`);
        ex.sets.forEach((s, sIdx) => {
          const row = document.createElement('div');
          row.className = 'set-row';
          row.innerHTML = `
            <span style="font-weight: 900; color: var(--primary);">${sIdx + 1}</span>
            <input type="number" class="set-kg" placeholder="0" step="0.5" value="${escapeHtml(s.weight)}">
            <input type="number" class="set-reps" placeholder="0" value="${escapeHtml(s.reps)}">
            <button style="background:none; border:none; color: var(--danger); font-size: 1.3rem; cursor:pointer;" data-action="remove-set-row">×</button>
          `;
          setsContainer.appendChild(row);
        });
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
    const button = document.querySelector('[data-action="toggle-active-workout-edit-mode"]');
    if (button) button.textContent = activeWorkoutEditMode ? '✓ Gotovo' : '✎ Uredi vježbe';
  };

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

  function calculateTargetGoal(exName) {
    for (let i = 0; i < cachedHistory.length; i++) {
      const pastEx = cachedHistory[i].exercises?.find(e => e.name === exName);
      if (pastEx && pastEx.sets && pastEx.sets.length >= 3) {
        const s1 = pastEx.sets[0];
        const s2 = pastEx.sets[1];
        const s3 = pastEx.sets[2];
        
        if (s1.reps >= 12 && s2.reps >= 12 && s3.reps >= 12) {
          return `🎯 Cilj danas: POVEĆAJ KILAŽU na ${s1.weight + 2.5}kg! (Ispunjeno ${s1.weight}kg × 12/12/12)`;
        } else {
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
      let prevLogStr = 'Nema prošlog zapisa';
      let prevNote = '';
      const maxW = getMaxWeightFromHistory(exName);
      const targetGoal = calculateTargetGoal(exName);
      
      for (let i = 0; i < cachedHistory.length; i++) {
        const pastEx = cachedHistory[i].exercises?.find(e => e.name === exName);
        if (pastEx) {
          if (pastEx.sets && pastEx.sets.length > 0) {
            prevLogStr = pastEx.sets.map(s => `${s.weight}kg × ${s.reps}`).join(' | ');
          } else if (pastEx.minutes) {
            prevLogStr = `${pastEx.minutes} min` + (pastEx.calories ? ` · ${pastEx.calories} kcal` : '');
          }
          if (pastEx.notes) prevNote = pastEx.notes;
          break;
        }
      }

      return `
        <div class="card exercise-block" data-name="${escapeHtml(exName)}" data-maxw="${escapeHtml(maxW)}">
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
              <span style="font-size: 0.7rem; color: var(--text-muted); text-align: center; font-weight:800;">KG</span>
              <span style="font-size: 0.7rem; color: var(--text-muted); text-align: center; font-weight:800;">REPS</span>
              <span></span>
            </div>
          </div>
          <button class="btn btn-secondary mt-12" style="padding: 10px; font-size: 0.85rem;" data-action="add-set-row">+ Dodaj Set</button>
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
    
    const row = document.createElement('div');
    row.className = 'set-row';
    row.innerHTML = `
      <span style="font-weight: 900; color: var(--primary);">${setNum}</span>
      <input type="number" class="set-kg" placeholder="0" step="0.5">
      <input type="number" class="set-reps" placeholder="0">
      <button style="background:none; border:none; color: var(--danger); font-size: 1.3rem; cursor:pointer;" data-action="remove-set-row">×</button>
    `;
    container.appendChild(row);
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
    } else {
      const maxW = getMaxWeightFromHistory(name);
      const targetGoal = calculateTargetGoal(name);

      let prevLogStr = 'Nema prošlog zapisa';
      let prevNote = '';
      for (let i = 0; i < cachedHistory.length; i++) {
        const pastEx = cachedHistory[i].exercises?.find(e => e.name === name);
        if (pastEx && pastEx.sets && pastEx.sets.length > 0) {
          prevLogStr = pastEx.sets.map(s => `${s.weight}kg × ${s.reps}`).join(' | ');
          if (pastEx.notes) prevNote = pastEx.notes;
          break;
        }
      }

      const card = document.createElement('div');
      card.className = 'card exercise-block';
      card.setAttribute('data-name', name);
      card.setAttribute('data-maxw', maxW);

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
            <span style="font-size: 0.7rem; color: var(--text-muted); text-align: center; font-weight:800;">KG</span>
            <span style="font-size: 0.7rem; color: var(--text-muted); text-align: center; font-weight:800;">REPS</span>
            <span></span>
          </div>
        </div>
        <button class="btn btn-secondary mt-12" style="padding: 10px; font-size: 0.85rem;" data-action="add-set-row">+ Dodaj Set</button>
        <input type="text" class="note-input ex-note" value="${escapeHtml(notes)}" placeholder="✏️ Napomena za ovu vježbu (opcionalno)...">
      `;
      container.appendChild(card);
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
          const kg = row.querySelector('.set-kg')?.value;
          const reps = row.querySelector('.set-reps')?.value;
          if (kg && reps) completed++;
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

  window.finishWorkout = async function() {
    if (!currentUser) {
      ShowToast("Morate biti prijavljeni da biste sačuvali trening!", 'error');
      return;
    }

    const blocks = document.querySelectorAll('.exercise-block');
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
        const min = parseFloat(b.getAttribute('data-minutes')) || 0;
        const cal = parseFloat(b.getAttribute('data-calories')) || 0;
        const exObj = { name: exName, minutes: min, calories: cal, sets: [] };
        if (noteText) exObj.notes = noteText;
        workoutData.exercises.push(exObj);
      } else {
        const sets = [];
        b.querySelectorAll('.set-row').forEach((row, idx) => {
          if (idx === 0) return;
          const kg = row.querySelector('.set-kg')?.value;
          const reps = row.querySelector('.set-reps')?.value;
          if (kg && reps) sets.push({ weight: parseFloat(kg), reps: parseInt(reps, 10) });
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
      await addDoc(collection(db, "workouts"), workoutData);
      
      vibrate([100, 50, 100]);
      ShowToast('Trening sačuvan u "workouts" kolekciju! ☁️💪');
      
      currentWorkout = null;
      clearWorkoutDraft();
      await loadCloudData();
      switchTab('dashboard');
    } catch (e) {
      console.error("Greška pri čuvanju: ", e);
      ShowToast('Greška pri čuvanju na cloud: ' + e.message, 'error');
    }
  };

async function loadCloudData() {
  if (!currentUser) return;
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
    checkDraftState();
    renderDashboard();
  } catch (e) {
    console.error("Greška pri učitavanju sa clouda: ", e);
  }
}

  function renderDashboard() {
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
        contentHtml = ex.sets.map(s => `<span style="background: rgba(255,255,255,0.06); border: 1px solid var(--bg-card-border); padding: 4px 10px; border-radius: 8px; font-size: 0.8rem; font-weight: 800; color: #fff;">${escapeHtml(s.weight)}kg × ${escapeHtml(s.reps)}</span>`).join(' ');
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
      if (!cleanLine) return;

      const isIgnored = ignoreKeywords.some(k => cleanLine.toLowerCase().startsWith(k));
      if (isIgnored) return;

      const isDayHeader = /^(dan\s*\d+|day\s*\d+|ponedjeljak|utorak|srijeda|četvrtak|petak|subota|nedjelja|gornji|donji|full body|kardio)/i.test(cleanLine);
      const hasSetsReps = /\d+\s*x\s*\d+/i.test(cleanLine);

      if ((isDayHeader || !hasSetsReps) && !currentRoutineName) {
        currentRoutineName = cleanLine.replace(/^[-–—:]\s*/, '').trim();
      } else if (isDayHeader && hasSetsReps === false) {
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
          contentHtml = ex.sets.map(s => `<span style="background: rgba(255,255,255,0.06); border: 1px solid var(--bg-card-border); padding: 4px 10px; border-radius: 8px; font-size: 0.8rem; font-weight: 800; color: #fff;">${escapeHtml(s.weight)}kg × ${escapeHtml(s.reps)}</span>`).join(' ');
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
    const exercisesSet = new Set();

    cachedHistory.forEach(h => {
      h.exercises?.forEach(e => {
        if (e.sets && e.sets.length > 0) exercisesSet.add(e.name);
      });
    });

    const list = Array.from(exercisesSet);
    if (list.length === 0) {
      select.innerHTML = '<option>Nema sačuvanih vježbi</option>';
      return;
    }

    select.innerHTML = list.map(ex => `<option value="${escapeHtml(ex)}">${escapeHtml(ex)}</option>`).join('');
    renderAnalyticsChart();
  }

  window.renderAnalyticsChart = function() {
    const select = document.getElementById('analytics-ex-select');
    const exName = select.value;
    if (!exName) return;

    const labels = [];
    const dataPoints = [];

    const reversedHistory = [...cachedHistory].reverse();

    reversedHistory.forEach(h => {
      const pastEx = h.exercises?.find(e => e.name === exName);
      if (pastEx && pastEx.sets) {
        let maxW = 0;
        pastEx.sets.forEach(s => {
          const w = parseFloat(s.weight) || 0;
          if (w > maxW) maxW = w;
        });
        if (maxW > 0) {
          const dateLabel = formatDateClean(h.date, false);
          labels.push(dateLabel);
          dataPoints.push(maxW);
        }
      }
    });

    const ctx = document.getElementById('progressChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: `Max Kg (${exName})`,
          data: dataPoints,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
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
        plugins: { legend: { labels: { color: '#f8fafc', font: { family: 'Plus Jakarta Sans' } } } }
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
    toast.innerText = message;
    toast.style.borderColor = type === 'error' ? 'var(--danger)' : 'var(--primary)';
    toast.style.boxShadow = type === 'error' ? '0 20px 40px rgba(0,0,0,0.6), 0 0 25px rgba(239, 68, 68, 0.4)' : '0 20px 40px rgba(0,0,0,0.6), 0 0 25px var(--primary-glow)';
    
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  };

  function showConfirm(message) {
    return new Promise((resolve) => {
      const confirmed = window.confirm(message);
      resolve(confirmed);
    });
  }

  function setupEventHandlers() {
    const authForm = document.getElementById('auth-form');
    if (authForm) authForm.addEventListener('submit', window.handleAuthSubmit);

    const analyticsSelect = document.getElementById('analytics-ex-select');
    if (analyticsSelect) analyticsSelect.addEventListener('change', window.renderAnalyticsChart);

    document.addEventListener('click', (event) => {
      const button = event.target instanceof Element ? event.target.closest('[data-action]') : null;
      if (!button) return;

      const action = button.dataset.action;
      const modalId = button.dataset.modalId;

      if (action !== 'auth-mode' && action !== 'logout' && action !== 'google-login' && action !== 'copy-ai-rules') {
        window.vibrate();
      }

      switch (action) {
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
        case 'google-login':
          window.handleGoogleLogin();
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
        case 'copy-ai-rules':
          window.copyAIRules();
          break;
        case 'import-notes':
          window.handleImportFromNotes();
          break;
        case 'close-modal':
          if (modalId) document.getElementById(modalId).style.display = 'none';
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

      if (input.classList.contains('ex-note')) {
        saveWorkoutDraft();
      }
    });
  }

  setupEventHandlers();


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
    ShowToast('Registracija uspješna! Dobrodošli 🔥');

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

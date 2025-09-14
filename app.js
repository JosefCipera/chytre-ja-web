// === KROK 1: INICIALIZACE FIREBASE ===
const firebaseConfig = {
  // !!! VLOŽTE SEM VAŠE SKUTEČNÉ KONFIGURAČNÍ ÚDAJE !!!
  apiKey: "AIzaSyAKREZsoBZkA1xOQ5ff3XDmiJ88nwSjeOk",
  authDomain: "chytre-ja-app.firebaseapp.com",
  projectId: "chytre-ja-app",
  storageBucket: "chytre-ja-app.firebasestorage.app",
  messagingSenderId: "65882611642",
  appId: "1:65882611642:web:53d82914aa07d6677d4783"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
// Globální proměnná pro data z content.json
let contentData = {};

// === KROK 2: VEŠKERÁ LOGIKA APLIKACE SE SPUSTÍ, AŽ KDYŽ JE STRÁNKA PŘIPRAVENA ===
document.addEventListener('DOMContentLoaded', () => {

  // --- Definice elementů a pohledů ---
  const views = {
    'login': document.getElementById('login-view'),
    'register': document.getElementById('register-view'),
    'chat': document.getElementById('chat-view'),
    'terms': document.getElementById('terms-view'),     // <-- PŘIDÁNO
    'privacy': document.getElementById('privacy-view')  // <-- PŘIDÁNO
  };
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  // --- Funkce pro ovládání aplikace ---

  function showView(viewId) {
    for (const id in views) {
      if (views[id]) {
        views[id].classList.remove('active');
        views[id].classList.add('hidden');
      }
    }
    if (views[viewId]) {
      views[viewId].classList.remove('hidden');
      views[viewId].classList.add('active');
    }
  }

  function showErrorMessage(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) el.innerText = message;
  }

  function handleRegisterSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    if (password !== passwordConfirm) {
      showErrorMessage('register-error-message', 'Hesla se neshodují.');
      return;
    }
    showErrorMessage('register-error-message', '');
    auth.createUserWithEmailAndPassword(email, password)
      .then(userCredential => {
        console.log('Úspěšná registrace:', userCredential.user);
        // Po registraci není potřeba nic dalšího dělat, onAuthStateChanged se postará o zbytek
      })
      .catch(error => {
        if (error.code === 'auth/weak-password') { showErrorMessage('register-error-message', 'Heslo je příliš slabé.'); }
        else if (error.code === 'auth/email-already-in-use') { showErrorMessage('register-error-message', 'Tento e-mail je již zaregistrován.'); }
        else { showErrorMessage('register-error-message', 'Při registraci nastala chyba.'); }
      });
  }

  function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email-address').value;
    const password = document.getElementById('password').value;
    if (!email || !password) {
      showErrorMessage('error-message', 'Prosím, vyplňte e-mail i heslo.');
      return;
    }
    showErrorMessage('error-message', '');
    auth.signInWithEmailAndPassword(email, password)
      .then(userCredential => {
        console.log('Úspěšné přihlášení:', userCredential.user);
        // Po přihlášení není potřeba nic dalšího dělat, onAuthStateChanged se postará o zbytek
      })
      .catch(error => {
        showErrorMessage('error-message', 'Nesprávný e-mail nebo heslo.');
      });
  }

  function handleForgotPassword(event) {
    event.preventDefault();
    const email = document.getElementById('email-address').value;
    if (!email) { showErrorMessage('error-message', 'Zadejte prosím váš e-mail.'); return; }
    showErrorMessage('error-message', '');
    auth.sendPasswordResetEmail(email)
      .then(() => alert('Instrukce pro obnovu hesla byly odeslány.'))
      .catch(() => showErrorMessage('error-message', 'Nepodařilo se odeslat e-mail.'));
  }

  function handleLogout() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = ''; // Vyčistíme staré zprávy
      // Znovu vložíme úvodní zprávu pro dalšího uživatele
      addChatMessage("Dobrý den! Jsem AI Orchestrátor. Zadejte prosím svůj požadavek.");
    }
    auth.signOut();
  }

  function addChatMessage(message, sender = 'ai') {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    const messageWrapper = document.createElement('div');
    messageWrapper.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`;
    const messageBubble = document.createElement('div');
    messageBubble.className = `max-w-lg p-3 rounded-lg shadow-md ${sender === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'}`;
    messageBubble.innerText = message;
    messageWrapper.appendChild(messageBubble);
    messagesContainer.appendChild(messageWrapper);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // --- Napojení "posluchačů" na elementy ---
  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegisterSubmit);
  document.getElementById('show-register-link').addEventListener('click', (e) => { e.preventDefault(); showView('register'); });
  document.getElementById('show-login-link').addEventListener('click', (e) => { e.preventDefault(); showView('login'); });
  document.getElementById('logout-button').addEventListener('click', handleLogout);

  const chatSendButton = document.getElementById('chat-send-button');
  const chatInput = document.getElementById('chat-input');
  const handleChatMessageSend = () => {
    const userMessage = chatInput.value.trim();
    if (userMessage) {
      addChatMessage(userMessage, 'user');
      chatInput.value = '';
      setTimeout(() => {
        addChatMessage("Rozumím. Zpracovávám váš požadavek...", 'ai');
      }, 1000);
    }
  };
  chatSendButton.addEventListener('click', handleChatMessageSend);
  chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { handleChatMessageSend(); } });

  // --- Hlavní kontroler aplikace ---
  auth.onAuthStateChanged(user => {
    if (user) {
      // Uživatel je přihlášen
      console.log("Uživatel přihlášen:", user.email);
      document.getElementById('user-email').innerText = user.email;
      showView('chat');
    } else {
      // Uživatel je odhlášen
      console.log("Uživatel odhlášen.");
      if (loginForm) loginForm.reset(); // TATO JEDINÁ ŘÁDKA VŠE ŘEŠÍ
      if (registerForm) registerForm.reset();
      showView('login');
    }
  });
});
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';

// Použití Firebase z window objektu (inicializováno v app.html)
const app = window.firebaseApp;
const auth = window.firebaseAuth;
let contentData = {};

// Funkce pro převod prostého textu na HTML (pouze pokud není HTML)
function convertTextToHtml(text) {
  if (!text) return 'Chyba: Obsah není k dispozici.';
  if (text.startsWith('<')) {
    console.log('Text je už HTML:', text.substring(0, 100) + '...');
    return text; // Vrátíme HTML beze změny
  }
  console.log('Konvertuji prostý text na HTML:', text.substring(0, 100) + '...');
  const lines = text.split('\n').filter(line => line.trim() !== '');
  let html = '';
  let isFirstLine = true;
  let inList = false;
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (isFirstLine) {
      html += `<h2 class="text-3xl font-bold text-black mb-4">${trimmedLine}</h2>`;
      isFirstLine = false;
    } else if (/^\d+\.\s/.test(trimmedLine)) {
      if (inList) html += '</ul>';
      html += `<h3 class="text-xl font-semibold text-black mt-4 mb-1">${trimmedLine}</h3>`;
      inList = false;
    } else if (/^- /.test(trimmedLine)) {
      if (!inList) html += '<ul class="list-disc pl-6 mt-2 mb-2">';
      html += `<li class="mb-1">${trimmedLine.replace(/^- /, '')}</li>`;
      inList = true;
    } else {
      if (inList) html += '</ul>';
      html += `<p class="mt-2 mb-2">${trimmedLine}</p>`;
      inList = false;
    }
  }
  if (inList) html += '</ul>';
  return html;
}

// Funkce pro odstranění <h1> tagů z HTML
function removeH1(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const h1Elements = doc.getElementsByTagName('h1');
    while (h1Elements.length > 0) {
      h1Elements[0].parentNode.removeChild(h1Elements[0]);
    }
    // Vracíme HTML tělo bez <h1>
    return doc.body.innerHTML;
  } catch (e) {
    console.error('Chyba při odstraňování <h1>:', e);
    return html; // Pokud selže, vrátíme původní HTML
  }
}

// Načtení content.json
console.log('Spouštím fetch content.json');
fetch('content.json')
  .then(response => {
    console.log('Fetch response:', response);
    if (!response.ok) throw new Error(`Nepodařilo se načíst content.json: ${response.status} ${response.statusText}`);
    return response.text();
  })
  .then(text => {
    console.log('Načtený text content.json:', text.substring(0, 200) + '...');
    try {
      const data = JSON.parse(text);
      console.log('Parsovaná data z content.json:', data);
      contentData = data;
      const termsContentEl = document.getElementById('terms-content');
      const privacyContentEl = document.getElementById('privacy-content');
      console.log('terms-content element:', termsContentEl);
      console.log('privacy-content element:', privacyContentEl);
      if (termsContentEl) {
        let termsText = contentData.termsContent ||
          (contentData.assistants?.strateg?.pages?.[0]?.content) ||
          'Chyba: Obsah obchodních podmínek není k dispozici.';
        console.log('termsText před úpravou:', termsText.substring(0, 200) + '...');
        termsText = termsText.replace(/<p> <h(\d)>/g, '<p></p><h$1>'); // Oprava nevalidního HTML
        termsText = termsText.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'); // Odstranění escapování
        termsText = removeH1(termsText); // Odstranění <h1> tagů
        console.log('termsText po odstranění <h1>:', termsText.substring(0, 200) + '...');
        termsText = DOMPurify.sanitize(termsText); // Sanitizace HTML pomocí DOMPurify
        console.log('termsText po sanitizaci:', termsText.substring(0, 200) + '...');
        // Vytvoření nového div elementu
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = termsText; // Vložení sanitizovaného HTML
        termsContentEl.innerHTML = ''; // Vyčištění původního obsahu
        termsContentEl.appendChild(tempDiv); // Připojení nového divu
        console.log('terms-content po vložení:', termsContentEl.innerHTML.substring(0, 200) + '...');
        setTimeout(() => {
          console.log('terms-content po 1s:', termsContentEl.innerHTML.substring(0, 200) + '...');
          console.log('terms-content textContent po 1s:', termsContentEl.textContent.substring(0, 200) + '...');
        }, 1000);
      }
      if (privacyContentEl) {
        let privacyText = contentData.privacyContent ||
          (contentData.assistants?.vyroba?.pages?.[0]?.content) ||
          'Chyba: Obsah zásad ochrany osobních údajů není k dispozici.';
        console.log('privacyText před úpravou:', privacyText.substring(0, 200) + '...');
        privacyText = privacyText.replace(/<p> <h(\d)>/g, '<p></p><h$1>'); // Oprava nevalidního HTML
        privacyText = privacyText.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'); // Odstranění escapování
        privacyText = removeH1(privacyText); // Odstranění <h1> tagů
        console.log('privacyText po odstranění <h1>:', privacyText.substring(0, 200) + '...');
        privacyText = DOMPurify.sanitize(privacyText); // Sanitizace HTML pomocí DOMPurify
        console.log('privacyText po sanitizaci:', privacyText.substring(0, 200) + '...');
        // Vytvoření nového div elementu
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = privacyText; // Vložení sanitizovaného HTML
        privacyContentEl.innerHTML = ''; // Vyčištění původního obsahu
        privacyContentEl.appendChild(tempDiv); // Připojení nového divu
        console.log('privacy-content po vložení:', privacyContentEl.innerHTML.substring(0, 200) + '...');
        setTimeout(() => {
          console.log('privacy-content po 1s:', privacyContentEl.innerHTML.substring(0, 200) + '...');
          console.log('privacy-content textContent po 1s:', privacyContentEl.textContent.substring(0, 200) + '...');
        }, 1000);
      }
    } catch (e) {
      throw new Error('Chyba při parsování JSON: ' + e.message);
    }
  })
  .catch(error => {
    console.error('Chyba při načítání content.json:', error);
    const termsContentEl = document.getElementById('terms-content');
    const privacyContentEl = document.getElementById('privacy-content');
    if (termsContentEl) termsContentEl.innerHTML = 'Chyba: Obsah obchodních podmínek není k dispozici.';
    if (privacyContentEl) privacyContentEl.innerHTML = 'Chyba: Obsah zásad ochrany osobních údajů není k dispozici.';
  });

// Funkce showView musí být globální kvůli onclick v HTML
function showView(viewId) {
  console.log('Spouštím showView:', viewId);
  const views = {
    'login': document.getElementById('login-view'),
    'register': document.getElementById('register-view'),
    'chat': document.getElementById('chat-view'),
    'terms': document.getElementById('terms-view'),
    'privacy': document.getElementById('privacy-view')
  };
  for (const [id, view] of Object.entries(views)) {
    if (view) view.classList.toggle('hidden', id !== viewId);
  }
}

// Přidání showView do globálního scope
window.showView = showView;

function showErrorMessage(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) element.innerText = message;
}

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

function handleRegisterSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const passwordConfirm = document.getElementById('password-confirm').value;
  if (!email || !password || !passwordConfirm) {
    showErrorMessage('register-error-message', 'Prosím, vyplňte všechna pole.');
    return;
  }
  if (password !== passwordConfirm) {
    showErrorMessage('register-error-message', 'Hesla se neshodují.');
    return;
  }
  showErrorMessage('register-error-message', '');
  createUserWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      console.log('Úspěšná registrace:', userCredential.user);
    })
    .catch(error => {
      if (error.code === 'auth/weak-password') {
        showErrorMessage('register-error-message', 'Heslo je příliš slabé.');
      } else if (error.code === 'auth/email-already-in-use') {
        showErrorMessage('register-error-message', 'Tento e-mail je již zaregistrován.');
      } else {
        showErrorMessage('register-error-message', 'Při registraci nastala chyba.');
      }
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
  signInWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      console.log('Úspěšné přihlášení:', userCredential.user);
    })
    .catch(error => {
      showErrorMessage('error-message', 'Nesprávný e-mail nebo heslo.');
    });
}

function handleForgotPassword(event) {
  event.preventDefault();
  const email = document.getElementById('email-address').value;
  if (!email) {
    showErrorMessage('error-message', 'Zadejte prosím váš e-mail.');
    return;
  }
  showErrorMessage('error-message', '');
  sendPasswordResetEmail(auth, email)
    .then(() => alert('Instrukce pro obnovu hesla byly odeslány.'))
    .catch(() => showErrorMessage('error-message', 'Nepodařilo se odeslat e-mail.'));
}

function handleLogout() {
  const messagesContainer = document.getElementById('chat-messages');
  if (messagesContainer) {
    messagesContainer.innerHTML = '';
    addChatMessage("Dobrý den! Jsem AI Orchestrátor. Zadejte prosím svůj požadavek.");
  }
  signOut(auth);
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

// Napojení posluchačů na elementy
loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegisterSubmit);
document.getElementById('show-register-link').addEventListener('click', (e) => {
  e.preventDefault();
  showView('register');
});
document.getElementById('show-login-link').addEventListener('click', (e) => {
  e.preventDefault();
  showView('login');
});
document.getElementById('forgot-password-link').addEventListener('click', handleForgotPassword);
document.getElementById('logout-button').addEventListener('click', handleLogout);
document.getElementById('terms-link').addEventListener('click', (e) => {
  e.preventDefault();
  showView('terms');
});
document.getElementById('privacy-link').addEventListener('click', (e) => {
  e.preventDefault();
  showView('privacy');
});

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
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleChatMessageSend();
  }
});

// Hlavní kontroler aplikace
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM načten podruhé (kontrola duplicity)');
});
onAuthStateChanged(auth, user => {
  console.log("Uživatel přihlášen:", user ? user.email : 'Uživatel odhlášen');
  if (user) {
    document.getElementById('user-email').innerText = user.email;
    showView('chat');
  } else {
    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();
    showView('login');
  }
});

// Přidání showView do globálního scope (pro onclick v HTML)
window.showView = showView;
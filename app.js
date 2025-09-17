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

// Funkce pro zobrazení TOC slovníku
function displayTocDictionary(searchTerm = '') { // PŘIDÁN parametr
  const libraryContentEl = document.getElementById('library-content');
  if (libraryContentEl && Array.isArray(contentData.dictionary)) {

    // PŘIDÁNO: Filtrování dat na základě hledaného výrazu
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    // ZMĚNA: Hledáme už jen v 'term'
    const filteredDictionary = contentData.dictionary.filter(item => {
      return item.term.toLowerCase().includes(lowerCaseSearchTerm);
    });

    if (filteredDictionary.length === 0) return; // Pokud nic nenajdeme, nic nezobrazíme

    let html = '<dl class="grid grid-cols-1 gap-2 mt-4 pt-4 border-t">'; // Přidán odstup a oddělovač
    // ZMĚNA: Používáme vyfiltrovaná data
    filteredDictionary.forEach(item => {
      html += `<dt class="font-semibold">${item.term}</dt><dd class="ml-4">${item.definition}</dd>`;
    });
    html += '</dl>';
    libraryContentEl.innerHTML += DOMPurify.sanitize(html);
  } else {
    console.warn('TOC slovník není k dispozici nebo není ve správném formátu.');
  }
}

// Načtení a zobrazení obsahu knihovny
function displayLibraryContent(searchTerm = '') { // PŘIDÁN parametr
  const libraryContentEl = document.getElementById('library-content');
  if (libraryContentEl) {
    let html = '';
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    // Filtrování a zobrazení neplacené části
    if (contentData.library && contentData.library.free) {
      const filteredFree = contentData.library.free.filter(item =>
        item.title.toLowerCase().includes(lowerCaseSearchTerm)
      );

      filteredFree.forEach(item => {
        html += `<div class="mb-4 p-4 border rounded-lg"><h3 class="text-xl font-semibold">${item.title}</h3><p>${item.description}</p></div>`;
      });
    }

    // Filtrování a zobrazení placené části
    if (contentData.library && contentData.library.premium) {
      const filteredPremium = contentData.library.premium.filter(item =>
        item.title.toLowerCase().includes(lowerCaseSearchTerm)
      );

      filteredPremium.forEach(item => {
        html += `<div class="mb-4 p-4 border rounded-lg bg-gray-100"><h3 class="text-xl font-semibold">${item.title}</h3><p>${item.description}</p><p class="text-red-500">Vyžaduje premium předplatné</p></div>`;
      });
    }

    libraryContentEl.innerHTML = DOMPurify.sanitize(html); // Nahradí stávající obsah novým

  } else {
    console.error('Element library-content nebyl nalezen.');
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
      const libraryContentEl = document.getElementById('library-content');
      console.log('terms-content element:', termsContentEl);
      console.log('privacy-content element:', privacyContentEl);
      console.log('library-content element:', libraryContentEl);
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
      if (libraryContentEl) {
        // ZMĚNA: Voláme novou řídící funkci
        updateLibraryView();
        // displayLibraryContent();
      }
    } catch (e) {
      throw new Error('Chyba při parsování JSON: ' + e.message);
    }
  })
  .catch(error => {
    console.error('Chyba při načítání content.json:', error);
    const termsContentEl = document.getElementById('terms-content');
    const privacyContentEl = document.getElementById('privacy-content');
    const libraryContentEl = document.getElementById('library-content');
    if (termsContentEl) termsContentEl.innerHTML = 'Chyba: Obsah obchodních podmínek není k dispozici.';
    if (privacyContentEl) privacyContentEl.innerHTML = 'Chyba: Obsah zásad ochrany osobních údajů není k dispozici.';
    if (libraryContentEl) libraryContentEl.innerHTML = 'Chyba: Obsah knihovny není k dispozici.';
  });

// Funkce showView musí být globální kvůli onclick v HTML
function showView(viewId) {
  console.log('Spouštím showView:', viewId);
  const views = {
    'login': document.getElementById('login-view'),
    'register': document.getElementById('register-view'),
    'chat': document.getElementById('chat-view'),
    'terms': document.getElementById('terms-view'),
    'privacy': document.getElementById('privacy-view'),
    'library': document.getElementById('library-view')
  };
  for (const [id, view] of Object.entries(views)) {
    if (view) view.classList.toggle('hidden', id !== viewId);
  }
  if (viewId === 'library') {
    // ZMĚNA: Voláme novou řídící funkci
    updateLibraryView();
    // displayLibraryContent(); // Znovu zobrazit obsah knihovny při přepnutí
  }
}

// Přidání showView do globálního scope
window.showView = showView;

function showErrorMessage(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) element.innerText = message;
}

function showForgotPasswordMessage(message, isError = false) {
  const element = document.getElementById('forgot-password-message');
  if (element) {
    element.innerText = message;
    element.className = `mt-2 text-center ${isError ? 'text-red-500' : 'text-green-600'}`;
  }
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
    showForgotPasswordMessage('Zadejte prosím váš e-mail.', true);
    return;
  }
  showForgotPasswordMessage('');
  sendPasswordResetEmail(auth, email)
    .then(() => {
      showForgotPasswordMessage('Instrukce pro obnovu hesla byly odeslány na váš e-mail.');
    })
    .catch(() => {
      showForgotPasswordMessage('Nepodařilo se odeslat e-mail. Zkontrolujte prosím adresu.', true);
    });
}

function handleLogout() {
  const messagesContainer = document.getElementById('chat-messages');
  if (messagesContainer) {
    messagesContainer.innerHTML = ''; // Reset bez počáteční zprávy
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

function updateMicIcon() {
  const chatInput = document.getElementById('chat-input');
  const chatMicButton = document.getElementById('chat-mic-button');
  if (chatInput && chatMicButton) {
    if (chatInput.value.trim() === '') {
      chatMicButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            `;
    } else {
      chatMicButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
            `;
    }
  } else {
    console.error('Element chatInput nebo chatMicButton nebyl nalezen v DOM.');
  }
}

function handleMicSend() {
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    const userMessage = chatInput.value.trim();
    if (userMessage && chatInput.value.trim() !== '') {
      addChatMessage(userMessage, 'user');
      chatInput.value = '';
      updateMicIcon(); // Reset ikony zpět na mikrofon
      setTimeout(() => {
        addChatMessage("Rozumím. Zpracovávám váš požadavek...", 'ai');
      }, 1000);
    }
  } else {
    console.error('Element chatInput nebyl nalezen v DOM.');
  }
}

// Napojení posluchačů na elementy
loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegisterSubmit);
if (document.getElementById('show-register-link')) {
  document.getElementById('show-register-link').addEventListener('click', (e) => {
    e.preventDefault();
    showView('register');
  });
} else {
  console.error('Element show-register-link nebyl nalezen v DOM.');
}
if (document.getElementById('show-login-link')) {
  document.getElementById('show-login-link').addEventListener('click', (e) => {
    e.preventDefault();
    showView('login');
  });
} else {
  console.error('Element show-login-link nebyl nalezen v DOM.');
}
if (document.getElementById('forgot-password-link')) {
  document.getElementById('forgot-password-link').addEventListener('click', handleForgotPassword);
} else {
  console.error('Element forgot-password-link nebyl nalezen v DOM.');
}
if (document.getElementById('logout-button')) {
  document.getElementById('logout-button').addEventListener('click', handleLogout);
} else {
  console.error('Element logout-button nebyl nalezen v DOM.');
}
if (document.getElementById('terms-link')) {
  document.getElementById('terms-link').addEventListener('click', (e) => {
    e.preventDefault();
    showView('terms');
  });
} else {
  console.error('Element terms-link nebyl nalezen v DOM.');
}
if (document.getElementById('privacy-link')) {
  document.getElementById('privacy-link').addEventListener('click', (e) => {
    e.preventDefault();
    showView('privacy');
  });
} else {
  console.error('Element privacy-link nebyl nalezen v DOM.');
}
if (document.getElementById('library-button')) {
  document.getElementById('library-button').addEventListener('click', (e) => {
    e.preventDefault();
    showView('library');
  });
} else {
  console.error('Element library-button nebyl nalezen v DOM.');
}

const chatInput = document.getElementById('chat-input');
const chatMicButton = document.getElementById('chat-mic-button');
if (chatInput) {
  chatInput.addEventListener('input', updateMicIcon);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleMicSend();
    }
  });
} else {
  console.error('Element chatInput nebyl nalezen v DOM.');
}
if (chatMicButton) {
  chatMicButton.addEventListener('click', handleMicSend);
} else {
  console.error('Element chatMicButton nebyl nalezen v DOM.');
}

// Hlavní kontroler aplikace
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM načten podruhé (kontrola duplicity)');
  updateMicIcon(); // Inicializace ikony
});
// --- LOGIKA PRO VYHLEDÁVÁNÍ VE SLOVNÍKU ---

// Funkce, která řídí překreslení obsahu slovníku
function updateLibraryView() {
  const searchInput = document.getElementById('library-search-input');
  const libraryContentEl = document.getElementById('library-content');

  if (!searchInput || !libraryContentEl) return;

  const searchTerm = searchInput.value.trim();

  // Vyčistíme obsah a znovu ho vykreslíme s filtrem
  libraryContentEl.innerHTML = '';
  displayLibraryContent(searchTerm);
  displayTocDictionary(searchTerm);
}

// Připojení posluchače k vyhledávacímu poli
const searchInput = document.getElementById('library-search-input');
if (searchInput) {
  searchInput.addEventListener('input', updateLibraryView);
}

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
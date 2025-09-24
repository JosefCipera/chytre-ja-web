// Nastavte na `true` pro testování, jak aplikace vypadá pro přihlášeného uživatele
let IS_USER_LOGGED_IN = true;
// === Globální proměnné ===
const contentData = {};
let fuse; // Vyhledávací engine

// Stav pro knihovnu
let libraryCurrentPage = 1;
const libraryRowsPerPage = 6;
let libraryActiveTag = 'all';

// Odkazy na HTML elementy (pohledy)
const views = {
  'home': document.getElementById('home-view'),
  'info': document.getElementById('info-view'),
  'chat': document.getElementById('chat-view'),
  'terms': document.getElementById('terms-view'),
  'privacy': document.getElementById('privacy-view'),
  'library': document.getElementById('library-view'),
  'content': document.getElementById('content-view'),
  'checklist': document.getElementById('checklist-view'),
  'production-plan-view': document.getElementById('production-plan-view'),
  'minidashboard-view': document.getElementById('minidashboard-view'),
  'dashboard-view': document.getElementById('dashboard-view'),
  'iframe-view': document.getElementById('iframe-view'),
};
const modalElement = document.getElementById('media-modal');

function setupMobileMenu() {
  const menuBtn = document.getElementById('menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  menuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });

  // Skryje menu po kliknutí na odkaz v mobilním menu
  mobileMenu.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') {
      mobileMenu.classList.add('hidden');
    }
  });
}

// === Logika pro modální okno a zobrazení obsahu ===
function openModal(contentHtml) {
  const modalBody = document.getElementById('modal-body');
  modalBody.innerHTML = contentHtml;
  modalElement.classList.remove('hidden');
  modalElement.classList.add('flex');
}

function closeModal() {
  const modalBody = document.getElementById('modal-body');
  modalBody.innerHTML = '';
  modalElement.classList.add('hidden');
  modalElement.classList.remove('flex');
}

function showMediaInModal(itemId) {
  const item = contentData.library.find(i => i.id === itemId);
  if (!item) return;
  let contentHtml = '';
  switch (item.type) {
    case 'video':
      let embedUrl = '';
      try {
        const url = new URL(item.url);
        if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
          let videoId;
          if (url.hostname.includes('youtu.be')) {
            videoId = url.pathname.slice(1);
          } else {
            videoId = url.searchParams.get('v');
          }
          if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (url.hostname.includes('vimeo.com')) {
          const videoId = url.pathname.split('/').pop();
          if (videoId) embedUrl = `https://player.vimeo.com/video/${videoId}`;
        }
      } catch (e) {
        console.error("Chybná URL videa:", item.url, e);
      }
      if (embedUrl) {
        contentHtml = `<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="${embedUrl}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe></div>`;
      } else {
        contentHtml = `<p class="text-center text-red-500">Nepodařilo se načíst video.</p>`;
      }
      break;
    case 'image':
      contentHtml = `<img src="${item.url}" alt="${item.title}" class="max-w-full max-h-[80vh] mx-auto rounded">`;
      break;
    case 'audio':
      contentHtml = `<div><h3 class="text-2xl font-bold mb-4">${item.title}</h3><audio controls src="${item.url}" class="w-full">Váš prohlížeč nepodporuje přehrávání audia.</audio></div>`;
      break;
  }
  if (contentHtml) openModal(contentHtml);
}

// NOVÁ A VYLEPŠENÁ FUNKCE PRO ZOBRAZENÍ ČLÁNKU
function showContent(itemId) {
  const contentContainer = document.getElementById('content-dynamic');
  if (!contentContainer || !contentData.library) return;

  const item = contentData.library.find(i => i.id === itemId);
  if (!item) {
    contentContainer.innerHTML = '<h1>Chyba</h1><p>Článek nebyl nalezen.</p>';
    showView('content');
    return;
  }

  // Zkontrolujeme, zda má článek novou vlastnost contentUrl
  if (item.contentUrl) {
    // Pomocí fetch() načteme obsah .md souboru z dané URL
    fetch(item.contentUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error('Síťová odpověď nebyla v pořádku.');
        }
        return response.text();
      })
      .then(markdownText => {
        // Převedeme Markdown na HTML a zobrazíme ho
        contentContainer.innerHTML = convertMarkdownToHtml(markdownText);
        showView('content');
      })
      .catch(error => {
        console.error('Chyba při načítání článku:', error);
        contentContainer.innerHTML = '<h1>Chyba</h1><p>Nepodařilo se načíst obsah článku. Zkontrolujte prosím konzoli pro více detailů.</p>';
        showView('content');
      });
  }
  // Pokud contentUrl neexistuje, použijeme starou metodu (pro zpětnou kompatibilitu)
  else if (item.contentBody) {
    let contentHtml = `<h2>${item.contentTitle}</h1>${item.contentBody}`;
    contentContainer.innerHTML = contentHtml;
    showView('content');
  }
}

// FINÁLNÍ VERZE PŘEVODNÍKU S PŘIDANÝMI INLINE STYLY PRO ZAJIŠTĚNÍ ZOBRAZENÍ
// FINÁLNÍ VERZE PŘEVODNÍKU S PODPOROU PRO BLOKOVÉ CITACE (>)
function convertMarkdownToHtml(md) {
  const lines = md.split('\n');
  let html = '';
  let inList = false;

  for (const line of lines) {
    // NOVĚ PŘIDÁNO: Zpracování blokové citace
    if (line.trim().startsWith('> ')) {
      if (inList) { html += '</ul>\n'; inList = false; }
      // Přidáme i styl, aby citace byla vždy viditelná
      html += `<blockquote style="margin-left: 0; padding-left: 1.5em; border-left: 4px solid #e5e7eb; color: #4b5563; background-color: #f9fafb; margin-bottom: 1em; padding-top: 0.5em; padding-bottom: 0.5em;">${line.trim().substring(2)}</blockquote>\n`;
      continue;
    }

    // Zpracování nadpisů
    if (line.startsWith('# ')) {
      if (inList) { html += '</ul>\n'; inList = false; }
      html += `<h1>${line.substring(2)}</h1>\n`;
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { html += '</ul>\n'; inList = false; }
      html += `<h2>${line.substring(3)}</h2>\n`;
      continue;
    }
    if (line.startsWith('### ')) {
      if (inList) { html += '</ul>\n'; inList = false; }
      html += `<h3>${line.substring(4)}</h3>\n`;
      continue;
    }

    // Zpracování seznamů (odrážek)
    if (line.trim().startsWith('* ')) {
      if (!inList) {
        html += '<ul style="list-style-type: disc; padding-left: 25px; margin-top: 1em; margin-bottom: 1em;">\n';
        inList = true;
      }
      html += `<li style="margin-bottom: 0.5em;">${line.trim().substring(2)}</li>\n`;
      continue;
    }

    if (inList) {
      html += '</ul>\n';
      inList = false;
    }

    if (line.trim() === '') {
      html += '\n';
    } else {
      html += `<p style="margin-bottom: 1em;">${line}</p>\n`;
    }
  }

  if (inList) {
    html += '</ul>\n';
  }

  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  return html;
}

// === Hlavní logika pro knihovnu ===
function renderLibrary() {
  const libraryGrid = document.getElementById('library-grid');
  const tagsContainer = document.getElementById('library-tags-container');
  const searchInput = document.getElementById('library-search');
  const paginationContainer = document.getElementById('library-pagination');
  if (!libraryGrid || !tagsContainer || !searchInput || !paginationContainer || !contentData.library) return;

  const searchText = searchInput.value.trim().toLowerCase();
  let sourceItems = (searchText === '') ? contentData.library : (fuse ? fuse.search(searchText).map(result => result.item) : []);

  const taggedItems = libraryActiveTag === 'all'
    ? sourceItems
    : sourceItems.filter(item => item.tags && item.tags.includes(libraryActiveTag));

  const fullyFilteredItems = taggedItems.filter(item => item.published !== false);

  if (tagsContainer.innerHTML === '') {
    const allTags = contentData.library.flatMap(item => item.tags || []);
    const uniqueTags = ['all', ...new Set(allTags)];
    tagsContainer.innerHTML = uniqueTags.map(tag => {
      const label = tag === 'all' ? 'Vše' : tag.charAt(0).toUpperCase() + tag.slice(1);
      return `<button data-tag="${tag}" class="py-2 px-4 rounded-full text-sm font-medium transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300">${label}</button>`;
    }).join('');

    tagsContainer.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        libraryActiveTag = e.target.dataset.tag;
        libraryCurrentPage = 1;
        renderLibrary();
      }
    });
  }

  Array.from(tagsContainer.children).forEach(button => {
    button.classList.toggle('bg-blue-600', button.dataset.tag === libraryActiveTag);
    button.classList.toggle('text-white', button.dataset.tag === libraryActiveTag);
    button.classList.toggle('bg-gray-200', button.dataset.tag !== libraryActiveTag);
    button.classList.toggle('text-gray-700', button.dataset.tag !== libraryActiveTag);
  });

  const totalPages = Math.ceil(fullyFilteredItems.length / libraryRowsPerPage);
  const start = (libraryCurrentPage - 1) * libraryRowsPerPage;
  const end = start + libraryRowsPerPage;
  const paginatedItems = fullyFilteredItems.slice(start, end);

  libraryGrid.innerHTML = '';
  if (paginatedItems.length === 0) {
    libraryGrid.innerHTML = `<p class="col-span-full text-center text-gray-500">Pro zadaná kritéria nebyly nalezeny žádné materiály.</p>`;
  } else {
    paginatedItems.forEach(item => {
      let linkElement = '';
      const isPremium = item.access === 'premium';
      let cardClasses = "bg-gray-50 p-6 rounded-lg border border-gray-200 flex flex-col relative h-full";
      let premiumBadge = '';

      // TATO LOGIKA NYNÍ POUŽÍVÁ SIMULAČNÍ PROMĚNNOU
      if (isPremium && !IS_USER_LOGGED_IN) {
        premiumBadge = `<div class="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full z-10">Premium</div>`;
        cardClasses += " opacity-70";
        linkElement = `<div class="mt-auto pt-4 border-t text-gray-600 font-semibold self-start flex items-center cursor-not-allowed"><i class="fas fa-lock mr-2"></i> ${item.linkText}</div>`;
      } else {
        if (isPremium) {
          premiumBadge = `<div class="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full z-10">Premium</div>`;
        }
        const actionButtonClass = "mt-auto pt-4 border-t text-blue-600 font-semibold hover:underline self-start";
        if (['video', 'audio', 'image'].includes(item.type)) {
          linkElement = `<button onclick="showMediaInModal('${item.id}')" class="${actionButtonClass}">${item.linkText} &rarr;</button>`;
        } else if (item.type === 'article') {
          linkElement = `<button onclick="showContent('${item.id}')" class="${actionButtonClass}">${item.linkText} &rarr;</button>`;
        } else if (item.type === 'interactive_checklist') {
          linkElement = `<button onclick="showInteractiveChecklist('${item.id}')" class="${actionButtonClass}">${item.linkText} &rarr;</button>`;
        } else if (item.type === 'iframe_view') {
          linkElement = `<button onclick="showIframeContent('${item.id}')" class="${actionButtonClass}">${item.linkText} &rarr;</button>`;
        } else if (item.type === 'integrated_page') {
          linkElement = `<button onclick="showView('${item.view_id}', '${item.url}')" class="${actionButtonClass}">${item.linkText} &rarr;</button>`;
        } else {
          linkElement = `<a href="${item.url}" target="_blank" class="${actionButtonClass}">${item.linkText} &rarr;</a>`;
        }
      }
      const cardHtml = `<div class="${cardClasses}">${premiumBadge}<div class="flex items-center mb-3"><i class="${item.icon} text-2xl mr-3 w-8 text-center"></i><h3 class="font-bold text-xl">${item.title}</h3></div><p class="text-gray-700 flex-grow">${item.description}</p>${linkElement}</div>`;
      libraryGrid.innerHTML += cardHtml;
    });
  }

  paginationContainer.innerHTML = '';
  if (totalPages > 1) {
    for (let i = 1; i <= totalPages; i++) {
      const button = document.createElement('button');
      button.innerText = i;
      button.className = `px-4 py-2 rounded-md text-sm font-medium ${i === libraryCurrentPage ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
      button.onclick = () => { libraryCurrentPage = i; renderLibrary(); };
      paginationContainer.appendChild(button);
    }
  }
}

// === Hlavní renderovací funkce ===
function renderContent() {
  renderFaq();
  renderLegal();
  renderLibrary();
}

function renderFaq() {
  const faqContainer = document.getElementById('faq-container');
  if (!faqContainer || !contentData.faq) return;
  let faqHtml = `<h2 class="text-4xl h2-thin-style mb-4">Často kladené dotazy</h2><p class="text-lg text-gray-600 mb-12">Máte otázky? Zde jsou odpovědi na ty nejčastější.</p><div class="max-w-3xl mx-auto text-left space-y-4">`;
  contentData.faq.forEach((item, index) => {
    faqHtml += `<div class="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200"><input type="checkbox" id="faq${index}" class="hidden peer" aria-labelledby="faq${index}-label"><label id="faq${index}-label" for="faq${index}" class="flex justify-between items-center p-5 cursor-pointer select-none font-bold text-lg text-gray-900">${item.question}<span class="transform transition-transform duration-300 peer-checked:-rotate-180"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></span></label><div class="peer-checked:max-h-96 max-h-0 overflow-hidden transition-all duration-300"><div class="p-5 text-gray-700 leading-relaxed border-t border-gray-200">${item.answer}</div></div></div>`;
  });
  faqHtml += `</div>`;
  faqContainer.innerHTML = faqHtml;
}

function renderLegal() {
  const termsContent = document.getElementById('terms-content');
  if (termsContent && contentData.termsContent) {
    termsContent.innerHTML = contentData.termsContent;
  }
  const privacyContent = document.getElementById('privacy-content');
  if (privacyContent && contentData.privacyContent) {
    privacyContent.innerHTML = contentData.privacyContent;
  }
}

// === Základní logika PWA (pohledy, navigace) ===
let currentAssistant = null;
let currentPage = 0;

function showView(viewId, itemUrl) {
  console.log("IMERZIVNÍ POHLED:", viewId, "-> Zobrazuji tlačítko Zpět."); // <-- PŘIDAT
  const header = document.querySelector('header');
  const footer = document.querySelector('footer');
  const mainContent = document.querySelector('main');
  const fab = document.getElementById('back-to-library-fab');

  const immersiveViews = ['production-plan-view', 'looker-report-view'];

  if (immersiveViews.includes(viewId)) {
    console.log("IMERZIVNÍ POHLED:", viewId, "-> Zobrazuji tlačítko Zpět.");
    header.classList.add('hidden');
    footer.classList.add('hidden');
    mainContent.classList.remove('pt-16');
    // Zde může být logika pro FAB tlačítko, pokud je potřeba
    fab.classList.remove('hidden'); // ZOBRAZÍME TLAČÍTKO
    fab.onclick = () => showView('library'); // NASTAVÍME, CO MÁ UDĚLAT
  } else {
    header.classList.remove('hidden');
    footer.classList.remove('hidden');
    mainContent.classList.add('pt-16');
    // Zde může být logika pro FAB tlačítko, pokud je potřeba
    fab.classList.add('hidden'); // SKRYJEME TLAČÍTKO
  }

  for (let id in views) {
    if (views[id]) {
      views[id].classList.remove('active');
    }
  }
  if (views[viewId]) {
    views[viewId].classList.add('active');
  }
  if (viewId !== 'home') {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  // ZMĚNA: Tato část je klíčová
  if (itemUrl) {
    const viewElement = document.getElementById(viewId);
    const iframeContainer = viewElement.querySelector('div');

    if (iframeContainer) {
      // 1. Vyčistíme kontejner
      iframeContainer.innerHTML = '';

      // 2. Vytvoříme iframe programově
      const iframe = document.createElement('iframe');
      iframe.src = itemUrl;
      iframe.title = "Looker Studio Report";
      iframe.className = "w-full h-full";
      iframe.frameBorder = "0";
      iframe.allowFullscreen = true;

      // 3. Přidáme hotový iframe do kontejneru
      iframeContainer.appendChild(iframe);
    }
  }
}

function setupNavigation() {
  document.querySelectorAll('nav a, a[href^="#"]').forEach(element => {
    element.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const targetId = href.substring(1);
        if (targetId === 'home-view') {
          showView('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        if (!views.home.classList.contains('active')) {
          showView('home');
        }
        setTimeout(() => {
          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    });
  });
}

// === Logika pro AI Asistenty a chat ===
let assistantStates = { 'kouc': { step: 0, problems: [] }, 'vyroba': { step: 0, problems: [] }, 'finance': { step: 0, problems: [] }, 'strateg': { step: 0, problems: [] }, };

function showAssistantInfo(assistantId) {
  const assistant = contentData.assistants[assistantId];
  if (!assistant || !assistant.pages) return;
  currentAssistant = assistantId;
  document.getElementById('info-title').innerText = assistant.name;
  const pagesContainer = document.getElementById('info-content-pages');
  pagesContainer.innerHTML = '';
  assistant.pages.forEach((page) => {
    const pageElement = document.createElement('div');
    pageElement.className = 'info-page p-4';
    pageElement.innerHTML = `<h3 class="text-2xl font-bold text-gray-900 mb-4">${page.title}</h3><p class="text-gray-700 leading-relaxed">${page.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`;
    pagesContainer.appendChild(pageElement);
  });
  currentPage = 0;
  updateInfoView();
  showView('info');
}

function updateInfoView() {
  const assistant = contentData.assistants[currentAssistant];
  if (!assistant || !assistant.pages) return;
  const pages = document.querySelectorAll('#info-content-pages .info-page');
  pages.forEach((page, index) => { page.classList.toggle('active', index === currentPage); });
  const prevBtn = document.getElementById('info-prev-btn');
  const nextBtn = document.getElementById('info-next-btn');
  const pageCounter = document.getElementById('info-page-counter');
  prevBtn.style.visibility = currentPage > 0 ? 'visible' : 'hidden';
  nextBtn.style.visibility = currentPage < assistant.pages.length - 1 ? 'visible' : 'hidden';
  pageCounter.innerText = `Stránka ${currentPage + 1} z ${assistant.pages.length}`;
}

// =====================================================================
// === NOVÁ LOGIKA PRO OCHUTNÁVKOVÝ CHAT S PŘESMĚROVÁNÍM DO KNIHOVNY ===
// =====================================================================

// === LOGIKA PRO OCHUTNÁVKOVÝ CHAT ===

const assistantDialogs = {
  'vyroba': {
    name: 'AI asistent Výroba',
    initMessage: 'Dobrý den. Vím, že ve výrobě je mnoho problémů, které je potřeba řešit. S čím byste potřebovali pomoct nejvíce?',
    replies: [
      { text: 'Plnění termínů', searchTerm: 'termíny' },
      { text: 'Vytěžování kapacit', searchTerm: 'kapacita' },
      { text: 'Produktivita', searchTerm: 'produktivita' }
    ]
  },
  'finance': {
    name: 'AI asistent Finance',
    initMessage: 'Dobrý den! Jsem expert na firemní finance. Jaká oblast je pro vás prioritou? Jsou to být příliš vysoké náklady, špatné cash-flow nebo nízký zisk.',
    replies: [
      { text: 'Nízký zisk', searchTerm: 'průtok' },
      { text: 'Špatné cash flow', searchTerm: 'průtok' },
      { text: 'Vysoké náklady', searchTerm: 'náklady' }
    ]
  },
  'strateg': {
    name: 'AI asistent Stratég',
    initMessage: 'Dobrý den! Pomáhám firmám tvořit inovativní byznys modely, s nimiž bez problémů poráží konkurenci. Co potřebujete řešit nejdříve?',
    replies: [
      { text: 'Potřebuji novou strategii', searchTerm: 'strategie' },
      { text: 'Chci porazit konkurenci', searchTerm: 'strategie' },
      { text: 'Chci ochránit firmu do budoucna', searchTerm: 'trh' }
    ]
  },
  'marketing': {
    name: 'AI asistent Marketing',
    initMessage: 'Dobrý den! Zabývám se tvorbou neodmítnutelné nabídky "Mafia Offer". Díky ní přimějete zákazníky, aby kupovali vaše výrobky a služby jako nikdy předtím. S čím začneme?',
    replies: [
      { text: 'Jak získat více zákazníků', searchTerm: 'marketing' },
      { text: 'Jaká je správná cena', searchTerm: 'cena' },
      { text: 'Jak na sociální média', searchTerm: 'marketing' }
    ]
  }
};

function startAssistantChat(assistantId) {
  const dialog = assistantDialogs[assistantId];
  if (!dialog) return;

  currentAssistant = assistantId;
  const chatTitle = document.getElementById('chat-title');
  const chatBox = document.getElementById('chat-box');
  const quickReplies = document.getElementById('quick-replies');

  chatTitle.innerText = dialog.name;
  chatBox.innerHTML = '';
  quickReplies.innerHTML = '';

  addMessage(dialog.initMessage, 'ai');

  dialog.replies.forEach(reply => {
    const button = document.createElement('button');
    button.textContent = reply.text;
    button.className = 'bg-blue-100 text-blue-800 py-2 px-4 rounded-full hover:bg-blue-200';
    button.onclick = () => handleAssistantReply(reply.text, reply.searchTerm);
    quickReplies.appendChild(button);
  });

  document.getElementById('chat-input-wrapper').style.display = 'none';
  showView('chat');
}

function handleAssistantReply(userChoice, searchTerm) {
  addMessage(userChoice, 'user');
  document.getElementById('quick-replies').innerHTML = '';

  setTimeout(() => {
    const finalMessage = `Chápu. Protože téma **"${userChoice}"** je pro většinu firem klíčové, máme k němu mnoho zajímavých zdrojů. Chcete je zobrazit?`;
    addMessage(finalMessage, 'ai');

    const quickRepliesContainer = document.getElementById('quick-replies');
    quickRepliesContainer.innerHTML = `
            <button onclick="showFilteredLibrary('${searchTerm}')" class="bg-green-500 text-white font-medium py-2 px-6 rounded-lg hover:bg-green-600">Ano, zobrazit zdroje</button>
            <button onclick="showView('home')" class="bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg hover:bg-gray-300">Ne, děkuji</button>
        `;
  }, 1200);
}

function showFilteredLibrary(searchTerm) {
  const searchInput = document.getElementById('library-search');
  if (searchInput) {
    searchInput.value = searchTerm;
  }
  showView('library');
  renderLibrary();
}

function addMessage(text, sender) {
  const chatBox = document.getElementById('chat-box');
  const messageElement = document.createElement('div');
  messageElement.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`;
  messageElement.innerHTML = `<div class="p-4 rounded-2xl max-w-[80%] ${sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}">${text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>`;
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}
// =====================================================================
// === NOVÁ, CHYTŘEJŠÍ LOGIKA PRO OCHUTNÁVKOVÝ CHAT ===
// =====================================================================

// === Inicializace aplikace ===
document.addEventListener('DOMContentLoaded', () => {
  fetch('content.json')
    .then(response => { if (!response.ok) throw new Error(`Chyba sítě: ${response.statusText}`); return response.json(); })
    .then(externalData => {
      Object.assign(contentData, externalData);
      if (contentData.library) {
        fuse = new Fuse(contentData.library, { includeScore: true, threshold: 0.3, keys: ['title', 'description', 'tags'] });
      }
      renderContent();
      setupNavigation();
      setupMobileMenu();
    })
    .catch(error => console.error('Chyba při načítání nebo zpracování content.json:', error));

  document.getElementById('library-search').addEventListener('input', () => { libraryCurrentPage = 1; renderLibrary(); });
  document.getElementById('info-prev-btn').addEventListener('click', () => { if (currentPage > 0) { currentPage--; updateInfoView(); } });
  document.getElementById('info-next-btn').addEventListener('click', () => { if (contentData.assistants && currentAssistant && contentData.assistants[currentAssistant].pages && currentPage < contentData.assistants[currentAssistant].pages.length - 1) { currentPage++; updateInfoView(); } });
  document.getElementById('contact-form').addEventListener('submit', function (e) { e.preventDefault(); alert('Děkujeme za vaši zprávu. Ozveme se vám co nejdříve.'); this.reset(); });
  document.getElementById('send-button').addEventListener('click', handleSend);
  document.getElementById('chat-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') { handleSend(); } });
});
// FUNKCE, KTERÁ DYNAMICKY VYGENERUJE INTERAKTIVNÍ CHECKLIST
function showInteractiveChecklist(itemId) {
  const checklistData = contentData.library.find(i => i.id === itemId);
  if (!checklistData) return;

  // Naplníme titulky a úvod
  document.getElementById('checklist-title').innerText = checklistData.title;
  document.getElementById('checklist-intro').innerText = checklistData.introText;
  const container = document.getElementById('checklist-container');
  container.innerHTML = ''; // Vyčistíme starý obsah

  // Projdeme sekce a položky z JSONu a vytvoříme HTML
  checklistData.sections.forEach((section, sectionIndex) => {
    let sectionHtml = `<div class="p-6 border rounded-lg"><h3 class="text-xl font-bold text-gray-900 mb-4">${section.title}</h3><div class="space-y-3">`;
    section.items.forEach((item, itemIndex) => {
      const checkboxId = `check-${sectionIndex}-${itemIndex}`;
      // Zjistíme, zda byl checkbox v minulosti zaškrtnut (z localStorage)
      const isChecked = localStorage.getItem(checkboxId) === 'true';
      sectionHtml += `
                        <div class="flex items-center">
                            <input id="${checkboxId}" type="checkbox" ${isChecked ? 'checked' : ''} class="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                            <label for="${checkboxId}" class="ml-3 text-md text-gray-800">${item}</label>
                        </div>
                    `;
    });
    sectionHtml += `</div></div>`;
    container.innerHTML += sectionHtml;
  });

  // "Oživíme" všechny checkboxy
  container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (event) => {
      // Uložíme stav (zaškrtnuto/odškrtnuto) do paměti prohlížeče
      localStorage.setItem(event.target.id, event.target.checked);
      updateChecklistProgress(container);
    });
  });

  updateChecklistProgress(container); // Spočítáme pokrok při načtení
  showView('checklist'); // Zobrazíme checklist
}

// FUNKCE, KTERÁ POČÍTÁ A ZOBRAZUJE POKROK
function updateChecklistProgress(container) {
  const allCheckboxes = container.querySelectorAll('input[type="checkbox"]');
  const checkedCheckboxes = container.querySelectorAll('input[type="checkbox"]:checked');
  const progressElement = document.getElementById('checklist-progress');

  if (allCheckboxes.length > 0) {
    const percentage = Math.round((checkedCheckboxes.length / allCheckboxes.length) * 100);
    progressElement.innerText = `Hotovo: ${checkedCheckboxes.length} z ${allCheckboxes.length} (${percentage}%)`;
  } else {
    progressElement.innerText = 'Hotovo: 0 z 0 (0%)';
  }
}
// --- LOGIKA PRO MINIDASHBOARD ---
let myChartInstance = null; // Proměnná pro uchování instance grafu, aby se dala zničit

function showProductivityDashboard(itemId) {
  // 1. Řekneme, ať se začne připravovat zobrazení se správným ID
  showView('dashboard-view');

  const item = contentData.library.find(i => i.id === itemId);
  if (!item) return;

  document.getElementById('dashboard-title').innerText = item.title;

  // 2. Požádáme prohlížeč, aby spustil náš kód, až bude připraven kreslit
  requestAnimationFrame(() => {
    fetch('produktivita.json')
      .then(response => response.json())
      .then(data => {
        const labels = data.map(d => d.Měsíc);
        const actualData = data.map(d => d['Produktivita skutečnost']);
        const plannedData = data.map(d => d['Produktivita plán']);
        const ctx = document.getElementById('myChartCanvas').getContext('2d');

        // Důležité: Zničíme předchozí graf, pokud existuje, abychom předešli chybám
        if (myChartInstance) {
          myChartInstance.destroy();
        }

        // Vytvoříme novou instanci grafu
        myChartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Skutečnost',
              data: actualData,
              borderColor: 'royalblue',
              tension: 0.1,
              fill: false
            }, {
              label: 'Plán',
              data: plannedData,
              borderColor: 'crimson',
              borderDash: [5, 5],
              tension: 0.1,
              fill: false
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: {
              title: {
                display: true,
                text: 'Vývoj produktivity v čase',
                font: { size: 18 }
              }
            }
          }
        });
      })
      .catch(error => console.error('Chyba při načítání dat pro graf:', error));
  });
}
// NOVÁ FUNKCE PRO ZOBRAZENÍ IFRAME V RÁMU
function showIframeContent(itemId) {
  const item = contentData.library.find(i => i.id === itemId);
  if (!item) return;

  // Najdeme nadpis v našem "rámu" a naplníme ho
  document.getElementById('iframe-title').innerText = item.title;

  // KLÍČOVÁ OPRAVA: Zavoláme showView a předáme jí i URL adresu pro iframe
  showView(item.view_id, item.url);
}
// --- Zpřístupnění funkcí pro HTML ---
// Tímto krokem "vystrčíme" klíčové funkce z modulu,
// aby je našly atributy jako onclick="" v HTML souboru.

// --- Zpřístupnění funkcí pro HTML ---
window.showView = showView;
window.startAssistantChat = startAssistantChat;
window.showFilteredLibrary = showFilteredLibrary;
window.showContent = showContent;
window.showAssistantInfo = showAssistantInfo;
window.closeModal = closeModal;
window.showInteractiveChecklist = showInteractiveChecklist;
window.showMediaInModal = showMediaInModal;
window.showIframeContent = showIframeContent;
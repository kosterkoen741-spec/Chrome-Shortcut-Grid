const defaultShortcuts = [];
let dragSrcEl = null;

// =========================================================================
// 0. I18N VERTALINGEN INITIALISATIE
// =========================================================================
function initTranslations() {
  // Vertaal de paginatitel in de browser-tab
  const pageTitle = chrome.i18n.getMessage('pageTitle');
  if (pageTitle) {
    document.title = pageTitle;
  }

  // Vertaal alle HTML elementen met een data-i18n attribuut
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const messageKey = element.getAttribute('data-i18n');
    const translation = chrome.i18n.getMessage(messageKey);
    if (translation) {
      element.innerText = translation;
    }
  });

  // Vertaal de placeholder van de zoekbalk
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    const searchPlaceholder = chrome.i18n.getMessage('searchPlaceholder');
    if (searchPlaceholder) {
      searchInput.placeholder = searchPlaceholder;
    }
  }
}

document.addEventListener('DOMContentLoaded', initTranslations);

// =========================================================================
// 1. WAFEL DROPDOWN MENU FUNCTIONALITEIT
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
  const waffleBtn = document.getElementById('waffle-btn');
  const appsDropdown = document.getElementById('apps-dropdown');

  if (waffleBtn && appsDropdown) {
    waffleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      appsDropdown.classList.toggle('show');
      waffleBtn.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!appsDropdown.contains(e.target) && e.target !== waffleBtn) {
        appsDropdown.classList.remove('show');
        waffleBtn.classList.remove('active');
      }
    });
  }
});

// =========================================================================
// 2. MODAL VENSTER LOGICA (ADD & EDIT SHORTCUT)
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
  const addShortcutBtn = document.getElementById('add-shortcut-btn');
  const shortcutModal = document.getElementById('shortcut-modal');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalSubmitBtn = document.getElementById('modal-submit-btn');
  const modalTitle = document.getElementById('modal-title');
  
  const nameInput = document.getElementById('shortcut-name');
  const urlInput = document.getElementById('shortcut-url');

  if (addShortcutBtn && shortcutModal) {
    // Open venster voor een Nieuwe Snelkoppeling
    addShortcutBtn.addEventListener('click', () => {
      shortcutModal.setAttribute('data-edit-index', '-1');
      modalTitle.innerText = chrome.i18n.getMessage('modalTitleAdd') || 'Add New Shortcut';
      nameInput.value = '';
      urlInput.value = '';
      shortcutModal.style.display = 'flex';
      nameInput.focus();
    });

    // Sluit venster (Cancel)
    modalCancelBtn.addEventListener('click', () => {
      shortcutModal.style.display = 'none';
    });

    // Opslaan verwerken (Toevoegen óf Bewerken)
    modalSubmitBtn.addEventListener('click', () => {
      const title = nameInput.value.trim();
      let url = urlInput.value.trim();
      const editIndex = parseInt(shortcutModal.getAttribute('data-edit-index'), 10);

      if (!title || !url) {
        alert(chrome.i18n.getMessage('alertFields') || "Please fill out both fields.");
        return;
      }

      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }

      chrome.storage.local.get({ customShortcuts: defaultShortcuts }, (data) => {
        const list = data.customShortcuts;

        if (editIndex === -1) {
          // Nieuw item toevoegen
          list.push({ title: title, url: url });
        } else {
          // Bestaand item updaten
          list[editIndex] = { title: title, url: url };
        }

        chrome.storage.local.set({ customShortcuts: list }, () => {
          shortcutModal.style.display = 'none';
          renderGrid();
        });
      });
    });

    // Sluit venster bij klik buiten de box
    shortcutModal.addEventListener('click', (e) => {
      if (e.target === shortcutModal) {
        shortcutModal.style.display = 'none';
      }
    });
  }

  // Sluit geopende dropdowns van kaarten bij een klik buiten het menu
  document.addEventListener('click', () => {
    document.querySelectorAll('.shortcut-dropdown.show').forEach(dropdown => {
      dropdown.classList.remove('show');
    });
  });
});

// =========================================================================
// 3. GRID OPBOUW & STORAGE LOGICA
// =========================================================================
function renderGrid() {
  chrome.storage.local.get({ 
    maxRows: '8', 
    customShortcuts: defaultShortcuts, 
    bgColor: '#ffffff', 
    fgColor: '#000000'
  }, (settings) => {
    const maxRows = parseInt(settings.maxRows, 10);
    const itemsPerRow = 8; 
    const maxItems = maxRows * itemsPerRow;

    document.documentElement.style.setProperty('--bg-color', settings.bgColor);
    document.documentElement.style.setProperty('--fg-color', settings.fgColor);

    const grid = document.getElementById('shortcut-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const limitedShortcuts = settings.customShortcuts.slice(0, maxItems);

    limitedShortcuts.forEach((site, index) => {
      const card = document.createElement('a');
      card.className = 'shortcut-card';
      card.href = site.url;
      card.setAttribute('draggable', 'true');
      card.setAttribute('data-index', index);

      const firstLetter = site.title ? site.title.charAt(0).toUpperCase() : '?';
      const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(site.url)}`;
      
      const menuEditLabel = chrome.i18n.getMessage('menuEdit') || 'Edit';
      const menuDeleteLabel = chrome.i18n.getMessage('menuDelete') || 'Delete';

      card.innerHTML = `
        <button class="menu-btn" title="Options">···</button>
        <div class="shortcut-dropdown">
          <button class="dropdown-item edit" data-index="${index}">${menuEditLabel}</button>
          <button class="dropdown-item delete" data-index="${index}">${menuDeleteLabel}</button>
        </div>
        <div class="icon">
          <img src="${faviconUrl}" alt="${firstLetter}" onerror="this.style.display='none'; this.parentNode.innerText='${firstLetter}';">
        </div>
        <div class="title">${site.title || 'Untitled'}</div>
      `;

      card.addEventListener('dragstart', handleDragStart);
      card.addEventListener('dragend', handleDragEnd);

      const menuBtn = card.querySelector('.menu-btn');
      const dropdown = card.querySelector('.shortcut-dropdown');

      // Voorkom navigeren en open de dropdown
      menuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Sluit eventuele andere openstaande dropdowns
        document.querySelectorAll('.shortcut-dropdown.show').forEach(d => {
          if (d !== dropdown) d.classList.remove('show');
        });

        dropdown.classList.toggle('show');
      });

      // Handlers voor dropdown-acties
      card.querySelector('.dropdown-item.edit').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropdown.classList.remove('show');
        openEditModal(index, site);
      });

      card.querySelector('.dropdown-item.delete').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropdown.classList.remove('show');
        deleteShortcut(index);
      });
      
      grid.appendChild(card);
    });
  });
}

// Functie om de modal te openen voor bewerken
function openEditModal(index, shortcut) {
  const shortcutModal = document.getElementById('shortcut-modal');
  const modalTitle = document.getElementById('modal-title');
  const nameInput = document.getElementById('shortcut-name');
  const urlInput = document.getElementById('shortcut-url');

  shortcutModal.setAttribute('data-edit-index', index);
  modalTitle.innerText = chrome.i18n.getMessage('modalTitleEdit') || 'Edit Shortcut';
  nameInput.value = shortcut.title;
  urlInput.value = shortcut.url;
  
  shortcutModal.style.display = 'flex';
  nameInput.focus();
}

function deleteShortcut(index) {
  chrome.storage.local.get({ customShortcuts: defaultShortcuts }, (data) => {
    const list = data.customShortcuts;
    list.splice(index, 1);
    chrome.storage.local.set({ customShortcuts: list }, () => {
      renderGrid();
    });
  });
}

// Drag & Drop Handlers
function handleDragStart(e) {
  this.classList.add('dragging');
  dragSrcEl = this;
  e.dataTransfer.effectAllowed = 'move';
}

// Handlers voor slepen stoppen
function handleDragEnd(e) {
  this.classList.remove('dragging');
  
  const cards = document.querySelectorAll('.shortcut-card');
  const newOrderIndices = Array.from(cards).map(card => parseInt(card.getAttribute('data-index'), 10));

  chrome.storage.local.get({ customShortcuts: defaultShortcuts }, (data) => {
    const oldList = data.customShortcuts;
    const newList = newOrderIndices.map(index => oldList[index]);
    
    chrome.storage.local.set({ customShortcuts: newList }, () => {
      renderGrid();
    });
  });
}

const shortcutGridElement = document.getElementById('shortcut-grid');
if (shortcutGridElement) {
  shortcutGridElement.addEventListener('dragover', (e) => {
    e.preventDefault();
    const container = document.getElementById('shortcut-grid');
    const afterElement = getDragAfterElement(container, e.clientX, e.clientY);
    const draggingCard = document.querySelector('.shortcut-card.dragging');
    
    if (draggingCard) {
      if (afterElement == null) {
        container.appendChild(draggingCard);
      } else {
        container.insertBefore(draggingCard, afterElement);
      }
    }
  });
}

function getDragAfterElement(container, x, y) {
  const draggableElements = [...container.querySelectorAll('.shortcut-card:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offsetX = x - box.left - box.width / 2;
    const offsetY = y - box.top - box.height / 2;
    const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

    if (distance < closest.distance) {
      return { distance: distance, element: child };
    } else {
      return closest;
    }
  }, { distance: Infinity }).element;
}

// =========================================================================
// LIVE RUNTIME LUISTERAAR VOOR ZOWEL INSTELLINGEN ALS ANDERE TABBLADEN
// =========================================================================
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.maxRows) {
    renderGrid();
  }
});

document.addEventListener('DOMContentLoaded', renderGrid);
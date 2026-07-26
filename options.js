// =========================================================================
// I18N VERTALINGEN INITIALISATIE
// =========================================================================
function initTranslations() {
  // Vertaal de paginatitel in de browser-tab
  const pageTitle = chrome.i18n.getMessage('optionsTitle');
  if (pageTitle) {
    document.title = pageTitle;
  }

  document.querySelectorAll('[data-i18n]').forEach(element => {
    const messageKey = element.getAttribute('data-i18n');
    const translation = chrome.i18n.getMessage(messageKey);
    if (translation) {
      element.innerText = translation;
    }
  });
}

// Bewaar opties via local storage
function saveOptions() {
  const maxRowsValue = document.getElementById('max-rows-select').value;
  const statusMsg = document.getElementById('status-message');
  const saveBtn = document.getElementById('save-settings-btn');

  // Deactiveer de knop tijdelijk tijdens het opslaan
  saveBtn.disabled = true;

  chrome.storage.local.set({ maxRows: maxRowsValue }, () => {
    // Toon het succesbericht
    statusMsg.innerText = chrome.i18n.getMessage('statusSaved') || "Settings saved successfully.";
    
    // Activeer de knop weer na 1,5 seconde en haal de melding weg
    setTimeout(() => {
      statusMsg.innerText = "";
      saveBtn.disabled = false;
    }, 1500);
  });
}

// Herstel de geselecteerde optie bij het laden
function restoreOptions() {
  chrome.storage.local.get({ maxRows: '8' }, (settings) => {
    const select = document.getElementById('max-rows-select');
    if (select) {
      select.value = settings.maxRows;
    }
  });
}

// Netjes wachten tot de DOM geladen is
document.addEventListener('DOMContentLoaded', () => {
  initTranslations();
  restoreOptions();
  
  // Koppel de event listener hier binnen de DOMContentLoaded
  const saveBtn = document.getElementById('save-settings-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveOptions);
  }
});
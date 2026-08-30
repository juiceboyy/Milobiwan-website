/**
 * Milobiwan – Studio & Repertoire Editor (Admin)
 * Connects directly with Netlify Blobs central database
 */

import { setupPinAuth, getStudioPin } from './admin-auth.js';
import { setupAiTitleSuggestions } from './admin-ai.js';
import { fetchPoems, savePoemToDb, deletePoemFromDb, getStoredPoems, subscribeToLivePoems, LANGUAGE_CONFIG, slugify } from './poems-data.js';

function init() {
  setupPinAuth(async () => {
    await fetchPoems();
    refreshPoemsList();
    updateLivePreview();
    subscribeToLivePoems(() => {
      refreshPoemsList();
    });
  });
  setupEditor();
}

function setupEditor() {
  const form = document.getElementById('poemForm');
  const resetBtn = document.getElementById('resetFormBtn');
  const newPoemBtn = document.getElementById('newPoemBtn');
  const submitBtn = form?.querySelector('button[type="submit"]');

  const inputId = document.getElementById('poemId');
  const inputTitle = document.getElementById('inputTitle');
  const inputTheme = document.getElementById('inputTheme');
  const inputText = document.getElementById('inputText');
  const inputNote = document.getElementById('inputNote');
  const langRadios = document.querySelectorAll('input[name="poemLanguage"]');

  [inputTitle, inputTheme, inputText, inputNote].forEach(el => {
    el?.addEventListener('input', updateLivePreview);
  });

  langRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.lang-radio-label').forEach(lbl => lbl.classList.remove('selected'));
      radio.closest('.lang-radio-label')?.classList.add('selected');
      updateLivePreview();
    });
  });

  // AI Title Suggestions
  setupAiTitleSuggestions({
    getPin: getStudioPin,
    onSelectTitle: () => updateLivePreview()
  });

  function resetForm() {
    form?.reset();
    if (inputId) inputId.value = '';
    const suggestionsBox = document.getElementById('aiSuggestionsContainer');
    if (suggestionsBox) suggestionsBox.innerHTML = '';
    const formTitle = document.getElementById('formTitle');
    const editModeIndicator = document.getElementById('editModeIndicator');
    if (formTitle) formTitle.textContent = 'Tekst Bewerken of Toevoegen';
    if (editModeIndicator) editModeIndicator.textContent = 'NIEUW';
    document.querySelectorAll('.lang-radio-label').forEach((lbl, idx) => {
      if (idx === 0) lbl.classList.add('selected');
      else lbl.classList.remove('selected');
    });
    updateLivePreview();
  }

  resetBtn?.addEventListener('click', resetForm);
  newPoemBtn?.addEventListener('click', () => {
    resetForm();
    inputTitle?.focus();
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = inputTitle.value.trim();
    const lang = document.querySelector('input[name="poemLanguage"]:checked')?.value || 'sranan';
    const theme = inputTheme.value.trim();
    const fullText = inputText.value.trim();
    const translationNote = inputNote.value.trim();
    const langConfig = LANGUAGE_CONFIG[lang] || LANGUAGE_CONFIG.sranan;
    const currentId = inputId.value;

    const poemData = {
      id: currentId || (slugify(title) + '-' + Date.now().toString().slice(-4)),
      title,
      language: lang,
      languageLabel: langConfig.languageLabel,
      flag: langConfig.flag,
      badgeClass: langConfig.badgeClass,
      theme,
      snippet: fullText.split('\n').slice(0, 4).join('\n'),
      fullText,
      translationNote
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Opslaan in Cloud Database...';
    }

    try {
      const result = await savePoemToDb(poemData);
      if (result.success) {
        refreshPoemsList();
        resetForm();
        alert(`Gedicht "${title}" is succesvol opgeslagen in Firebase Firestore!`);
      } else {
        alert(`Fout bij opslaan: ${result.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Verbindingsfout bij het opslaan.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Opslaan in Archief';
      }
    }
  });
}

export function updateLivePreview() {
  const title = document.getElementById('inputTitle')?.value || 'Titel van Gedicht';
  const theme = document.getElementById('inputTheme')?.value || 'Thema';
  const text = document.getElementById('inputText')?.value || 'Hier verschijnt de live voordrachttekst met genummerde strofen...';
  const note = document.getElementById('inputNote')?.value || '';
  const lang = document.querySelector('input[name="poemLanguage"]:checked')?.value || 'sranan';
  const config = LANGUAGE_CONFIG[lang] || LANGUAGE_CONFIG.sranan;

  const previewBadge = document.getElementById('previewBadge');
  const previewTheme = document.getElementById('previewTheme');
  const previewTitle = document.getElementById('previewTitle');
  const previewLines = document.getElementById('previewLines');
  const previewGlossary = document.getElementById('previewGlossary');
  const previewGlossaryText = document.getElementById('previewGlossaryText');

  if (previewBadge) previewBadge.textContent = `${config.flag} ${config.languageLabel.toUpperCase()}`;
  if (previewTheme) previewTheme.textContent = `THEMA: ${theme.toUpperCase()}`;
  if (previewTitle) previewTitle.textContent = title;

  if (previewLines) {
    const lines = text.split('\n');
    previewLines.innerHTML = lines.map((line, idx) => `
      <div class="poem-line-row">
        <span class="poem-line-num">${String(idx + 1).padStart(2, '0')}</span>
        <span class="poem-line-text">${line || '&nbsp;'}</span>
      </div>
    `).join('');
  }

  if (previewGlossary && previewGlossaryText) {
    if (note.trim()) {
      previewGlossary.style.display = 'block';
      previewGlossaryText.textContent = note;
    } else {
      previewGlossary.style.display = 'none';
    }
  }
}

export function refreshPoemsList() {
  const listContainer = document.getElementById('poemsListContainer');
  const countEl = document.getElementById('poemCount');
  const poems = getStoredPoems();

  if (countEl) countEl.textContent = String(poems.length);
  if (!listContainer) return;

  if (poems.length === 0) {
    listContainer.innerHTML = `
      <div style="padding: var(--space-8); text-align: center; color: var(--text-muted);">
        <p style="font-family: var(--font-mono); font-size: 0.85rem; margin-bottom: var(--space-2);">[ NOG GEEN GEDICHTEN IN CLOUD DATABASE ]</p>
        <p style="font-size: 0.95rem;">Gebruik het formulier hierboven om een gedicht toe te voegen aan de database.</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = poems.map(poem => `
    <div class="cms-poem-row">
      <div class="cms-poem-info">
        <div style="display: flex; gap: var(--space-2); align-items: center; margin-bottom: var(--space-1);">
          <span class="badge ${poem.badgeClass}">${poem.flag} ${poem.languageLabel}</span>
          <span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--accent);">${poem.theme}</span>
        </div>
        <h4 style="font-size: 1.15rem; margin-bottom: var(--space-1);">${poem.title}</h4>
        <p style="font-size: 0.8rem; color: var(--text-muted);">${(poem.fullText || '').split('\n').length} versregels</p>
      </div>
      <div class="cms-poem-actions">
        <button class="btn btn-secondary btn-sm edit-poem-btn" data-id="${poem.id}">Bewerken</button>
        <button class="btn btn-secondary btn-sm delete-poem-btn" data-id="${poem.id}" style="color: #ff6b6b; border-color: rgba(255,107,107,0.3);">Verwijderen</button>
      </div>
    </div>
  `).join('');

  listContainer.querySelectorAll('.edit-poem-btn').forEach(btn => {
    btn.addEventListener('click', () => editPoem(btn.dataset.id));
  });

  listContainer.querySelectorAll('.delete-poem-btn').forEach(btn => {
    btn.addEventListener('click', () => deletePoem(btn.dataset.id));
  });
}

function editPoem(id) {
  const poems = getStoredPoems();
  const poem = poems.find(p => p.id === id);
  if (!poem) return;

  const inputId = document.getElementById('poemId');
  const inputTitle = document.getElementById('inputTitle');
  const inputTheme = document.getElementById('inputTheme');
  const inputText = document.getElementById('inputText');
  const inputNote = document.getElementById('inputNote');

  if (inputId) inputId.value = poem.id;
  if (inputTitle) inputTitle.value = poem.title;
  if (inputTheme) inputTheme.value = poem.theme;
  if (inputText) inputText.value = poem.fullText;
  if (inputNote) inputNote.value = poem.translationNote || '';

  const langRadio = document.querySelector(`input[name="poemLanguage"][value="${poem.language}"]`);
  if (langRadio) {
    langRadio.checked = true;
    document.querySelectorAll('.lang-radio-label').forEach(lbl => lbl.classList.remove('selected'));
    langRadio.closest('.lang-radio-label')?.classList.add('selected');
  }

  const formTitle = document.getElementById('formTitle');
  const editModeIndicator = document.getElementById('editModeIndicator');
  if (formTitle) formTitle.textContent = `Bewerken: "${poem.title}"`;
  if (editModeIndicator) editModeIndicator.textContent = 'BEWERK-MODUS';

  const editorSec = document.getElementById('editorSection');
  if (editorSec) {
    window.scrollTo({ top: editorSec.offsetTop - 80, behavior: 'smooth' });
  }
  updateLivePreview();
}

async function deletePoem(id) {
  const poems = getStoredPoems();
  const poem = poems.find(p => p.id === id);
  if (!poem) return;

  if (confirm(`Weet je zeker dat je "${poem.title}" wilt verwijderen uit de database?`)) {
    const result = await deletePoemFromDb(id);
    if (result.success) {
      refreshPoemsList();
      alert(`"${poem.title}" is succesvol verwijderd.`);
    } else {
      alert(`Fout bij verwijderen: ${result.error}`);
    }
  }
}

// DOMContentLoaded Safe Guard
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

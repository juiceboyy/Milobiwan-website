/**
 * Milobiwan – Studio & Repertoire Editor (Admin)
 * Connects directly with Firebase Firestore Cloud Database
 */

import { setupPinAuth, getStudioPin } from './admin-auth.js';
import { setupAiTitleSuggestions } from './admin-ai.js';
import { setupImageOcr } from './admin-ocr.js';
import { refreshPoemsList } from './admin-list.js';
import { fetchPoems, savePoemToDb, getStoredPoems, subscribeToLivePoems, LANGUAGE_CONFIG, slugify } from './poems-data.js';

let ocrManager = null;

function init() {
  setupPinAuth(async () => {
    await fetchPoems();
    refreshPoemsList({ onEditPoem: editPoem });
    updateLivePreview();
    subscribeToLivePoems(() => {
      refreshPoemsList({ onEditPoem: editPoem });
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

  // AI Image OCR Upload
  ocrManager = setupImageOcr({
    onOcrSuccess: (ocrData) => {
      if (ocrData.text && inputText) inputText.value = ocrData.text;
      if (ocrData.language) {
        const radio = document.querySelector(`input[name="poemLanguage"][value="${ocrData.language}"]`);
        if (radio) {
          radio.checked = true;
          document.querySelectorAll('.lang-radio-label').forEach(lbl => lbl.classList.remove('selected'));
          radio.closest('.lang-radio-label')?.classList.add('selected');
        }
      }
      if (Array.isArray(ocrData.suggestedTitles) && ocrData.suggestedTitles.length > 0) {
        const suggestionsBox = document.getElementById('aiSuggestionsContainer');
        if (suggestionsBox) {
          suggestionsBox.innerHTML = ocrData.suggestedTitles.map(t => `
            <button type="button" class="ai-title-chip" data-title="${t.replace(/"/g, '&quot;')}">
              <span class="chip-plus">+</span>
              <span>${t}</span>
            </button>
          `).join('');
          suggestionsBox.querySelectorAll('.ai-title-chip').forEach(chip => {
            chip.addEventListener('click', () => {
              if (inputTitle) inputTitle.value = chip.dataset.title;
              updateLivePreview();
            });
          });
        }
      }
      updateLivePreview();
    },
    onImageChanged: () => updateLivePreview()
  });

  function resetForm() {
    form?.reset();
    if (inputId) inputId.value = '';
    ocrManager?.clear();
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
    const imageUrl = ocrManager?.getImageData() || '';

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
      translationNote,
      imageUrl
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Opslaan in Cloud Database...';
    }

    try {
      const result = await savePoemToDb(poemData);
      if (result.success) {
        refreshPoemsList({ onEditPoem: editPoem });
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
  const theme = document.getElementById('inputTheme')?.value || '';
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
  const previewArtwork = document.getElementById('previewArtworkContainer');
  const previewArtworkImg = document.getElementById('previewArtworkImg');

  if (previewBadge) previewBadge.textContent = `${config.flag} ${config.languageLabel.toUpperCase()}`;
  if (previewTheme) {
    if (theme.trim()) {
      previewTheme.style.display = 'inline-block';
      previewTheme.textContent = `COLLECTIE: ${theme.toUpperCase()}`;
    } else {
      previewTheme.style.display = 'none';
    }
  }
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

  const currentImg = ocrManager?.getImageData() || '';
  if (previewArtwork && previewArtworkImg) {
    if (currentImg) {
      previewArtworkImg.src = currentImg;
      previewArtwork.style.display = 'block';
    } else {
      previewArtwork.style.display = 'none';
    }
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
  if (inputTheme) inputTheme.value = poem.theme || '';
  if (inputText) inputText.value = poem.fullText;
  if (inputNote) inputNote.value = poem.translationNote || '';

  if (ocrManager) {
    ocrManager.setImageData(poem.imageUrl || '');
  }

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

// DOMContentLoaded Safe Guard
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/**
 * Milobiwan Studio – AI Title Suggestion & Language Detection Module
 * Interacts with /api/generate-titles (Google Gemini 2.5 Flash)
 */

export function setupAiTitleSuggestions({ getPin, onSelectTitle }) {
  const suggestBtn = document.getElementById('aiSuggestBtn');
  const suggestionsBox = document.getElementById('aiSuggestionsContainer');
  const inputTitle = document.getElementById('inputTitle');
  const inputText = document.getElementById('inputText');
  const inputTheme = document.getElementById('inputTheme');

  if (!suggestBtn || !suggestionsBox || !inputText) return;

  // Auto-suggest when text is pasted
  inputText.addEventListener('paste', () => {
    setTimeout(() => {
      if (!inputTitle.value.trim() && inputText.value.trim().length > 10) {
        requestTitleSuggestions();
      }
    }, 120);
  });

  // Also trigger after user stops typing if title is empty
  let typingTimer;
  inputText.addEventListener('input', () => {
    clearTimeout(typingTimer);
    if (!inputTitle.value.trim() && inputText.value.trim().length > 30) {
      typingTimer = setTimeout(() => {
        if (!inputTitle.value.trim() && inputText.value.trim().length > 30) {
          requestTitleSuggestions();
        }
      }, 1200);
    }
  });

  suggestBtn.addEventListener('click', () => {
    requestTitleSuggestions();
  });

  async function requestTitleSuggestions() {
    const text = inputText.value.trim();
    if (text.length < 5) {
      alert('Plak of typ eerst wat versregels in het tekstveld om titelsuggesties te genereren.');
      inputText.focus();
      return;
    }

    const theme = inputTheme?.value.trim() || '';
    const pin = getPin();

    suggestBtn.disabled = true;
    suggestBtn.innerHTML = '<span>AI analyseert...</span>';
    suggestionsBox.innerHTML = '<span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent);">AI analyseert taal, cadans en metaforen...</span>';

    try {
      const res = await fetch('/api/generate-titles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-studio-pin': pin
        },
        body: JSON.stringify({ text, theme })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        // Auto-select detected language
        if (data.language) {
          const targetRadio = document.querySelector(`input[name="poemLanguage"][value="${data.language}"]`);
          if (targetRadio) {
            targetRadio.checked = true;
            document.querySelectorAll('.lang-radio-label').forEach(lbl => lbl.classList.remove('selected'));
            targetRadio.closest('.lang-radio-label')?.classList.add('selected');
            if (typeof onSelectTitle === 'function') onSelectTitle('');
          }
        }

        if (Array.isArray(data.titles) && data.titles.length > 0) {
          renderTitleChips(data.titles);
        } else {
          suggestionsBox.innerHTML = '<span style="font-size: 0.75rem; color: var(--text-muted);">Geen suggesties kunnen genereren.</span>';
        }
      } else {
        suggestionsBox.innerHTML = '<span style="font-size: 0.75rem; color: var(--text-muted);">Geen suggesties kunnen genereren.</span>';
      }
    } catch (err) {
      console.error('Fout bij ophalen titels:', err);
      suggestionsBox.innerHTML = '<span style="font-size: 0.75rem; color: #ff6b6b;">Verbindingsfout bij AI titels.</span>';
    } finally {
      suggestBtn.disabled = false;
      suggestBtn.innerHTML = '<span>+ AI Titels</span>';
    }
  }

  function renderTitleChips(titles) {
    suggestionsBox.innerHTML = '';
    titles.forEach(title => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'ai-title-chip';
      chip.innerHTML = `<span class="chip-plus">+</span><span>${title}</span>`;
      chip.addEventListener('click', () => {
        if (inputTitle) {
          inputTitle.value = title;
          inputTitle.focus();
        }
        suggestionsBox.querySelectorAll('.ai-title-chip').forEach(c => c.style.borderColor = '');
        chip.style.borderColor = 'var(--accent)';
        if (typeof onSelectTitle === 'function') {
          onSelectTitle(title);
        }
      });
      suggestionsBox.appendChild(chip);
    });
  }
}

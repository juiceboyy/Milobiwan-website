/**
 * Milobiwan Studio – AI Title Suggestion Module
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
    }, 100);
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

    const lang = document.querySelector('input[name="poemLanguage"]:checked')?.value || 'sranan';
    const theme = inputTheme?.value.trim() || '';
    const pin = getPin();

    suggestBtn.disabled = true;
    suggestBtn.innerHTML = '<span>⏳ AI denkt na...</span>';
    suggestionsBox.innerHTML = '<span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent);">✨ AI analyseert de cadans en metaforen...</span>';

    try {
      const res = await fetch('/api/generate-titles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-studio-pin': pin
        },
        body: JSON.stringify({ text, language: lang, theme })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && Array.isArray(data.titles) && data.titles.length > 0) {
        renderTitleChips(data.titles);
      } else {
        suggestionsBox.innerHTML = '<span style="font-size: 0.75rem; color: var(--text-muted);">Geen suggesties kunnen genereren.</span>';
      }
    } catch (err) {
      console.error('Fout bij ophalen titels:', err);
      suggestionsBox.innerHTML = '<span style="font-size: 0.75rem; color: #ff6b6b;">Verbindingsfout bij AI titels.</span>';
    } finally {
      suggestBtn.disabled = false;
      suggestBtn.innerHTML = '<span>✨ AI Titels</span>';
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

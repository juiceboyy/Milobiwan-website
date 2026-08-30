import { poemsData } from './poems-data.js';

let currentFilter = 'all';
let activePoemId = poemsData[0]?.id || '';

export function initPoetryViewer() {
  const indexContainer = document.getElementById('anthologyIndex');
  const stageContainer = document.getElementById('anthologyStage');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const dialog = document.getElementById('poemDialog');
  const closeBtn = document.getElementById('modalCloseBtn');

  if (!indexContainer || !stageContainer) return;

  renderAnthology(indexContainer, stageContainer, currentFilter);

  // Filter Buttons
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      currentFilter = button.dataset.filter || 'all';

      const matching = currentFilter === 'all'
        ? poemsData
        : poemsData.filter(p => p.language === currentFilter);

      if (matching.length > 0) {
        activePoemId = matching[0].id;
      }
      renderAnthology(indexContainer, stageContainer, currentFilter);
    });
  });

  // Modal Dialog Close Handlers
  if (closeBtn && dialog) {
    closeBtn.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const inDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!inDialog) dialog.close();
    });
  }
}

function renderAnthology(indexEl, stageEl, filter) {
  const filtered = filter === 'all'
    ? poemsData
    : poemsData.filter(p => p.language === filter);

  if (filtered.length === 0) {
    indexEl.innerHTML = `<p style="padding: 1rem; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">GEEN WERKEN IN SELECTIE</p>`;
    stageEl.innerHTML = `<p style="padding: 2rem; color: var(--text-muted);">Selecteer een andere categorie.</p>`;
    return;
  }

  if (!filtered.some(p => p.id === activePoemId)) {
    activePoemId = filtered[0].id;
  }

  // Render Left Index
  indexEl.innerHTML = `
    <div class="archive-index-header">ARCHIEF INDEX // 0${filtered.length}</div>
    ${filtered.map((poem, idx) => `
      <button class="anthology-item ${poem.id === activePoemId ? 'active' : ''}" data-id="${poem.id}">
        <div class="item-top-row">
          <span class="item-index-num">#0${idx + 1}</span>
          <span class="badge ${poem.badgeClass}">${poem.flag} ${poem.languageLabel}</span>
        </div>
        <div class="item-title">${poem.title}</div>
      </button>
    `).join('')}
  `;

  // Attach Index Click Listeners
  indexEl.querySelectorAll('.anthology-item').forEach(btn => {
    btn.addEventListener('click', () => {
      activePoemId = btn.dataset.id;
      indexEl.querySelectorAll('.anthology-item').forEach(item => item.classList.remove('active'));
      btn.classList.add('active');
      renderReadingStage(stageEl, activePoemId);
    });
  });

  // Render Right Stage
  renderReadingStage(stageEl, activePoemId);
}

function renderReadingStage(stageEl, poemId) {
  const poem = poemsData.find(p => p.id === poemId) || poemsData[0];
  if (!poem) return;

  // Split lines and format with line numbers
  const lines = poem.fullText.split('\n');
  const formattedLines = lines.map((line, idx) => {
    const lineNum = String(idx + 1).padStart(2, '0');
    return `
      <div class="poem-line-row">
        <span class="poem-line-num">${lineNum}</span>
        <span class="poem-line-text">${line || '&nbsp;'}</span>
      </div>
    `;
  }).join('');

  stageEl.innerHTML = `
    <div class="stage-header">
      <div class="stage-title-wrap">
        <span class="mono-tag" style="margin-bottom: 0.25rem;">${poem.flag} ${poem.languageLabel} // ${poem.theme}</span>
        <h3>${poem.title}</h3>
      </div>
      <button class="link-editorial" id="openFullModalBtn">
        <span>Volledig Scherm &rarr;</span>
      </button>
    </div>

    <div class="stage-poem-content animate-fade-in">
      ${formattedLines}
    </div>

    ${poem.translationNote ? `
      <div class="stage-glossary-box">
        <div class="glossary-label">CULTURELE CONTEXT & VERTALING</div>
        <p class="glossary-text">${poem.translationNote}</p>
      </div>
    ` : ''}

    <div class="stage-footer-actions">
      <span style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted);">
        VOCAL ARCHIVE // ${poem.id.toUpperCase()}
      </span>
      <a href="#contact" class="btn btn-secondary btn-sm">Draag voor op Evenement</a>
    </div>
  `;

  const modalBtn = stageEl.querySelector('#openFullModalBtn');
  if (modalBtn) {
    modalBtn.addEventListener('click', () => openPoemModal(poem.id));
  }
}

export function openPoemModal(poemId) {
  const poem = poemsData.find(p => p.id === poemId);
  const dialog = document.getElementById('poemDialog');
  if (!poem || !dialog) return;

  const modalTitle = document.getElementById('modalPoemTitle');
  const modalBadge = document.getElementById('modalPoemBadge');
  const modalTheme = document.getElementById('modalPoemTheme');
  const modalBody = document.getElementById('modalPoemBody');
  const modalGlossary = document.getElementById('modalPoemGlossary');

  if (modalTitle) modalTitle.textContent = poem.title;
  if (modalBadge) {
    modalBadge.className = `badge ${poem.badgeClass}`;
    modalBadge.textContent = `${poem.flag} ${poem.languageLabel}`;
  }
  if (modalTheme) modalTheme.textContent = poem.theme;

  if (modalBody) {
    const lines = poem.fullText.split('\n');
    modalBody.innerHTML = lines.map((line, idx) => `
      <div class="poem-line-row">
        <span class="poem-line-num">${String(idx + 1).padStart(2, '0')}</span>
        <span class="poem-line-text">${line || '&nbsp;'}</span>
      </div>
    `).join('');
  }

  if (modalGlossary) {
    if (poem.translationNote) {
      modalGlossary.style.display = 'block';
      modalGlossary.innerHTML = `
        <div class="glossary-label">CULTURELE CONTEXT & VERTALING</div>
        <p class="glossary-text">${poem.translationNote}</p>
      `;
    } else {
      modalGlossary.style.display = 'none';
    }
  }

  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  }
}

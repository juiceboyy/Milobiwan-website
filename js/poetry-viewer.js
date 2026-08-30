import { fetchPoems, getStoredPoems, subscribeToLivePoems } from './poems-data.js';

let currentFilter = 'all';
let activePoemId = '';

export function initPoetryViewer() {
  const indexContainer = document.getElementById('anthologyIndex');
  const stageContainer = document.getElementById('anthologyStage');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const dialog = document.getElementById('poemDialog');
  const closeBtn = document.getElementById('modalCloseBtn');

  if (!indexContainer || !stageContainer) return;

  const currentPoems = getStoredPoems();
  if (currentPoems.length > 0 && !activePoemId) {
    activePoemId = currentPoems[0].id;
  }

  renderAnthology(indexContainer, stageContainer, currentFilter);

  // Real-time Firebase Firestore database synchronisatie
  subscribeToLivePoems((livePoems) => {
    if (livePoems && livePoems.length > 0 && !activePoemId) {
      activePoemId = livePoems[0].id;
    }
    renderAnthology(indexContainer, stageContainer, currentFilter);
  });

  // Filter Buttons
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      currentFilter = button.dataset.filter || 'all';

      const poems = getStoredPoems();
      const matching = currentFilter === 'all'
        ? poems
        : poems.filter(p => p.language === currentFilter);

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
  const allPoems = getStoredPoems();
  const filtered = filter === 'all'
    ? allPoems
    : allPoems.filter(p => p.language === filter);

  if (allPoems.length === 0) {
    indexEl.innerHTML = `
      <div style="padding: var(--space-6) var(--space-4); text-align: center;">
        <span class="mono-tag" style="margin-bottom: var(--space-2); display: inline-block;">ARCHIEF IN VOORBEREIDING</span>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: var(--space-2); line-height: 1.5;">Echte teksten van Milobiwan worden hier binnenkort ingeladen.</p>
      </div>
    `;
    stageEl.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; text-align: center; padding: var(--space-8);">
        <span class="mono-tag" style="margin-bottom: var(--space-3);">[ SPOKEN WORD ARCHIEF ]</span>
        <h3 style="font-size: 1.8rem; margin-bottom: var(--space-3); color: var(--text-primary);">Wachten op originele teksten</h3>
        <p style="max-width: 480px; font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: var(--space-6);">
          De officiële en authentieke teksten van Milobiwan (in Sranantongo, Nederlands en Engels) worden klaargemaakt voor het archief.
        </p>
        <a href="#contact" class="btn btn-secondary btn-sm">Vraag direct een voordracht aan</a>
      </div>
    `;
    return;
  }

  if (filtered.length === 0) {
    indexEl.innerHTML = `<p style="padding: 1.5rem; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); text-align: center;">GEEN WERKEN IN DEZE TAAL</p>`;
    stageEl.innerHTML = `<p style="padding: 2rem; color: var(--text-muted); text-align: center;">Kies een andere taalfilter hierboven.</p>`;
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
  const allPoems = getStoredPoems();
  const poem = allPoems.find(p => p.id === poemId) || allPoems[0];
  if (!poem) return;

  // Split lines and format with line numbers
  const lines = (poem.fullText || '').split('\n');
  const formattedLines = lines.map((line, idx) => {
    const lineNum = String(idx + 1).padStart(2, '0');
    return `
      <div class="poem-line-row">
        <span class="poem-line-num">${lineNum}</span>
        <span class="poem-line-text">${line || '&nbsp;'}</span>
      </div>
    `;
  }).join('');

  const hasImage = Boolean(poem.imageUrl);

  stageEl.innerHTML = `
    <div class="stage-header">
      <div class="stage-title-wrap">
        <span class="mono-tag" style="margin-bottom: 0.25rem;">${poem.flag} ${poem.languageLabel}${poem.theme ? ` // ${poem.theme}` : ''}</span>
        <h3>${poem.title}</h3>
      </div>
      <div style="display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap;">
        ${hasImage ? `
          <div class="view-mode-tabs" id="viewModeTabs">
            <button class="view-tab-btn active" id="tabTextBtn">Tekst</button>
            <button class="view-tab-btn" id="tabImageBtn">Beeld</button>
          </div>
        ` : ''}
        <button class="link-editorial" id="openFullModalBtn">
          <span>Volledig Scherm &rarr;</span>
        </button>
      </div>
    </div>

    <div class="stage-poem-content animate-fade-in" id="stageTextContent">
      ${formattedLines}
    </div>

    ${hasImage ? `
      <div class="stage-artwork-content animate-fade-in" id="stageArtworkContent" style="display: none; text-align: center; padding: var(--space-4);">
        <img src="${poem.imageUrl}" alt="${poem.title} originele typografie" style="max-width: 100%; max-height: 480px; border-radius: var(--radius-md); box-shadow: 0 12px 32px rgba(0,0,0,0.5);">
      </div>
    ` : ''}

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

  // Attach Tab Listeners if Image is available
  if (hasImage) {
    const tabText = stageEl.querySelector('#tabTextBtn');
    const tabImage = stageEl.querySelector('#tabImageBtn');
    const textContent = stageEl.querySelector('#stageTextContent');
    const artworkContent = stageEl.querySelector('#stageArtworkContent');

    tabText?.addEventListener('click', () => {
      tabText.classList.add('active');
      tabImage?.classList.remove('active');
      if (textContent) textContent.style.display = 'block';
      if (artworkContent) artworkContent.style.display = 'none';
    });

    tabImage?.addEventListener('click', () => {
      tabImage.classList.add('active');
      tabText?.classList.remove('active');
      if (textContent) textContent.style.display = 'none';
      if (artworkContent) artworkContent.style.display = 'block';
    });
  }

  const modalBtn = stageEl.querySelector('#openFullModalBtn');
  if (modalBtn) {
    modalBtn.addEventListener('click', () => openPoemModal(poem.id));
  }
}

export function openPoemModal(poemId) {
  const allPoems = getStoredPoems();
  const poem = allPoems.find(p => p.id === poemId);
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
  if (modalTheme) {
    if (poem.theme) {
      modalTheme.style.display = 'inline-block';
      modalTheme.textContent = poem.theme;
    } else {
      modalTheme.style.display = 'none';
    }
  }

  if (modalBody) {
    const lines = poem.fullText.split('\n');
    const textHtml = lines.map((line, idx) => `
      <div class="poem-line-row">
        <span class="poem-line-num">${String(idx + 1).padStart(2, '0')}</span>
        <span class="poem-line-text">${line || '&nbsp;'}</span>
      </div>
    `).join('');

    const imageHtml = poem.imageUrl ? `
      <div style="text-align: center; margin-top: var(--space-6);">
        <div style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--accent); margin-bottom: var(--space-2);">[ ORIGINEEL BEELD ]</div>
        <img src="${poem.imageUrl}" alt="${poem.title}" style="max-width: 100%; max-height: 520px; border-radius: var(--radius-md); box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
      </div>
    ` : '';

    modalBody.innerHTML = textHtml + imageHtml;
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

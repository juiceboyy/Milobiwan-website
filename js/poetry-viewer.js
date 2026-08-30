import { getStoredPoems, subscribeToLivePoems } from './poems-data.js';
import { openPoemModal } from './poetry-modal.js';

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
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: var(--space-2); line-height: 1.5;">Originele teksten en beeldopnames worden ingeladen.</p>
      </div>
    `;
    stageEl.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; text-align: center; padding: var(--space-8);">
        <span class="mono-tag" style="margin-bottom: var(--space-3);">[ SPOKEN WORD ARCHIEF ]</span>
        <h3 style="font-size: 1.8rem; margin-bottom: var(--space-3); color: var(--text-primary);">Wachten op originele teksten</h3>
        <p style="max-width: 480px; font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: var(--space-6);">
          De officiële en authentieke teksten van Milobiwan worden klaargemaakt voor het archief.
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
        <span class="item-index-num">#0${idx + 1}</span>
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

  const hasImage = Boolean(poem.imageUrl);
  const lines = (poem.fullText || '').split('\n');
  const formattedLines = lines.map((line, idx) => `
    <div class="poem-line-row">
      <span class="poem-line-num">${String(idx + 1).padStart(2, '0')}</span>
      <span class="poem-line-text">${line || '&nbsp;'}</span>
    </div>
  `).join('');

  stageEl.innerHTML = `
    <div class="stage-header">
      <div class="stage-title-wrap">
        <span class="mono-tag" style="margin-bottom: 0.25rem;">${poem.flag} ${poem.languageLabel}${poem.theme ? ` // ${poem.theme}` : ''}</span>
        <h3>${poem.title}</h3>
      </div>
      <div style="display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap;">
        ${hasImage ? `
          <div class="view-mode-tabs" id="viewModeTabs">
            <button class="view-tab-btn active" id="tabImageBtn">Beeld</button>
            <button class="view-tab-btn" id="tabTextBtn">Tekst</button>
          </div>
        ` : ''}
        <button class="link-editorial" id="openFullModalBtn">
          <span>Volledig Scherm &rarr;</span>
        </button>
      </div>
    </div>

    ${hasImage ? `
      <div class="stage-artwork-content animate-fade-in" id="stageArtworkContent">
        <div class="stage-artwork-frame">
          <img src="${poem.imageUrl}" alt="${poem.title} visueel werk" class="stage-artwork-img">
        </div>
        <div class="artwork-switch-prompt">
          <span>Originele typografie.</span>
          <button class="link-editorial" id="quickSwitchTextBtn"><span>Lees versregels &rarr;</span></button>
        </div>
      </div>
    ` : ''}

    <div class="stage-poem-content animate-fade-in" id="stageTextContent" style="${hasImage ? 'display: none;' : 'display: block;'}">
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

  // Attach Tab & Toggle Listeners
  if (hasImage) {
    const tabImage = stageEl.querySelector('#tabImageBtn');
    const tabText = stageEl.querySelector('#tabTextBtn');
    const quickSwitch = stageEl.querySelector('#quickSwitchTextBtn');
    const textContent = stageEl.querySelector('#stageTextContent');
    const artworkContent = stageEl.querySelector('#stageArtworkContent');

    const showText = () => {
      tabText?.classList.add('active');
      tabImage?.classList.remove('active');
      if (textContent) textContent.style.display = 'block';
      if (artworkContent) artworkContent.style.display = 'none';
    };

    const showImage = () => {
      tabImage?.classList.add('active');
      tabText?.classList.remove('active');
      if (textContent) textContent.style.display = 'none';
      if (artworkContent) artworkContent.style.display = 'flex';
    };

    tabText?.addEventListener('click', showText);
    quickSwitch?.addEventListener('click', showText);
    tabImage?.addEventListener('click', showImage);
  }

  const modalBtn = stageEl.querySelector('#openFullModalBtn');
  if (modalBtn) {
    modalBtn.addEventListener('click', () => openPoemModal(poem.id));
  }
}

export { openPoemModal };

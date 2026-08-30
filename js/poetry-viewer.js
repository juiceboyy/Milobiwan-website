import { getStoredPoems, subscribeToLivePoems } from './poems-data.js';
import { openPoemModal } from './poetry-modal.js';
import { sharePoem } from './poem-share.js';

let currentFilter = 'all';
let currentTagFilter = 'all';
let activePoemId = '';

export function getPoemTags(poem) {
  if (Array.isArray(poem.tags) && poem.tags.length > 0) return poem.tags.map(t => String(t).trim()).filter(Boolean);
  if (poem.theme && typeof poem.theme === 'string') return poem.theme.split(',').map(t => t.trim()).filter(Boolean);
  return [];
}

export function initPoetryViewer() {
  const indexContainer = document.getElementById('anthologyIndex');
  const stageContainer = document.getElementById('anthologyStage');
  const tagFilterBar = document.getElementById('tagFilterBar');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const dialog = document.getElementById('poemDialog');
  const closeBtn = document.getElementById('modalCloseBtn');

  if (!indexContainer || !stageContainer) return;

  const currentPoems = getStoredPoems();
  if (currentPoems.length > 0 && !activePoemId) activePoemId = currentPoems[0].id;

  renderAnthology(indexContainer, stageContainer, tagFilterBar);

  subscribeToLivePoems((livePoems) => {
    if (livePoems?.length > 0 && !activePoemId) activePoemId = livePoems[0].id;
    renderAnthology(indexContainer, stageContainer, tagFilterBar);
  });

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      currentFilter = button.dataset.filter || 'all';
      renderAnthology(indexContainer, stageContainer, tagFilterBar);
    });
  });

  if (closeBtn && dialog) {
    closeBtn.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const inDialog = rect.top <= e.clientY && e.clientY <= rect.top + rect.height && rect.left <= e.clientX && e.clientX <= rect.left + rect.width;
      if (!inDialog) dialog.close();
    });
  }
}

function renderTagFilterBar(allPoems, tagBarEl, onSelectTag) {
  if (!tagBarEl) return;
  const tagSet = new Set();
  allPoems.forEach(p => getPoemTags(p).forEach(t => tagSet.add(t)));
  const uniqueTags = Array.from(tagSet).sort();

  if (uniqueTags.length === 0) {
    tagBarEl.style.display = 'none';
    tagBarEl.innerHTML = '';
    return;
  }

  tagBarEl.style.display = 'flex';
  tagBarEl.innerHTML = `
    <span class="tag-filter-label">TAGS:</span>
    <button class="tag-chip-btn ${currentTagFilter === 'all' ? 'active' : ''}" data-tag="all">Alles</button>
    ${uniqueTags.map(tag => `<button class="tag-chip-btn ${currentTagFilter === tag ? 'active' : ''}" data-tag="${tag}">#${tag}</button>`).join('')}
  `;

  tagBarEl.querySelectorAll('.tag-chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTagFilter = btn.dataset.tag || 'all';
      if (typeof onSelectTag === 'function') onSelectTag();
    });
  });
}

function renderAnthology(indexEl, stageEl, tagBarEl) {
  const allPoems = getStoredPoems();
  renderTagFilterBar(allPoems, tagBarEl, () => renderAnthology(indexEl, stageEl, tagBarEl));

  const filtered = allPoems.filter(p => {
    const langMatch = currentFilter === 'all' || p.language === currentFilter;
    const tagMatch = currentTagFilter === 'all' || getPoemTags(p).includes(currentTagFilter);
    return langMatch && tagMatch;
  });

  if (allPoems.length === 0) {
    indexEl.innerHTML = `<div style="padding: var(--space-6) var(--space-4); text-align: center;"><span class="mono-tag" style="margin-bottom: var(--space-2); display: inline-block;">ARCHIEF IN VOORBEREIDING</span><p style="font-size: 0.85rem; color: var(--text-muted); margin-top: var(--space-2); line-height: 1.5;">Originele teksten en beeldopnames worden ingeladen.</p></div>`;
    stageEl.innerHTML = `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; text-align: center; padding: var(--space-8);"><span class="mono-tag" style="margin-bottom: var(--space-3);">[ SPOKEN WORD ARCHIEF ]</span><h3 style="font-size: 1.8rem; margin-bottom: var(--space-3); color: var(--text-primary);">Wachten op originele teksten</h3><p style="max-width: 480px; font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: var(--space-6);">De officiële en authentieke teksten van Milobiwan worden klaargemaakt voor het archief.</p><a href="#contact" class="btn btn-secondary btn-sm">Vraag direct een voordracht aan</a></div>`;
    return;
  }

  if (filtered.length === 0) {
    indexEl.innerHTML = `<p style="padding: 1.5rem; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); text-align: center;">GEEN WERKEN GEVONDEN</p>`;
    stageEl.innerHTML = `<p style="padding: 2rem; color: var(--text-muted); text-align: center;">Kies een andere taal of tag hierboven.</p>`;
    return;
  }

  if (!filtered.some(p => p.id === activePoemId)) activePoemId = filtered[0].id;

  indexEl.innerHTML = `
    <div class="archive-index-header">ARCHIEF INDEX // 0${filtered.length}</div>
    ${filtered.map((poem, idx) => `
      <button class="anthology-item ${poem.id === activePoemId ? 'active' : ''}" data-id="${poem.id}">
        <span class="item-index-num">#0${idx + 1}</span>
        <div class="item-title">${poem.title}</div>
      </button>
    `).join('')}
  `;

  indexEl.querySelectorAll('.anthology-item').forEach(btn => {
    btn.addEventListener('click', () => {
      activePoemId = btn.dataset.id;
      indexEl.querySelectorAll('.anthology-item').forEach(item => item.classList.remove('active'));
      btn.classList.add('active');
      renderReadingStage(stageEl, activePoemId);
    });
  });

  renderReadingStage(stageEl, activePoemId);
}

function renderReadingStage(stageEl, poemId) {
  const allPoems = getStoredPoems();
  const poem = allPoems.find(p => p.id === poemId) || allPoems[0];
  if (!poem) return;

  const hasImage = Boolean(poem.imageUrl);
  const tags = getPoemTags(poem);
  const tagsHtml = tags.length > 0
    ? tags.map(t => `<span class="badge" style="font-size: 0.65rem; color: var(--accent); border-color: rgba(212,140,93,0.35);">#${t}</span>`).join(' ')
    : '';

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
        <div style="display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; margin-bottom: 0.35rem;">
          <span class="badge ${poem.badgeClass}">${poem.flag} ${poem.languageLabel}</span>
          ${tagsHtml}
        </div>
        <h3>${poem.title}</h3>
      </div>
      <div style="display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap;">
        ${hasImage ? `
          <div class="view-mode-tabs" id="viewModeTabs">
            <button class="view-tab-btn active" id="tabImageBtn">Beeld</button>
            <button class="view-tab-btn" id="tabTextBtn">Tekst</button>
          </div>
        ` : ''}
        <button class="link-editorial" id="stageShareBtn" title="Deel als beeld met copyright">
          <span>Deel Werk &rarr;</span>
        </button>
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
      <div style="display: flex; gap: var(--space-2); align-items: center;">
        <button class="btn btn-secondary btn-sm" id="stageFooterShareBtn">Deel Werk</button>
        <a href="#contact" class="btn btn-secondary btn-sm">Draag voor op Evenement</a>
      </div>
    </div>
  `;

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

  const shareBtn = stageEl.querySelector('#stageShareBtn');
  if (shareBtn) shareBtn.addEventListener('click', () => sharePoem(poem, shareBtn));

  const footerShareBtn = stageEl.querySelector('#stageFooterShareBtn');
  if (footerShareBtn) footerShareBtn.addEventListener('click', () => sharePoem(poem, footerShareBtn));

  const modalBtn = stageEl.querySelector('#openFullModalBtn');
  if (modalBtn) modalBtn.addEventListener('click', () => openPoemModal(poem.id));
}

export { openPoemModal };

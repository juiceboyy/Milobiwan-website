import { poemsData } from './poems-data.js';
import { playPoemTrack } from './audio-player.js';

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
      
      const matchingPoems = currentFilter === 'all' 
        ? poemsData 
        : poemsData.filter(p => p.language === currentFilter);
      
      if (matchingPoems.length > 0) {
        activePoemId = matchingPoems[0].id;
      }
      renderAnthology(indexContainer, stageContainer, currentFilter);
    });
  });

  // Modal Close Handlers
  if (closeBtn && dialog) {
    closeBtn.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (!isInDialog) dialog.close();
    });
  }
}

function renderAnthology(indexEl, stageEl, filter) {
  const filtered = filter === 'all'
    ? poemsData
    : poemsData.filter(p => p.language === filter);

  if (filtered.length === 0) {
    indexEl.innerHTML = `<p style="padding: 1rem; color: var(--color-ink-muted);">Geen gedichten in deze selectie.</p>`;
    stageEl.innerHTML = `<p style="padding: 2rem; color: var(--color-ink-muted);">Selecteer een andere taal of categorie.</p>`;
    return;
  }

  // Ensure active poem exists in current filter
  if (!filtered.some(p => p.id === activePoemId)) {
    activePoemId = filtered[0].id;
  }

  // Render Index Items
  indexEl.innerHTML = `
    <div class="index-header">Inhoudsopgave (${filtered.length})</div>
    ${filtered.map(poem => `
      <button class="anthology-item ${poem.id === activePoemId ? 'active' : ''}" data-id="${poem.id}">
        <div class="item-meta">
          <span class="badge ${poem.badgeClass}">${poem.flag} ${poem.languageLabel}</span>
          <span class="item-theme">${poem.theme}</span>
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

  // Render the current active poem on the stage
  renderReadingStage(stageEl, activePoemId);
}

function renderReadingStage(stageEl, poemId) {
  const poem = poemsData.find(p => p.id === poemId) || poemsData[0];
  if (!poem) return;

  stageEl.innerHTML = `
    <div class="reader-header">
      <div class="reader-title-box">
        <span class="badge ${poem.badgeClass}" style="margin-bottom: 0.6rem;">${poem.flag} ${poem.languageLabel} • ${poem.theme}</span>
        <h3>${poem.title}</h3>
      </div>
      <button class="btn btn-secondary btn-sm" id="stageListenBtn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        <span>Beluister (${poem.audioDuration})</span>
      </button>
    </div>

    <div class="reader-poem-body animate-fade-in">${poem.fullText}</div>

    ${poem.translationNote ? `
      <div class="reader-glossary">
        <h5>Culturele Duiding & Vertaling</h5>
        <p>${poem.translationNote}</p>
      </div>
    ` : ''}

    <div class="reader-actions">
      <button class="link-literary" id="openFullModalBtn">
        <span>Lees in volledig scherm &rarr;</span>
      </button>
      <span style="font-size: 0.85rem; color: var(--color-ink-muted);">Milobiwan (Mieke) • Voordrachtsrepertoire</span>
    </div>
  `;

  // Attach actions
  const listenBtn = stageEl.querySelector('#stageListenBtn');
  if (listenBtn) {
    listenBtn.addEventListener('click', () => playPoemTrack(poem));
  }

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
  const modalListenBtn = document.getElementById('modalListenBtn');

  if (modalTitle) modalTitle.textContent = poem.title;
  if (modalBadge) {
    modalBadge.className = `badge ${poem.badgeClass}`;
    modalBadge.textContent = `${poem.flag} ${poem.languageLabel}`;
  }
  if (modalTheme) modalTheme.textContent = poem.theme;
  if (modalBody) modalBody.textContent = poem.fullText;

  if (modalGlossary) {
    if (poem.translationNote) {
      modalGlossary.style.display = 'block';
      modalGlossary.innerHTML = `
        <h5>Culturele Duiding & Woordverklaring</h5>
        <p style="white-space: pre-line; margin-bottom: 0;">${poem.translationNote}</p>
      `;
    } else {
      modalGlossary.style.display = 'none';
    }
  }

  if (modalListenBtn) {
    modalListenBtn.onclick = () => playPoemTrack(poem);
  }

  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  }
}

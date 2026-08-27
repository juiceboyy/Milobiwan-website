import { poemsData } from './poems-data.js';
import { playPoemTrack } from './audio-player.js';

let currentFilter = 'all';

export function initPoetryViewer() {
  const gridElement = document.getElementById('poetryGrid');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const dialog = document.getElementById('poemDialog');
  const closeBtn = document.getElementById('modalCloseBtn');

  if (!gridElement) return;

  renderPoemCards(gridElement, currentFilter);

  // Filter button click handlers
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      currentFilter = button.dataset.filter || 'all';
      renderPoemCards(gridElement, currentFilter);
    });
  });

  // Modal close handlers
  if (closeBtn && dialog) {
    closeBtn.addEventListener('click', () => {
      dialog.close();
    });

    dialog.addEventListener('click', (event) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        dialog.close();
      }
    });
  }
}

function renderPoemCards(container, filter) {
  const filtered = filter === 'all' 
    ? poemsData 
    : poemsData.filter(poem => poem.language === filter);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--color-text-muted);">
        <p>Geen gedichten gevonden voor deze selectie.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(poem => `
    <article class="poem-card animate-fade-in" data-id="${poem.id}">
      <div>
        <div class="poem-card-header">
          <span class="badge ${poem.badgeClass}">${poem.flag} ${poem.languageLabel}</span>
          <span class="poem-card-theme">${poem.theme}</span>
        </div>
        <h3 class="poem-card-title">${poem.title}</h3>
        <p class="poem-snippet">${poem.snippet}</p>
      </div>
      <div class="poem-card-footer">
        <button class="btn-read-poem" data-action="read" data-id="${poem.id}" aria-label="Lees ${poem.title}">
          Lees gedicht &rarr;
        </button>
        <button class="btn-listen-mini" data-action="listen" data-id="${poem.id}" aria-label="Beluister ${poem.title}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          ${poem.audioDuration}
        </button>
      </div>
    </article>
  `).join('');

  // Attach card event listeners
  container.querySelectorAll('[data-action="read"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const poemId = btn.dataset.id;
      openPoemModal(poemId);
    });
  });

  container.querySelectorAll('[data-action="listen"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const poemId = btn.dataset.id;
      const poem = poemsData.find(p => p.id === poemId);
      if (poem) {
        playPoemTrack(poem);
      }
    });
  });
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
        <h5>Toelichting & Achtergrond</h5>
        <p style="white-space: pre-line; margin-bottom: 0;">${poem.translationNote}</p>
      `;
    } else {
      modalGlossary.style.display = 'none';
    }
  }

  if (modalListenBtn) {
    modalListenBtn.onclick = () => {
      playPoemTrack(poem);
    };
  }

  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  }
}

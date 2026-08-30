/**
 * Milobiwan Studio – Repertoire List Manager Module
 * Handles display, editing triggers, and deletion of poems
 */

import { getStoredPoems, deletePoemFromDb } from './poems-data.js';

export function refreshPoemsList({ onEditPoem }) {
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
          ${poem.theme ? `<span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--accent);">📁 ${poem.theme}</span>` : ''}
          ${poem.imageUrl ? `<span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted);">🖼️ Kaart</span>` : ''}
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
    btn.addEventListener('click', () => {
      if (typeof onEditPoem === 'function') onEditPoem(btn.dataset.id);
    });
  });

  listContainer.querySelectorAll('.delete-poem-btn').forEach(btn => {
    btn.addEventListener('click', () => deletePoem(btn.dataset.id, () => refreshPoemsList({ onEditPoem })));
  });
}

async function deletePoem(id, onDeleted) {
  const poems = getStoredPoems();
  const poem = poems.find(p => p.id === id);
  if (!poem) return;

  if (confirm(`Weet je zeker dat je "${poem.title}" wilt verwijderen uit de database?`)) {
    const result = await deletePoemFromDb(id);
    if (result.success) {
      if (typeof onDeleted === 'function') onDeleted();
      alert(`"${poem.title}" is succesvol verwijderd.`);
    } else {
      alert(`Fout bij verwijderen: ${result.error}`);
    }
  }
}

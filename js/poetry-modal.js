import { getStoredPoems } from './poems-data.js';
import { sharePoem } from './poem-share.js';

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
  const modalShareBtn = document.getElementById('modalShareBtn');

  if (modalShareBtn) {
    // Clone node or replace onclick to clear previous poem listeners
    const newShareBtn = modalShareBtn.cloneNode(true);
    modalShareBtn.parentNode.replaceChild(newShareBtn, modalShareBtn);
    newShareBtn.addEventListener('click', () => sharePoem(poem, newShareBtn));
  }

  if (modalTitle) modalTitle.textContent = poem.title;
  if (modalBadge) {
    modalBadge.className = `badge ${poem.badgeClass}`;
    modalBadge.textContent = `${poem.flag} ${poem.languageLabel}`;
  }
  const poemTags = Array.isArray(poem.tags) && poem.tags.length > 0
    ? poem.tags
    : (poem.theme ? String(poem.theme).split(',').map(t => t.trim()).filter(Boolean) : []);

  if (modalTheme) {
    if (poemTags.length > 0) {
      modalTheme.style.display = 'inline-flex';
      modalTheme.style.gap = 'var(--space-1)';
      modalTheme.innerHTML = poemTags.map(t => `<span class="badge" style="font-size: 0.68rem; color: var(--accent); border-color: rgba(212,140,93,0.35);">#${t}</span>`).join(' ');
    } else {
      modalTheme.style.display = 'none';
      modalTheme.innerHTML = '';
    }
  }

  if (modalBody) {
    const hasImage = Boolean(poem.imageUrl);
    const lines = (poem.fullText || '').split('\n');
    const textHtml = `
      <div id="modalTextSection" style="${hasImage ? 'display: none;' : 'display: block;'}">
        ${lines.map((line, idx) => `
          <div class="poem-line-row">
            <span class="poem-line-num">${String(idx + 1).padStart(2, '0')}</span>
            <span class="poem-line-text">${line || '&nbsp;'}</span>
          </div>
        `).join('')}
      </div>
    `;

    const pages = Array.isArray(poem.imagePages) && poem.imagePages.length > 0
      ? poem.imagePages
      : (poem.imageUrl ? [poem.imageUrl] : []);

    const imagePagesHtml = pages.map((pImg, idx) => `
      <div class="multipage-page-item" style="margin-bottom: var(--space-4);">
        ${pages.length > 1 ? `<div class="multipage-page-badge">[ PAGINA ${idx + 1} / ${pages.length} ]</div>` : ''}
        <img src="${pImg}" alt="${poem.title} pagina ${idx + 1}" style="max-width: 100%; max-height: 540px; border-radius: var(--radius-md); box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
      </div>
    `).join('');

    const imageHtml = hasImage ? `
      <div id="modalImageSection" style="text-align: center; margin-bottom: var(--space-6);">
        <div style="display: flex; justify-content: center; margin-bottom: var(--space-4);">
          <div class="view-mode-tabs">
            <button class="view-tab-btn active" id="modalTabImageBtn">Beeld</button>
            <button class="view-tab-btn" id="modalTabTextBtn">Tekst</button>
          </div>
        </div>
        ${imagePagesHtml}
        <div class="artwork-copyright-footer" style="margin-top: var(--space-4);">
          <div class="artwork-copyright-text">&copy; Milobiwan &bull; milobiwan.nl &bull; Alle rechten voorbehouden</div>
          <a href="${poem.imageUrl}" download="${poem.id || 'milobiwan'}.jpg" class="artwork-download-link">
            <span>Download Origineel &darr;</span>
          </a>
        </div>
      </div>
    ` : '';

    modalBody.innerHTML = imageHtml + textHtml;

    if (hasImage) {
      const modalTabImage = modalBody.querySelector('#modalTabImageBtn');
      const modalTabText = modalBody.querySelector('#modalTabTextBtn');
      const imgSec = modalBody.querySelector('#modalImageSection');
      const txtSec = modalBody.querySelector('#modalTextSection');

      modalTabText?.addEventListener('click', () => {
        modalTabText.classList.add('active');
        modalTabImage?.classList.remove('active');
        if (txtSec) txtSec.style.display = 'block';
        if (imgSec) {
          const img = imgSec.querySelector('img');
          if (img) img.style.display = 'none';
        }
      });

      modalTabImage?.addEventListener('click', () => {
        modalTabImage.classList.add('active');
        modalTabText?.classList.remove('active');
        if (txtSec) txtSec.style.display = 'none';
        if (imgSec) {
          const img = imgSec.querySelector('img');
          if (img) img.style.display = 'inline-block';
        }
      });
    }
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

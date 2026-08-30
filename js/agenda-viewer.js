/**
 * Milobiwan – Dynamic Agenda & Performance Viewer
 * Fetches and renders live performance dates from Firebase Firestore
 */

import { getPerformancesFromFirestore, onPerformancesSnapshot } from './firebase-db.js';
import {
  EVENTS_STORAGE_KEY,
  loadEventsCache,
  saveEventsCache,
  formatDutchDate,
  escapeHtml
} from './events-utils.js';

export function initAgendaViewer() {
  const container = document.getElementById('agendaContainer');
  if (!container) return;

  const cached = loadEventsCache();
  if (Array.isArray(cached) && cached.length > 0) {
    renderAgenda(cached, container);
  }

  try {
    onPerformancesSnapshot((events) => {
      if (Array.isArray(events)) {
        saveEventsCache(events);
        renderAgenda(events, container);
      }
    });
  } catch (err) {
    console.warn('Real-time agenda snapshot error, fetching once:', err);
    fetchAgendaOnce(container);
  }
}

async function fetchAgendaOnce(container) {
  try {
    const events = await getPerformancesFromFirestore();
    if (Array.isArray(events)) {
      saveEventsCache(events);
      renderAgenda(events, container);
    }
  } catch (err) {
    console.error('Kon optredens niet laden:', err);
    renderFallbackEmpty(container);
  }
}

function renderAgenda(events, container) {
  if (!events || events.length === 0) {
    renderFallbackEmpty(container);
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  
  const upcoming = events
    .filter(ev => ev.date >= todayStr)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const past = events
    .filter(ev => ev.date < todayStr)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  let html = '';

  if (upcoming.length > 0) {
    html += `
      <div class="ledger-list">
        ${upcoming.map(ev => renderEventRow(ev)).join('')}
      </div>
    `;
  } else {
    html += `
      <div class="agenda-empty">
        <span class="agenda-empty-tag">Binnenkort meer</span>
        <p>Er zijn momenteel geen openbare optredens gepland. Nieuwe speeldata en voordrachten voor het komende seizoen worden hier aangekondigd.</p>
        <a href="#contact" class="btn btn-secondary btn-sm" style="margin-top: var(--space-2);">Boek een voordracht</a>
      </div>
    `;
  }

  if (past.length > 0) {
    html += `
      <div class="past-events-wrapper" style="margin-top: var(--space-6);">
        <button type="button" class="past-events-toggle" id="pastEventsToggle" aria-expanded="false">
          <span>Eerdere optredens (${past.length})</span>
          <span class="past-toggle-arrow">&darr;</span>
        </button>
        <div class="past-events-list ledger-list" id="pastEventsList" style="display: none; margin-top: var(--space-4);">
          ${past.map(ev => renderEventRow(ev, true)).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;

  const toggleBtn = container.querySelector('#pastEventsToggle');
  const pastList = container.querySelector('#pastEventsList');
  if (toggleBtn && pastList) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = pastList.style.display === 'none';
      pastList.style.display = isHidden ? 'flex' : 'none';
      toggleBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
      const arrow = toggleBtn.querySelector('.past-toggle-arrow');
      if (arrow) arrow.innerHTML = isHidden ? '&uarr;' : '&darr;';
    });
  }
}

function renderEventRow(ev, isPast = false) {
  const formattedDate = formatDutchDate(ev.date);
  const title = escapeHtml(ev.title);
  const location = escapeHtml(ev.location);
  const time = ev.time ? ` • ${escapeHtml(ev.time)}` : '';
  const url = ev.url || '#contact';
  const isExternal = url.startsWith('http://') || url.startsWith('https://');
  const targetAttr = isExternal ? 'target="_blank" rel="noopener noreferrer"' : '';
  const btnText = escapeHtml(ev.buttonText || (isPast ? 'Archief' : 'Reserveren'));

  return `
    <article class="ledger-row ${isPast ? 'ledger-row-past' : ''}">
      <div class="ledger-date">${formattedDate}</div>
      <div class="ledger-info">
        <h4>${title}</h4>
        <p class="ledger-venue">${location}${time}</p>
      </div>
      ${isPast ? '<span class="event-badge-past" style="padding: 6px 12px;">Afgelopen</span>' : `<a href="${url}" class="btn btn-secondary btn-sm" ${targetAttr}>${btnText}</a>`}
    </article>
  `;
}

function renderFallbackEmpty(container) {
  container.innerHTML = `
    <div class="agenda-empty">
      <span class="agenda-empty-tag">Binnenkort meer</span>
      <p>Er zijn momenteel geen openbare optredens gepland. Nieuwe speeldata en voordrachten voor het komende seizoen worden hier aangekondigd.</p>
      <a href="#contact" class="btn btn-secondary btn-sm" style="margin-top: var(--space-2);">Boek een voordracht</a>
    </div>
  `;
}

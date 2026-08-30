/**
 * Milobiwan – Studio Events & Performance Manager
 * Module voor het beheren van optredens en agenda in Firebase Firestore
 */

import {
  getPerformancesFromFirestore,
  savePerformanceToFirestore,
  deletePerformanceFromFirestore,
  onPerformancesSnapshot
} from './firebase-db.js';
import {
  loadEventsCache,
  saveEventsCache,
  formatDutchDate,
  showAdminToast,
  escapeHtml
} from './events-utils.js';

let currentEvents = loadEventsCache();

export function initAdminEvents() {
  const eventForm = document.getElementById('eventForm');
  const resetEventBtn = document.getElementById('resetEventBtn');
  if (!eventForm) return;

  renderAdminEventsList(currentEvents);

  try {
    onPerformancesSnapshot((events) => {
      if (Array.isArray(events)) {
        currentEvents = events;
        saveEventsCache(events);
        renderAdminEventsList(events);
      }
    });
  } catch (err) {
    console.warn('Kon realtime listener voor events niet laden:', err);
    loadEventsOnce();
  }

  eventForm.addEventListener('submit', handleEventSubmit);

  if (resetEventBtn) {
    resetEventBtn.addEventListener('click', resetEventForm);
  }
}

async function loadEventsOnce() {
  try {
    const events = await getPerformancesFromFirestore();
    if (Array.isArray(events) && events.length > 0) {
      currentEvents = events;
      saveEventsCache(events);
      renderAdminEventsList(events);
    }
  } catch (err) {
    console.error('Fout bij eenmalig laden van events:', err);
  }
}

async function handleEventSubmit(e) {
  e.preventDefault();

  const idInput = document.getElementById('eventId');
  const titleInput = document.getElementById('eventTitle');
  const dateInput = document.getElementById('eventDate');
  const timeInput = document.getElementById('eventTime');
  const locationInput = document.getElementById('eventLocation');
  const urlInput = document.getElementById('eventUrl');
  const btnTextInput = document.getElementById('eventBtnText');

  const title = titleInput.value.trim();
  const date = dateInput.value.trim();
  const time = timeInput.value.trim();
  const location = locationInput.value.trim();
  const url = urlInput.value.trim();
  const buttonText = btnTextInput.value.trim() || 'Reserveren';

  if (!title || !date || !location) {
    alert('Vul minimaal een titel, datum en locatie in.');
    return;
  }

  const isEdit = Boolean(idInput.value);
  const eventId = isEdit ? idInput.value : 'event-' + Date.now();

  const eventData = {
    id: eventId,
    title,
    date,
    time,
    location,
    url: url || '#contact',
    buttonText
  };

  const existingIdx = currentEvents.findIndex(ev => ev.id === eventId);
  if (existingIdx >= 0) {
    currentEvents[existingIdx] = eventData;
  } else {
    currentEvents.unshift(eventData);
  }
  saveEventsCache(currentEvents);
  renderAdminEventsList(currentEvents);

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Opslaan in Database...';
  }

  try {
    await savePerformanceToFirestore(eventData);
    showAdminToast(isEdit ? 'Optreden succesvol bijgewerkt!' : 'Nieuw optreden toegevoegd aan agenda!');
    resetEventForm();
    alert(`Optreden "${title}" is succesvol opgeslagen!`);
  } catch (err) {
    console.error('Fout bij opslaan in Firestore:', err);
    alert('Let op: Lokaal opgeslagen, maar kon niet direct naar Firestore schrijven: ' + (err.message || 'Verbindingsfout'));
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Optreden Opslaan';
    }
  }
}

export function editEvent(id) {
  const event = currentEvents.find(ev => ev.id === id);
  if (!event) return;

  document.getElementById('eventId').value = event.id;
  document.getElementById('eventTitle').value = event.title || '';
  document.getElementById('eventDate').value = event.date || '';
  document.getElementById('eventTime').value = event.time || '';
  document.getElementById('eventLocation').value = event.location || '';
  document.getElementById('eventUrl').value = (event.url && event.url !== '#contact') ? event.url : '';
  document.getElementById('eventBtnText').value = event.buttonText || 'Reserveren';

  const modeIndicator = document.getElementById('eventEditModeIndicator');
  if (modeIndicator) {
    modeIndicator.textContent = 'BEWERKEN';
    modeIndicator.style.color = 'var(--accent)';
  }

  const formTitle = document.getElementById('eventFormTitle');
  if (formTitle) formTitle.textContent = 'Optreden Bewerken';

  const formCard = document.getElementById('eventEditorCard');
  if (formCard) formCard.scrollIntoView({ behavior: 'smooth' });
}

export async function deleteEvent(id) {
  const event = currentEvents.find(ev => ev.id === id);
  const title = event ? `"${event.title}"` : 'dit optreden';

  if (!confirm(`Weet je zeker dat je ${title} wilt verwijderen uit de agenda?`)) {
    return;
  }

  currentEvents = currentEvents.filter(ev => ev.id !== id);
  saveEventsCache(currentEvents);
  renderAdminEventsList(currentEvents);

  try {
    await deletePerformanceFromFirestore(id);
    showAdminToast('Optreden verwijderd uit database.');
    if (document.getElementById('eventId').value === id) {
      resetEventForm();
    }
  } catch (err) {
    console.error('Fout bij verwijderen:', err);
    showAdminToast('Kon optreden niet uit cloud database verwijderen.');
  }
}

export function resetEventForm() {
  const form = document.getElementById('eventForm');
  if (form) form.reset();

  document.getElementById('eventId').value = '';
  document.getElementById('eventBtnText').value = 'Reserveren';

  const modeIndicator = document.getElementById('eventEditModeIndicator');
  if (modeIndicator) {
    modeIndicator.textContent = 'NIEUW';
    modeIndicator.style.color = '';
  }

  const formTitle = document.getElementById('eventFormTitle');
  if (formTitle) formTitle.textContent = 'Optreden Toevoegen';
}

function renderAdminEventsList(events) {
  const container = document.getElementById('eventsListContainer');
  const countEl = document.getElementById('eventCount');
  if (!container) return;

  if (countEl) countEl.textContent = events.length;

  if (events.length === 0) {
    container.innerHTML = `
      <div style="padding: var(--space-8); text-align: center; color: var(--text-muted); font-size: 0.9rem;">
        Geen optredens gevonden in de database. Voeg hierboven een eerste speeldatum toe.
      </div>
    `;
    return;
  }

  const sorted = [...events].sort((a, b) => new Date(b.date) - new Date(a.date));
  const today = new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <div class="event-manager-list">
      ${sorted.map(ev => {
        const isPast = ev.date < today;
        const formattedDate = formatDutchDate(ev.date);

        return `
          <div class="event-admin-row" data-id="${ev.id}">
            <div class="event-admin-date">${formattedDate}</div>
            <div class="event-admin-info">
              <h4>${escapeHtml(ev.title)}</h4>
              <div class="event-admin-sub">
                <span>${escapeHtml(ev.location)}${ev.time ? ' • ' + escapeHtml(ev.time) : ''}</span>
                ${isPast ? '<span class="event-badge-past">Verstreken</span>' : '<span class="event-badge-upcoming">Aankomend</span>'}
              </div>
            </div>
            <div class="event-admin-actions">
              <button type="button" class="btn btn-secondary btn-sm edit-event-btn" data-id="${ev.id}">Bewerken</button>
              <button type="button" class="btn btn-secondary btn-sm delete-event-btn" data-id="${ev.id}" style="color: #ff6b6b; border-color: rgba(255,107,107,0.3);">Wissen</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  container.querySelectorAll('.edit-event-btn').forEach(btn => {
    btn.addEventListener('click', () => editEvent(btn.getAttribute('data-id')));
  });

  container.querySelectorAll('.delete-event-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteEvent(btn.getAttribute('data-id')));
  });
}

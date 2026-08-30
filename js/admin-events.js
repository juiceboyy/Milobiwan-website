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

let currentEvents = [];

/**
 * Initialiseert het Optredens & Agenda beheer binnen de Studio
 */
export function initAdminEvents() {
  const eventForm = document.getElementById('eventForm');
  const resetEventBtn = document.getElementById('resetEventBtn');

  if (!eventForm) return;

  // Real-time listener opzetten voor de lijst in de Studio
  try {
    onPerformancesSnapshot((events) => {
      currentEvents = events;
      renderAdminEventsList(events);
    });
  } catch (err) {
    console.warn('Kon realtime listener voor events niet laden:', err);
    loadEventsOnce();
  }

  // Submit handler voor toevoegen of bewerken
  eventForm.addEventListener('submit', handleEventSubmit);

  if (resetEventBtn) {
    resetEventBtn.addEventListener('click', resetEventForm);
  }
}

async function loadEventsOnce() {
  try {
    const events = await getPerformancesFromFirestore();
    currentEvents = events;
    renderAdminEventsList(events);
  } catch (err) {
    console.error('Fout bij eenmalig laden van events:', err);
  }
}

/**
 * Verwerkt het opslaan van een nieuw of bewerkt optreden
 */
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
    showAdminToast('Vul in ieder geval een titel, datum en locatie in.');
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

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Opslaan in Database...';
  }

  try {
    await savePerformanceToFirestore(eventData);
    showAdminToast(isEdit ? 'Optreden succesvol bijgewerkt!' : 'Nieuw optreden toegevoegd aan agenda!');
    resetEventForm();
  } catch (err) {
    console.error('Fout bij opslaan van optreden:', err);
    showAdminToast('Er ging iets mis bij het opslaan.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Optreden Opslaan';
    }
  }
}

/**
 * Vult het formulier voor bewerken van een bestaand optreden
 */
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
  if (formTitle) {
    formTitle.textContent = 'Optreden Bewerken';
  }

  // Scroll naar formulier
  const formCard = document.getElementById('eventEditorCard');
  if (formCard) {
    formCard.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * Verwijdert een optreden na bevestiging
 */
export async function deleteEvent(id) {
  const event = currentEvents.find(ev => ev.id === id);
  const title = event ? `"${event.title}"` : 'dit optreden';

  if (!confirm(`Weet je zeker dat je ${title} wilt verwijderen uit de agenda?`)) {
    return;
  }

  try {
    await deletePerformanceFromFirestore(id);
    showAdminToast('Optreden verwijderd uit database.');
    if (document.getElementById('eventId').value === id) {
      resetEventForm();
    }
  } catch (err) {
    console.error('Fout bij verwijderen:', err);
    showAdminToast('Kon optreden niet verwijderen.');
  }
}

/**
 * Reset het event formulier naar de standaard 'Nieuw' status
 */
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
  if (formTitle) {
    formTitle.textContent = 'Optreden Toevoegen';
  }
}

/**
 * Rendert het overzicht van alle optredens in de Studio
 */
function renderAdminEventsList(events) {
  const container = document.getElementById('eventsListContainer');
  const countEl = document.getElementById('eventCount');
  if (!container) return;

  if (countEl) {
    countEl.textContent = events.length;
  }

  if (events.length === 0) {
    container.innerHTML = `
      <div style="padding: var(--space-8); text-align: center; color: var(--text-muted); font-size: 0.9rem;">
        Geen optredens gevonden in de database. Voeg hierboven een eerste speeldatum toe.
      </div>
    `;
    return;
  }

  // Sorteren: nieuwste datum bovenaan
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

  // Attach button events
  container.querySelectorAll('.edit-event-btn').forEach(btn => {
    btn.addEventListener('click', () => editEvent(btn.getAttribute('data-id')));
  });

  container.querySelectorAll('.delete-event-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteEvent(btn.getAttribute('data-id')));
  });
}

function formatDutchDate(dateStr) {
  if (!dateStr) return 'GEEN DATUM';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parts[2];
      const monthNames = ['JAN', 'FEB', 'MRT', 'APR', 'MEI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEC'];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const month = monthNames[monthIndex] || parts[1];
      const year = parts[0];
      return `${day} // ${month} ${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function showAdminToast(msg) {
  let toast = document.getElementById('adminToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'adminToast';
    toast.className = 'toast-notice';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

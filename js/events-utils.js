/**
 * Milobiwan – Event Utilities & Helpers
 * Shared date formatting, escaping, toast notifications, and local caching
 */

export const EVENTS_STORAGE_KEY = 'milobiwan_events_cache';

export function loadEventsCache() {
  try {
    const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveEventsCache(events) {
  try {
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
  } catch (err) {
    console.warn('Kon events cache niet opslaan:', err);
  }
}

export function formatDutchDate(dateStr) {
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

export function showAdminToast(msg) {
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

export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

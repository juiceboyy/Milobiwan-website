/**
 * Milobiwan (Mieke) – Main Application Bootstrap
 */

import { initNavigation } from './navigation.js';
import { initPoetryViewer } from './poetry-viewer.js';

function init() {
  initNavigation();
  initPoetryViewer();
  initBookingForm();
}

function initBookingForm() {
  const form = document.getElementById('bookingForm');
  const toast = document.getElementById('bookingToast');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (toast) {
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 5000);
    }

    form.reset();
  });
}

// DOMContentLoaded Safe Guard
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

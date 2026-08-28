/**
 * Milobiwan (Mieke) – Main Application Bootstrap
 */

import { initNavigation } from './navigation.js';
import { initPoetryViewer } from './poetry-viewer.js';
import { initAudioPlayer } from './audio-player.js';

function init() {
  initNavigation();
  initPoetryViewer();
  initAudioPlayer();
  initLinguisticArchive();
  initBookingForm();
}

function initLinguisticArchive() {
  const tabs = document.querySelectorAll('.lang-tab-btn');
  const panels = document.querySelectorAll('.lang-tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const target = document.getElementById(`panel-${tab.dataset.lang}`);
      if (target) {
        target.classList.add('active');
      }
    });
  });
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

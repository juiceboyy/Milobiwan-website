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
  initLinguisticExplorer();
  initBookingForm();
}

function initLinguisticExplorer() {
  const tabs = document.querySelectorAll('.lang-tab-btn');
  const panels = document.querySelectorAll('.lang-tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPanel = document.getElementById(`panel-${tab.dataset.lang}`);
      if (targetPanel) {
        targetPanel.classList.add('active');
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
    
    // Show confirmation toast
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

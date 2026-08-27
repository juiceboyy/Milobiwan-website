/**
 * Main Application Entry Point for Milobiwan's Website
 */

import { initNavigation } from './navigation.js';
import { initPoetryViewer } from './poetry-viewer.js';
import { initAudioPlayer } from './audio-player.js';

function init() {
  initNavigation();
  initPoetryViewer();
  initAudioPlayer();

  // Async icon guard if external library is present
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  } else {
    const interval = setInterval(() => {
      if (typeof lucide !== 'undefined') {
        clearInterval(interval);
        lucide.createIcons();
      }
    }, 100);
    setTimeout(() => clearInterval(interval), 10000);
  }
}

// DOMContentLoaded Guard
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

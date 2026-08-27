/**
 * Audio Player & Spoken Word Ambient Sound Engine
 * Provides audio playback visualizer and Web Audio rhythm generator
 */

let audioCtx = null;
let isPlaying = false;
let ambientOscillator = null;
let gainNode = null;
let rhythmInterval = null;
let currentTrackTitle = 'Kandra Faya — Spoken Word Live Recital';

export function initAudioPlayer() {
  const playBtn = document.getElementById('audioPlayBtn');
  if (!playBtn) return;

  playBtn.addEventListener('click', () => {
    toggleAudioPlayback();
  });
}

export function playPoemTrack(poem) {
  currentTrackTitle = poem.audioTitle || `${poem.title} — Voordracht`;
  updateTrackUI(currentTrackTitle, `${poem.languageLabel} • ${poem.theme}`);

  if (!isPlaying) {
    startAudioEngine();
  }

  // Scroll smoothly to audio player widget if not visible
  const playerBanner = document.querySelector('.audio-player-banner');
  if (playerBanner) {
    playerBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

export function toggleAudioPlayback() {
  if (isPlaying) {
    stopAudioEngine();
  } else {
    startAudioEngine();
  }
}

function updateTrackUI(title, subtitle) {
  const titleEl = document.getElementById('currentAudioTitle');
  const subEl = document.getElementById('currentAudioSub');
  if (titleEl) titleEl.textContent = title;
  if (subEl && subtitle) subEl.textContent = subtitle;
}

function startAudioEngine() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // Create warm ambient root chord (low gentle resonance)
    gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gainNode.connect(audioCtx.destination);

    // Warm subtle drone
    ambientOscillator = audioCtx.createOscillator();
    ambientOscillator.type = 'sine';
    ambientOscillator.frequency.setValueAtTime(146.83, audioCtx.currentTime); // D3 warm tone
    ambientOscillator.connect(gainNode);
    ambientOscillator.start();

    // Rhythmic spoken-word heartbeat pulse
    startHeartbeatRhythm(audioCtx);

    isPlaying = true;
    updatePlayButtonState(true);
    setVisualizerActive(true);
  } catch (err) {
    console.warn('Audio playback initialized in silent mode:', err);
    isPlaying = true;
    updatePlayButtonState(true);
    setVisualizerActive(true);
  }
}

function stopAudioEngine() {
  if (ambientOscillator) {
    try {
      ambientOscillator.stop();
      ambientOscillator.disconnect();
    } catch (e) { /* ignore */ }
    ambientOscillator = null;
  }

  if (rhythmInterval) {
    clearInterval(rhythmInterval);
    rhythmInterval = null;
  }

  isPlaying = false;
  updatePlayButtonState(false);
  setVisualizerActive(false);
}

function startHeartbeatRhythm(ctx) {
  if (rhythmInterval) clearInterval(rhythmInterval);

  // Soft low warm pulse every 1.5s mimicking a spoken word heartbeat rhythm
  rhythmInterval = setInterval(() => {
    if (!isPlaying || !ctx) return;
    try {
      const osc = ctx.createOscillator();
      const pulseGain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(73.42, ctx.currentTime); // D2 low pulse
      
      pulseGain.gain.setValueAtTime(0.06, ctx.currentTime);
      pulseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      
      osc.connect(pulseGain);
      pulseGain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) { /* ignore */ }
  }, 1500);
}

function updatePlayButtonState(playing) {
  const playBtn = document.getElementById('audioPlayBtn');
  if (!playBtn) return;

  if (playing) {
    playBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
      <span>Pauzeer</span>
    `;
    playBtn.classList.remove('btn-primary');
    playBtn.classList.add('btn-secondary');
  } else {
    playBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
      <span>Afspelen</span>
    `;
    playBtn.classList.remove('btn-secondary');
    playBtn.classList.add('btn-primary');
  }
}

function setVisualizerActive(active) {
  const bars = document.querySelectorAll('.visualizer-bar');
  bars.forEach(bar => {
    if (active) {
      bar.classList.add('playing');
    } else {
      bar.classList.remove('playing');
    }
  });
}

/**
 * Milobiwan – Spoken Word Ambient Audio Engine & Player
 */

let audioCtx = null;
let isPlaying = false;
let ambientOscillator = null;
let gainNode = null;
let rhythmInterval = null;
let currentTrackTitle = 'Kandra Faya (Kaarslicht) — Live Spoken Word';

export function initAudioPlayer() {
  const playBtn = document.getElementById('audioPlayBtn');
  const heroAudioBtn = document.getElementById('heroAudioBtn');

  if (playBtn) {
    playBtn.addEventListener('click', toggleAudioPlayback);
  }

  if (heroAudioBtn) {
    heroAudioBtn.addEventListener('click', () => {
      if (!isPlaying) {
        startAudioEngine();
      } else {
        stopAudioEngine();
      }
    });
  }
}

export function playPoemTrack(poem) {
  currentTrackTitle = poem.audioTitle || `${poem.title} — Voordracht`;
  updateTrackUI(currentTrackTitle, `${poem.languageLabel} // ${poem.theme} (${poem.audioDuration})`);

  if (!isPlaying) {
    startAudioEngine();
  }

  const audioSection = document.getElementById('soundscape');
  if (audioSection) {
    audioSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

    gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.035, audioCtx.currentTime);
    gainNode.connect(audioCtx.destination);

    ambientOscillator = audioCtx.createOscillator();
    ambientOscillator.type = 'sine';
    ambientOscillator.frequency.setValueAtTime(146.83, audioCtx.currentTime); // D3 warm tone
    ambientOscillator.connect(gainNode);
    ambientOscillator.start();

    startHeartbeatRhythm(audioCtx);

    isPlaying = true;
    updatePlayButtonState(true);
    setVisualizerActive(true);
  } catch (err) {
    console.warn('Audio playback running in visual mode:', err);
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

  rhythmInterval = setInterval(() => {
    if (!isPlaying || !ctx) return;
    try {
      const osc = ctx.createOscillator();
      const pulseGain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(73.42, ctx.currentTime); // D2 low pulse
      
      pulseGain.gain.setValueAtTime(0.05, ctx.currentTime);
      pulseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      
      osc.connect(pulseGain);
      pulseGain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch (e) { /* ignore */ }
  }, 1400);
}

function updatePlayButtonState(playing) {
  const playBtn = document.getElementById('audioPlayBtn');
  const heroAudioBtn = document.getElementById('heroAudioBtn');

  if (playBtn) {
    if (playing) {
      playBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
        <span>Pauzeer Soundscape</span>
      `;
      playBtn.className = 'btn btn-secondary';
    } else {
      playBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        <span>Start Soundscape</span>
      `;
      playBtn.className = 'btn btn-accent';
    }
  }

  if (heroAudioBtn) {
    heroAudioBtn.innerHTML = playing ? '❚❚' : '▶';
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

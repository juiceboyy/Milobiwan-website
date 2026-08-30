/**
 * Milobiwan Studio – Authentication Module
 * Verifies PIN securely via serverless backend environment variable (STUDIO_PIN)
 */

const AUTH_KEY = 'milobiwan_studio_auth';

const PIN_VAL_KEY = 'milobiwan_pin_val';

export function getStudioPin() {
  return sessionStorage.getItem(PIN_VAL_KEY) || '';
}

export function setupPinAuth(onAuthenticated) {
  const authGate = document.getElementById('authGate');
  const workspace = document.getElementById('studioWorkspace');
  const logoutBtn = document.getElementById('logoutBtn');
  const pinForm = document.getElementById('pinForm');
  const pinDigits = document.querySelectorAll('.pin-digit');
  const pinError = document.getElementById('pinError');
  const submitBtn = pinForm?.querySelector('button[type="submit"]');

  function checkSession() {
    const isAuth = sessionStorage.getItem(AUTH_KEY) === 'true';
    const pinVal = sessionStorage.getItem(PIN_VAL_KEY);
    if (isAuth && pinVal) {
      if (authGate) authGate.style.display = 'none';
      if (workspace) workspace.classList.add('unlocked');
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      if (typeof onAuthenticated === 'function') {
        onAuthenticated();
      }
    } else {
      if (authGate) authGate.style.display = 'flex';
      if (workspace) workspace.classList.remove('unlocked');
      if (logoutBtn) logoutBtn.style.display = 'none';
    }
  }

  // Pin input auto-advance
  pinDigits.forEach((digit, index) => {
    digit.addEventListener('input', () => {
      if (digit.value && index < pinDigits.length - 1) {
        pinDigits[index + 1].focus();
      }
    });
    digit.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !digit.value && index > 0) {
        pinDigits[index - 1].focus();
      }
    });
  });

  pinForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const enteredPin = Array.from(pinDigits).map(d => d.value).join('');

    if (enteredPin.length < 4) {
      if (pinError) pinError.textContent = 'Voer een 4-cijferige pincode in.';
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifiëren...';
    }
    if (pinError) pinError.textContent = '';

    try {
      const response = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: enteredPin })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        sessionStorage.setItem(AUTH_KEY, 'true');
        sessionStorage.setItem(PIN_VAL_KEY, enteredPin);
        if (pinError) pinError.textContent = '';
        checkSession();
      } else {
        if (pinError) {
          pinError.textContent = data.error || 'Onjuiste pincode. Probeer opnieuw.';
        }
        pinDigits.forEach(d => { d.value = ''; });
        pinDigits[0]?.focus();
      }
    } catch (err) {
      console.error('Verificatiefout:', err);
      if (pinError) {
        pinError.textContent = 'Verbindingsfout bij het controleren van de pincode.';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ontgrendel Studio';
      }
    }
  });

  logoutBtn?.addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(PIN_VAL_KEY);
    checkSession();
  });

  checkSession();
}

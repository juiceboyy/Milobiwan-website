/**
 * Milobiwan Studio – Authentication Module (PIN Protection)
 */

const PIN_CODE = '1919';
const AUTH_KEY = 'milobiwan_studio_auth';

export function setupPinAuth(onAuthenticated) {
  const authGate = document.getElementById('authGate');
  const workspace = document.getElementById('studioWorkspace');
  const logoutBtn = document.getElementById('logoutBtn');
  const pinForm = document.getElementById('pinForm');
  const pinDigits = document.querySelectorAll('.pin-digit');
  const pinError = document.getElementById('pinError');

  function checkSession() {
    const isAuth = sessionStorage.getItem(AUTH_KEY) === 'true';
    if (isAuth) {
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

  pinForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const entered = Array.from(pinDigits).map(d => d.value).join('');
    if (entered === PIN_CODE) {
      sessionStorage.setItem(AUTH_KEY, 'true');
      if (pinError) pinError.textContent = '';
      checkSession();
    } else {
      if (pinError) pinError.textContent = 'Onjuiste pincode. Probeer opnieuw.';
      pinDigits.forEach(d => { d.value = ''; });
      pinDigits[0]?.focus();
    }
  });

  logoutBtn?.addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_KEY);
    checkSession();
  });

  checkSession();
}

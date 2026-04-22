// UI state machine: 'idle' | 'loading' | 'loaded'
let _state = 'idle';
let _onLoad;

export function initUI({ onLoad }) {
  _onLoad = onLoad;

  document.getElementById('load-btn').addEventListener('click', triggerLoad);
  document.getElementById('url-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') triggerLoad();
  });
  document.getElementById('reload-btn').addEventListener('click', () => setState('idle'));

  applyState('idle');
}

function triggerLoad() {
  const url = document.getElementById('url-input').value.trim();
  if (url && _onLoad) _onLoad(url);
}

function setState(next) {
  _state = next;
  applyState(next);
}

function applyState(state) {
  const welcome = document.getElementById('welcome-panel');
  const loadingEl = document.getElementById('loading-indicator');
  const reloadBtn = document.getElementById('reload-btn');

  welcome.style.display = state === 'idle' ? 'flex' : 'none';
  loadingEl.style.display = state === 'loading' ? 'flex' : 'none';
  reloadBtn.style.display = state === 'loaded' ? 'block' : 'none';
}

export function setLoading(loading) {
  setState(loading ? 'loading' : 'idle');
  if (!loading) {
    setLoadProgress(100);
    setTimeout(() => setLoadProgress(0), 500);
  }
}

export function setLoaded() {
  setState('loaded');
  setLoadProgress(100);
  setTimeout(() => setLoadProgress(0), 500);
}

export function setLoadProgress(percent) {
  document.getElementById('loading-bar').style.width = `${Math.min(100, percent)}%`;
  const label = document.getElementById('loading-label');
  if (label) label.textContent = percent < 100 ? `Loading… ${Math.round(percent)}%` : 'Processing…';
}

export function showError(msg) {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 6000);
  setState('idle');
}

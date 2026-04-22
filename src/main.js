import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import { initUI, setLoading, setLoaded, setLoadProgress, showError } from './ui.js';

// ─── Renderer ────────────────────────────────────────────────────────────────

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
renderer.xr.enabled = true;

// ─── Scene & Camera ──────────────────────────────────────────────────────────

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 1000);
camera.position.set(0, 1.6, 3);

// ─── Controls ────────────────────────────────────────────────────────────────

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 1, 0);
controls.update();

renderer.xr.addEventListener('sessionstart', () => { controls.enabled = false; });
renderer.xr.addEventListener('sessionend', () => { controls.enabled = true; });

// ─── WebXR Buttons ───────────────────────────────────────────────────────────

const xrBtnStyle = {
  position: 'static',
  bottom: 'auto',
  padding: '11px 22px',
  border: '1px solid rgba(56,189,248,0.35)',
  borderRadius: '8px',
  background: 'rgba(7,7,20,0.85)',
  color: '#38bdf8',
  fontFamily: 'inherit',
  fontSize: '0.875rem',
  fontWeight: '600',
  opacity: '1',
  cursor: 'pointer'
};

async function setupXRButtons() {
  if (!navigator.xr) return;

  const container = document.getElementById('xr-buttons');
  const overlay = document.getElementById('overlay');

  const [arOk, vrOk] = await Promise.all([
    navigator.xr.isSessionSupported('immersive-ar').catch(() => false),
    navigator.xr.isSessionSupported('immersive-vr').catch(() => false)
  ]);

  if (arOk) {
    const btn = ARButton.createButton(renderer, {
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: overlay }
    });
    Object.assign(btn.style, xrBtnStyle);
    container.appendChild(btn);
  }

  if (vrOk) {
    const btn = VRButton.createButton(renderer);
    Object.assign(btn.style, xrBtnStyle);
    container.appendChild(btn);
  }
}

// ─── Splat Viewer ────────────────────────────────────────────────────────────

let viewer = null;
let splatReady = false;

async function loadSplat(url) {
  if (viewer) {
    viewer.dispose?.();
    viewer = null;
    splatReady = false;
  }

  setLoading(true);
  setLoadProgress(0);

  viewer = new GaussianSplats3D.Viewer({
    selfDrivenMode: false,
    renderer,
    camera,
    threeScene: scene,
    useBuiltInControls: false,
    sharedMemoryForWorkers: typeof SharedArrayBuffer !== 'undefined',
    splatAlphaRemovalThreshold: 5,
    halfPrecisionCovariancesOnGPU: true
  });

  try {
    await viewer.addSplatScene(url, {
      progressiveLoad: true,
      onProgress: (percent) => setLoadProgress(percent)
    });
    viewer.splatMesh.rotation.x = Math.PI;
    splatReady = true;
    setLoaded();
  } catch (err) {
    console.error('Splat load error:', err);
    viewer.dispose?.();
    viewer = null;
    showError('Failed to load. Check the URL and that the server allows cross-origin requests.');
  }
}

// ─── WASD Movement ───────────────────────────────────────────────────────────

const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; });
window.addEventListener('keyup',   e => { keys[e.code] = false; });

const _forward = new THREE.Vector3();
const _right   = new THREE.Vector3();
const _delta   = new THREE.Vector3();
const MOVE_SPEED = 0.05;

function applyWASD() {
  if (renderer.xr.isPresenting) return;
  const w = keys['KeyW'] || keys['ArrowUp'];
  const s = keys['KeyS'] || keys['ArrowDown'];
  const a = keys['KeyA'] || keys['ArrowLeft'];
  const d = keys['KeyD'] || keys['ArrowRight'];
  if (!w && !s && !a && !d) return;

  camera.getWorldDirection(_forward);
  _right.crossVectors(_forward, camera.up).normalize();
  _delta.set(0, 0, 0);
  if (w) _delta.addScaledVector(_forward,  MOVE_SPEED);
  if (s) _delta.addScaledVector(_forward, -MOVE_SPEED);
  if (a) _delta.addScaledVector(_right,   -MOVE_SPEED);
  if (d) _delta.addScaledVector(_right,    MOVE_SPEED);
  camera.position.add(_delta);
  controls.target.add(_delta);
}

// ─── Render Loop ─────────────────────────────────────────────────────────────

renderer.setAnimationLoop(() => {
  if (!renderer.xr.isPresenting) { applyWASD(); controls.update(); }

  if (viewer && splatReady) {
    viewer.update();
    viewer.render();
  } else {
    renderer.render(scene, camera);
  }
});

// ─── Resize ──────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Drag & Drop ─────────────────────────────────────────────────────────────

document.addEventListener('dragenter', () => document.body.classList.add('drag-over'));
document.addEventListener('dragleave', e => {
  if (!e.relatedTarget) document.body.classList.remove('drag-over');
});
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
  e.preventDefault();
  document.body.classList.remove('drag-over');
  const file = e.dataTransfer?.files[0];
  if (!file) return;
  const blobUrl = URL.createObjectURL(file);
  document.getElementById('url-input').value = file.name;
  loadSplat(blobUrl);
});

// ─── Init ────────────────────────────────────────────────────────────────────

setupXRButtons();
initUI({ onLoad: loadSplat });

// Auto-load from ?splat=<url> query param
const params = new URLSearchParams(location.search);
if (params.has('splat')) {
  const url = params.get('splat');
  document.getElementById('url-input').value = url;
  loadSplat(url);
}

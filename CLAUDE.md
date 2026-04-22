# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # install dependencies
npm run dev          # Vite dev server with HTTPS at https://localhost:5173
npm run build        # build frontend to dist/
npm start            # run Express server (needs dist/ to exist)
npm run pm2:start    # deploy via PM2 (run build first)
npm run pm2:stop     # stop PM2 process
npm run pm2:restart  # restart PM2 process
```

## Architecture

Single-package project: Vite builds the frontend into `dist/`, Express serves it.

```
index.html          HTML shell + all CSS
src/main.js         Three.js scene, GaussianSplats3D viewer, WebXR session setup, render loop
src/ui.js           DOM state machine (idle → loading → loaded), progress bar, errors
server.js           Express static server for dist/ (PM2 entry point)
ecosystem.config.cjs PM2 app definition
vite.config.js      Vite + @vitejs/plugin-basic-ssl (HTTPS for WebXR dev testing)
public/splats/      Drop your own .splat/.ksplat/.ply files here
```

**Rendering stack:** Three.js `WebGLRenderer` (xr.enabled) → `GaussianSplats3D.Viewer` (selfDrivenMode: false) → `viewer.update()` + `viewer.render()` each frame via `renderer.setAnimationLoop`.

**WebXR:** AR (`immersive-ar`) and VR (`immersive-vr`) support is detected at runtime. Buttons only appear if the device supports the respective mode. Android Chrome (ARCore) is the primary AR target. Controls are disabled during XR sessions.

**CORS / SharedArrayBuffer:** Both server.js and vite.config.js set `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: credentialless` so that `SharedArrayBuffer` is available for the splat library's GPU sorting workers.

## Loading a splat

Three ways to load a scene:
1. **URL input** — paste any `.splat`, `.ksplat`, or `.ply` URL into the input field
2. **Query param** — append `?splat=<url>` to auto-load on page open
3. **Drag & drop** — drag a local file onto the page
4. **Self-hosted** — place files in `public/splats/` and load via `/splats/filename.splat`

## WebXR & HTTPS

WebXR only works over HTTPS (or localhost). In development:
- `npm run dev` provides HTTPS via a self-signed cert (accept the browser warning)
- To test on a real phone: use `ngrok http 5173` or `adb reverse tcp:5173 tcp:5173` (Android)

In production, put Nginx in front of the Express server to terminate TLS with a Let's Encrypt cert.

## Key dependencies

| Package | Purpose |
|---|---|
| `@mkkellogg/gaussian-splats-3d` | Gaussian splat loading and GPU rendering |
| `three` | 3D scene, WebXR, OrbitControls |
| `express` | Static file server for PM2 |
| `vite` + `@vitejs/plugin-basic-ssl` | Dev bundler with self-signed HTTPS |

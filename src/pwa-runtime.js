export const FALLBACK_BUILD_ID = 'nivareq-pulse-statezect-public-v1-0-0';
export const CURRENT_BUILD_ID = globalThis.document?.documentElement?.dataset?.pulseBuild || FALLBACK_BUILD_ID;
const VERSION_PROBE = './app-version.json';
const RELOAD_GUARD = 'nivareq-pulse-pwa-reload-target';
const CHECK_THROTTLE_MS = 15000;

let registration = null;
let statusSink = () => {};
let updatePending = false;
let reloading = false;
let lastCheckAt = 0;
let activeCheck = null;
const hadControllerAtStart = Boolean(navigator.serviceWorker?.controller);

function readReloadGuard() {
  try { return sessionStorage.getItem(RELOAD_GUARD); } catch { return null; }
}
function writeReloadGuard(value) {
  try { sessionStorage.setItem(RELOAD_GUARD, value); } catch {}
}
function clearSatisfiedReloadGuard() {
  try {
    if (sessionStorage.getItem(RELOAD_GUARD) === CURRENT_BUILD_ID) sessionStorage.removeItem(RELOAD_GUARD);
  } catch {}
}
function promoteWaitingWorker(reg) {
  if (!reg?.waiting) return false;
  reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  return true;
}
function navigateToFreshShell(targetBuild) {
  if (reloading || !targetBuild || targetBuild === CURRENT_BUILD_ID) return;
  if (readReloadGuard() === targetBuild) return;
  reloading = true;
  writeReloadGuard(targetBuild);
  const url = new URL('./', location.href);
  url.searchParams.set('__pulse_build', targetBuild);
  location.replace(url.href);
}
async function fetchVersionMarker() {
  const url = new URL(VERSION_PROBE, location.href);
  url.searchParams.set('_', String(Date.now()));
  const response = await fetch(url.href, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' }
  });
  if (!response.ok) throw new Error(`Version probe failed (${response.status})`);
  const marker = await response.json();
  if (!marker?.buildId) throw new Error('Version probe missing buildId');
  return marker;
}

export async function checkForPwaUpdate({ interactive = false, force = false } = {}) {
  if (!('serviceWorker' in navigator)) {
    if (interactive) statusSink('Updates are not available in this browser.');
    return { supported: false, updateAvailable: false };
  }
  const now = Date.now();
  if (!force && activeCheck) return activeCheck;
  if (!force && now - lastCheckAt < CHECK_THROTTLE_MS) return { supported: true, throttled: true, updateAvailable: false };
  lastCheckAt = now;

  activeCheck = (async () => {
    try {
      // The network-only marker is the authority for whether this visible
      // document is actually stale. A waiting registration alone is not enough
      // to claim an update; iOS can retain redundant/same-build workers.
      const marker = await fetchVersionMarker();
      if (marker.buildId === CURRENT_BUILD_ID) {
        registration ||= await navigator.serviceWorker.getRegistration('./');
        if (registration) {
          try { await registration.update(); } catch {}
        }
        updatePending = false;
        if (interactive) statusSink(`${marker.displayVersion || 'StateZect'} is up to date.`);
        return { supported: true, updateAvailable: false, marker };
      }

      updatePending = true;
      if (interactive) statusSink(`Updating to ${marker.displayVersion || 'the newest build'}…`);

      registration ||= await navigator.serviceWorker.getRegistration('./');
      if (registration) {
        try { await registration.update(); } catch {}
        promoteWaitingWorker(registration);
      }

      // Give the worker lifecycle a brief chance to take control. If iOS keeps
      // an older suspended document alive, perform one canonical cache-busted
      // navigation to the build the network marker actually reported.
      setTimeout(() => {
        if (updatePending && !reloading && document.visibilityState === 'visible') {
          navigateToFreshShell(marker.buildId);
        }
      }, 1800);

      return { supported: true, updateAvailable: true, marker };
    } catch (error) {
      if (interactive) statusSink(navigator.onLine ? 'Could not check for updates right now.' : 'Offline — update check skipped.');
      return { supported: true, updateAvailable: false, error };
    } finally {
      activeCheck = null;
    }
  })();

  return activeCheck;
}

export async function initPwaRuntime({ onStatus } = {}) {
  if (typeof onStatus === 'function') statusSink = onStatus;
  clearSatisfiedReloadGuard();
  if (!('serviceWorker' in navigator)) return null;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Only a marker-confirmed cross-build update is allowed to trigger a reload.
    // Same-build worker churn must stay silent.
    if (!updatePending || reloading) return;
    reloading = true;
    location.reload();
  });

  try {
    registration = await navigator.serviceWorker.register('./service-worker.js', { updateViaCache: 'none' });
    try { await registration.update(); } catch {}
  } catch (error) {
    console.warn('StateZect service-worker registration failed:', error);
    return null;
  }

  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      void checkForPwaUpdate({ force: true });
      return;
    }
    void checkForPwaUpdate();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForPwaUpdate({ force: true });
  });

  window.addEventListener('online', () => void checkForPwaUpdate({ force: true }));
  void checkForPwaUpdate({ force: true });
  return registration;
}

// Updates take effect on the next open, not the one after. The offline cache answers first, so an
// open right after a deploy runs the old build while the new service worker installs. So: check
// for a new build whenever the app is opened or comes back to the front, and once the new worker
// takes over, reload - but never while the click is playing (that waits for stop).

/** Pure: reload for an update only if a worker already ran this page (not on a first install), and not mid-play. */
export const shouldReload = (s: { hadController: boolean; updated: boolean; playing: boolean }): boolean =>
  s.hadController && s.updated && !s.playing;

type Hooks = { playing: () => boolean; onReadyWhileStopped: (reload: () => void) => void };

export const watchForUpdates = (h: Hooks) => {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const sw = navigator.serviceWorker;
  const hadController = !!sw.controller;
  let updated = false;
  const reload = () => location.reload();
  const tryReload = () => shouldReload({ hadController, updated, playing: h.playing() }) && reload();
  sw.addEventListener("controllerchange", () => {
    updated = true;
    if (!tryReload()) h.onReadyWhileStopped(() => tryReload());
  });
  const check = () => sw.getRegistration().then((r) => r?.update()).catch(() => {});
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && check());
  check();
};

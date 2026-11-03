// "update" in the header: a new build downloads in the background and waits; it takes over when
// the user taps update (or the next time the app is fully closed and opened). Nothing reloads by
// itself. A check runs on open and whenever the app comes back to the front.
import { createSignal } from "solid-js";
import { registerSW } from "virtual:pwa-register";

const [ready, setReady] = createSignal(false);
let apply: ((reload?: boolean) => Promise<void>) | null = null;

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  apply = registerSW({
    onNeedRefresh: () => setReady(true),
    onRegisteredSW: (_url, r) => {
      if (!r) return;
      const check = () => void r.update().catch(() => {});
      document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && check());
    },
  });
}

/** A new version is downloaded and waiting. */
export const updateReady = ready;

/** Switch to the new version: the waiting worker takes over and the page reloads. */
export const applyUpdate = () => apply?.(true);

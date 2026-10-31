// Thin adapters over device APIs. Each one degrades silently when unsupported.

// Screen Wake Lock: keep the screen on while playing. Re-acquired when the page becomes visible.
export const createWakeLock = () => {
  let sentinel: WakeLockSentinel | null = null;
  let wanted = false;
  const acquire = async () => {
    if (!wanted || sentinel || !("wakeLock" in navigator) || document.visibilityState !== "visible") return;
    try {
      sentinel = await navigator.wakeLock.request("screen");
      sentinel.addEventListener("release", () => (sentinel = null));
    } catch {
      sentinel = null; // e.g. battery saver; not fatal
    }
  };
  document.addEventListener("visibilitychange", acquire);
  return {
    set(on: boolean) {
      wanted = on;
      if (on) void acquire();
      else void sentinel?.release();
    },
  };
};

// Vibration: unsupported on iOS Safari; no-op there.
export const buzz = (ms: number) => {
  if ("vibrate" in navigator) navigator.vibrate(ms);
};

// Media Session: lock-screen / headphone controls.
export type MediaHandlers = {
  play: () => void;
  pause: () => void;
  nudge: (delta: number) => void;
};

export type MediaState = { bpm: number; playing: boolean; title?: string; album?: string; artwork: string | null };

export const setupMediaSession = (h: MediaHandlers) => {
  if (!("mediaSession" in navigator)) return { update: (_: MediaState) => {} };
  const ms = navigator.mediaSession;
  const safe = (action: MediaSessionAction, fn: MediaSessionActionHandler) => {
    try {
      ms.setActionHandler(action, fn);
    } catch {
      /* action unsupported on this platform */
    }
  };
  safe("play", h.play);
  safe("pause", h.pause);
  safe("stop", h.pause);
  safe("previoustrack", () => h.nudge(-5));
  safe("nexttrack", () => h.nudge(5));
  return {
    update({ bpm, playing, title, album, artwork }: MediaState) {
      ms.metadata = new MediaMetadata({
        title: title ? `${title} · ${bpm} bpm` : `${bpm} bpm`,
        artist: "tempo",
        album: album ?? "",
        artwork: [{ src: artwork ?? "/icon-512.png", sizes: "512x512", type: "image/png" }],
      });
      ms.playbackState = playing ? "playing" : "paused";
    },
  };
};

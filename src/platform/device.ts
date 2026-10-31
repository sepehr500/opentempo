// Thin adapters over device APIs. Each one degrades silently when unsupported.
import { CARRIER_SECONDS, silentWav, type Position } from "../core/media";

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

// Media Session: lock-screen, notification and headphone controls.
//
// Browsers only hand these to a page that plays an HTMLMediaElement: on Android, Web Audio never
// gets a notification; on iOS it gets one, but remote commands bypass the page's action handlers.
// So while the click plays, a detached <audio> loops digital silence (the "carrier"). The click
// stays on the Web Audio clock and never passes through the carrier: no added latency or drift.
export type MediaHandlers = {
  play: () => void;
  pause: () => void;
  nudge: (delta: number) => void;
};

export type MediaMeta = { bpm: number; title?: string; album?: string; artwork: string | null };

export const setupMediaSession = (h: MediaHandlers) => {
  const ms = "mediaSession" in navigator ? navigator.mediaSession : null;
  let carrier: HTMLAudioElement | null = null;
  let wanted = false; // what the app wants; the element's own state may be changed by the OS

  const createCarrier = () => {
    const el = new Audio(URL.createObjectURL(new Blob([silentWav(CARRIER_SECONDS)], { type: "audio/wav" })));
    el.loop = true;
    // The OS paused or resumed the carrier (another app took audio focus, headphones unplugged,
    // a call ended): follow it so the click and the controls agree.
    el.addEventListener("pause", () => wanted && el.paused && h.pause());
    el.addEventListener("play", () => !wanted && !el.paused && h.play());
    return el;
  };

  const safe = (action: MediaSessionAction, fn: MediaSessionActionHandler) => {
    try {
      ms?.setActionHandler(action, fn);
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
    /** Start the carrier. Must run synchronously inside the play gesture (iOS). */
    play() {
      if (!ms) return;
      wanted = true;
      carrier ??= createCarrier();
      carrier.play().catch(() => {
        /* blocked or interrupted: the click still plays, only the controls are missing */
      });
    },
    pause() {
      wanted = false;
      carrier?.pause();
    },
    metadata({ bpm, title, album, artwork }: MediaMeta) {
      if (!ms) return;
      ms.metadata = new MediaMetadata({
        title: title ? `${title} · ${bpm} bpm` : `${bpm} bpm`,
        artist: "tempo",
        album: album ?? "",
        artwork: [{ src: artwork ?? "/icon-512.png", sizes: "512x512", type: "image/png" }],
      });
    },
    state(playing: boolean, position: Position) {
      if (!ms) return;
      ms.playbackState = playing ? "playing" : "paused";
      try {
        ms.setPositionState?.(position);
      } catch {
        /* older engines reject an infinite duration; the carrier's own position shows instead */
      }
    },
  };
};

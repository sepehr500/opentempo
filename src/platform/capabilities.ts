// What this device can do. Detected once; settings that depend on a missing
// capability are shown disabled instead of half-working.

export type Capabilities = {
  readonly vibration: boolean;
  readonly wakeLock: boolean;
  readonly mediaSession: boolean;
  readonly share: boolean;
  /** Click keeps running with the screen locked. iOS suspends Web Audio in the background. */
  readonly lockedPlayback: boolean;
};

type Env = {
  readonly navigator: Partial<Navigator> & { maxTouchPoints?: number; userAgent?: string; platform?: string };
};

/** iPhone/iPad, including iPadOS reporting as a Mac. */
export const isAppleMobile = ({ navigator: n }: Env): boolean =>
  /iP(hone|ad|od)/.test(n.userAgent ?? "") || (/Mac/.test(n.platform ?? "") && (n.maxTouchPoints ?? 0) > 1);

/** Pure given an environment, so it can be tested without a browser. */
export const detect = (env: Env): Capabilities => {
  const n = env.navigator;
  return {
    vibration: typeof n.vibrate === "function" && !isAppleMobile(env),
    wakeLock: "wakeLock" in n,
    mediaSession: "mediaSession" in n,
    share: typeof n.share === "function",
    lockedPlayback: !isAppleMobile(env),
  };
};

export const capabilities: Capabilities = typeof navigator === "undefined"
  ? { vibration: false, wakeLock: false, mediaSession: false, share: false, lockedPlayback: false }
  : detect({ navigator });

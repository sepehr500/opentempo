// What this device can do. Detected once; settings that depend on a missing
// capability are shown disabled instead of half-working.

export type Capabilities = {
  readonly vibration: boolean;
  readonly wakeLock: boolean;
  readonly mediaSession: boolean;
  /**
   * Click keeps running with the screen locked. iOS suspended Web Audio in the background until
   * WebKit 17.5 (bug 261554), which keeps it running when navigator.audioSession is "playback".
   */
  readonly lockedPlayback: boolean;
};

type Env = {
  readonly navigator: Partial<Navigator> & { maxTouchPoints?: number; userAgent?: string; platform?: string; audioSession?: unknown };
};

/** WebKit release on iOS/iPadOS as major * 100 + minor (17.5 → 1705), from Safari's "Version/x.y" or else "OS x_y". */
export const appleVersion = (ua: string): number | null => {
  const m = /Version\/(\d+)\.(\d+)/.exec(ua) ?? /OS (\d+)_(\d+)/.exec(ua);
  return m ? Number(m[1]) * 100 + Number(m[2]) : null;
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
    lockedPlayback: !isAppleMobile(env) || ("audioSession" in n && (appleVersion(n.userAgent ?? "") ?? 0) >= 1705),
  };
};

export const capabilities: Capabilities = typeof navigator === "undefined"
  ? { vibration: false, wakeLock: false, mediaSession: false, lockedPlayback: false }
  : detect({ navigator });

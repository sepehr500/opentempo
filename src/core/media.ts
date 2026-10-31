// Pure pieces of the lock-screen / notification integration.

/**
 * Length of the silent "carrier" the media element loops so the OS treats the page as a media
 * player. Chrome on Android only makes a session controllable for media longer than 5 s
 * (media::DurationToMediaContentType); WebKit wants more than 0.95 s. Web Audio alone counts for
 * neither, and a MediaStream source is a non-controllable "one-shot" player in Chrome.
 */
export const CARRIER_SECONDS = 10;

/** A mono 16-bit PCM WAV of digital silence (all-zero samples). */
export const silentWav = (seconds: number, sampleRate = 8000): Uint8Array<ArrayBuffer> => {
  const frames = Math.round(seconds * sampleRate);
  const dataBytes = frames * 2;
  const bytes = new Uint8Array(44 + dataBytes);
  const v = new DataView(bytes.buffer);
  const ascii = (at: number, s: string) => [...s].forEach((ch, i) => v.setUint8(at + i, ch.charCodeAt(0)));
  ascii(0, "RIFF");
  v.setUint32(4, 36 + dataBytes, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  v.setUint32(16, 16, true); // fmt chunk size
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true); // byte rate
  v.setUint16(32, 2, true); // block align
  v.setUint16(34, 16, true); // bits per sample
  ascii(36, "data");
  v.setUint32(40, dataBytes, true);
  return bytes;
};

export type Position = { readonly duration: number; readonly position: number; readonly playbackRate: number };

/**
 * What the lock-screen progress bar shows. With the practice timer on it is the practice session;
 * otherwise the metronome is "live" (no end, no seeking). Without this the OS would show the
 * carrier's 10 s loop.
 */
export const positionState = (timerSeconds: number | null, elapsed: number): Position =>
  timerSeconds && timerSeconds > 0
    ? { duration: timerSeconds, position: Math.min(Math.max(0, elapsed), timerSeconds), playbackRate: 1 }
    : { duration: Infinity, position: 0, playbackRate: 1 };

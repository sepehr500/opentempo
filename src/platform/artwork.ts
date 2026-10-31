// Lock-screen artwork: the BPM drawn as the dot-matrix display, rendered to a PNG data URL.
import { layout } from "../ui/dotLayout";

const cache = new Map<string, string>();

export const artworkFor = (text: string, colors: { bg: string; dot: string }): string | null => {
  const key = `${text}|${colors.bg}|${colors.dot}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (typeof document === "undefined") return null;
  const size = 512;
  const canvas = Object.assign(document.createElement("canvas"), { width: size, height: size });
  const g = canvas.getContext("2d");
  if (!g) return null;
  g.fillStyle = colors.bg;
  g.fillRect(0, 0, size, size);
  const { dots, cols, rows } = layout(text, "big");
  const pitch = Math.min((size * 0.78) / cols, (size * 0.5) / rows);
  const ox = (size - cols * pitch) / 2;
  const oy = (size - rows * pitch) / 2;
  g.fillStyle = colors.dot;
  for (const [c, r] of dots) {
    g.beginPath();
    g.arc(ox + c * pitch + pitch / 2, oy + r * pitch + pitch / 2, pitch * 0.37, 0, Math.PI * 2);
    g.fill();
  }
  const url = canvas.toDataURL("image/png");
  cache.set(key, url);
  return url;
};

export const cssVar = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

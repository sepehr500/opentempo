// Install prompt (Chromium) + share. iOS has no prompt; Safari's Share → Add to Home Screen covers it.
import { createSignal } from "solid-js";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const [deferred, setDeferred] = createSignal<InstallEvent | null>(null);
const [installed, setInstalled] = createSignal(
  typeof window !== "undefined" && (matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true),
);

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    setDeferred(e as InstallEvent);
  });
  window.addEventListener("appinstalled", () => {
    setInstalled(true);
    setDeferred(null);
  });
}

export const canInstall = () => !installed() && deferred() !== null;
export const isInstalled = installed;

export const install = async () => {
  const e = deferred();
  if (!e) return;
  await e.prompt();
  await e.userChoice;
  setDeferred(null);
};

/** Web Share with clipboard fallback. Returns what happened, for a tiny confirmation. */
export const shareLink = async (title: string, url: string): Promise<"shared" | "copied" | "failed"> => {
  try {
    if (navigator.share) {
      await navigator.share({ title, url });
      return "shared";
    }
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
};

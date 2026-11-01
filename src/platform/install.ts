// Install prompt (Chromium). iOS has no prompt; Safari's Share → Add to Home Screen covers it.
import { createSignal } from "solid-js";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const [deferred, setDeferred] = createSignal<InstallEvent | null>(null);
const [installed, setInstalled] = createSignal(
  typeof window !== "undefined" && (matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true),
);

if (typeof window !== "undefined") {
  // Keep the event for the header's install button, but don't preventDefault(): that would also
  // suppress Chrome's own install banner, which is the most visible way people find out.
  window.addEventListener("beforeinstallprompt", (e) => setDeferred(e as InstallEvent));
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

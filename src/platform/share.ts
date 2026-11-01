// Share the app: the system share sheet where there is one, else copy the link.
// Takes the navigator as an argument so the fallback chain is testable without a browser.

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

type Nav = {
  share?: (d: ShareData) => Promise<void>;
  canShare?: (d: ShareData) => boolean;
  clipboard?: { writeText: (s: string) => Promise<void> };
};

export const shareData = (origin: string): ShareData => ({ title: "tempo", text: "A pocket metronome.", url: `${origin}/` });

export const shareApp = async (nav: Nav, data: ShareData): Promise<ShareResult> => {
  if (nav.share && (nav.canShare?.(data) ?? true)) {
    try {
      await nav.share(data);
      return "shared";
    } catch (e) {
      // Dismissing the sheet is a choice, not an error. Anything else falls through to copying.
      if ((e as DOMException)?.name === "AbortError") return "cancelled";
    }
  }
  try {
    await nav.clipboard!.writeText(data.url!);
    return "copied";
  } catch {
    return "failed";
  }
};

/** What to tell the user afterwards; null when the share sheet already said it. */
export const shareToast = (r: ShareResult, url: string): string | null =>
  r === "copied" ? "link copied" : r === "failed" ? url.replace(/^https?:\/\//, "").replace(/\/$/, "") : null;

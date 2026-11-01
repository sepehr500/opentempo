// Which tab a launch asks for: shortcuts open /?tab=voice or /?tab=presets. With launch_handler
// "focus-existing", Chrome refocuses an open window instead of navigating, and hands the launch
// URL to window.launchQueue instead, so both paths go through tabFromUrl.
export const TABS = ["unit", "voice", "presets"] as const;
export type LaunchTab = (typeof TABS)[number];

/** Pure: the tab named by a URL's ?tab=, or null. */
export const tabFromUrl = (url: string): LaunchTab | null => {
  try {
    const t = new URL(url, "https://opentempo.app").searchParams.get("tab");
    return (TABS as readonly string[]).includes(t ?? "") ? (t as LaunchTab) : null;
  } catch {
    return null;
  }
};

type LaunchQueue = { setConsumer: (fn: (p: { targetURL?: string }) => void) => void };

/** Calls `open` for every launch (cold start included) that names a tab; then tidies the address bar. */
export const onLaunchTab = (open: (t: LaunchTab) => void) => {
  if (typeof window === "undefined") return;
  const first = tabFromUrl(location.href);
  if (first) {
    open(first);
    history.replaceState(null, "", location.pathname + location.hash);
  }
  (window as Window & { launchQueue?: LaunchQueue }).launchQueue?.setConsumer((p) => {
    const t = p.targetURL ? tabFromUrl(p.targetURL) : null;
    if (t) open(t);
  });
};

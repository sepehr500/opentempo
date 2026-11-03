// The header's one slot, top right. Pure.
export type HeaderSlot = "update" | "install" | "share" | null;

/** An available update wins; then installing (when the browser offers it); once installed, share. */
export const headerSlot = (s: { update: boolean; canInstall: boolean; installed: boolean }): HeaderSlot =>
  s.update ? "update" : s.canInstall ? "install" : s.installed ? "share" : null;

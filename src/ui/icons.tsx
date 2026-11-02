// Pictograms from the Paper design. All use currentColor so keys can recolour them.
const S = (p: { size?: number; children: any; view?: number }) => (
  <svg width={p.size ?? 18} height={p.size ?? 18} viewBox={`0 0 ${p.view ?? 18} ${p.view ?? 18}`} aria-hidden="true">
    {p.children}
  </svg>
);

export const Dice = () => (
  <S>
    <rect x="2" y="2" width="14" height="14" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.6" />
    <circle cx="6" cy="6" r="1.4" fill="currentColor" />
    <circle cx="9" cy="9" r="1.4" fill="currentColor" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" />
  </S>
);

export const Gap = () => (
  <S>
    <rect x="1" y="4" width="7" height="10" rx="1.8" fill="currentColor" />
    <rect x="10.75" y="4.75" width="6.5" height="8.5" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2.2 1.8" />
  </S>
);

export const Timer = (p: { size?: number }) => (
  <S size={p.size}>
    <circle cx="9" cy="10.5" r="5.8" fill="none" stroke="currentColor" stroke-width={p.size ? 2.2 : 1.6} />
    <path d="M9 10.5V7.2M7 2h4" fill="none" stroke="currentColor" stroke-width={p.size ? 2.2 : 1.6} stroke-linecap="round" />
  </S>
);

export const CountIn = () => (
  <S>
    <circle cx="2.8" cy="9" r="1.6" fill="currentColor" />
    <circle cx="7.3" cy="9" r="1.6" fill="currentColor" />
    <path d="M11 4.5v9l6-4.5z" fill="currentColor" />
  </S>
);

export const Wave = () => (
  <S size={22} view={22}>
    <path d="M2 11h3l3-7 4 14 3-7h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
  </S>
);

export const Tap = () => (
  <S size={22} view={22}>
    <circle cx="11" cy="11" r="3.5" fill="currentColor" />
    <circle cx="11" cy="11" r="9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 3" />
  </S>
);

export const Play = () => (
  <S size={26} view={26}>
    <path d="M7 4.5v17l14-8.5z" fill="currentColor" />
  </S>
);

export const Stop = () => (
  <S size={26} view={26}>
    <rect x="5" y="5" width="16" height="16" rx="2" fill="var(--color-accent)" />
  </S>
);

export const Muted = () => (
  <S size={14} view={14}>
    <path d="M1.5 5h2.5l3.5-3v10L4 9H1.5z" fill="currentColor" />
    <path d="M9.5 5l3 4M12.5 5l-3 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
  </S>
);

export const More = () => (
  <S size={14} view={14}>
    <circle cx="3" cy="7" r="1.5" fill="currentColor" />
    <circle cx="7" cy="7" r="1.5" fill="currentColor" />
    <circle cx="11" cy="7" r="1.5" fill="currentColor" />
  </S>
);

// Voice pictograms (Voice screen grid).
const VOICE_PATHS: Record<string, any> = {
  click: <path d="M9 3v12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />,
  wood: <rect x="3" y="6.5" width="12" height="5" rx="1.2" fill="currentColor" />,
  bell: <path d="M5.5 4h7l2 10h-11z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />,
  rim: (
    <>
      <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="1.7" />
      <path d="M4.8 13.2l8.4-8.4" stroke="currentColor" stroke-width="1.7" />
    </>
  ),
  beep: <path d="M2 9c1.75-4 3.5-4 5.25 0s3.5 4 5.25 0 3.5-4 3.5 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />,
  clave: <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />,
  count: (
    <>
      <circle cx="5.5" cy="9" r="2" fill="currentColor" />
      <circle cx="12.5" cy="9" r="2" fill="none" stroke="currentColor" stroke-width="1.6" />
    </>
  ),
  hat: (
    <>
      <circle cx="4" cy="5" r="1.4" fill="currentColor" />
      <circle cx="9" cy="5" r="1.4" fill="currentColor" />
      <circle cx="14" cy="5" r="1.4" fill="currentColor" />
      <circle cx="6.5" cy="9.5" r="1.4" fill="currentColor" />
      <circle cx="11.5" cy="9.5" r="1.4" fill="currentColor" />
      <circle cx="9" cy="14" r="1.4" fill="currentColor" />
    </>
  ),
};

export const VoiceIcon = (p: { id: string }) => <S>{VOICE_PATHS[p.id]}</S>;

export const Plus = () => (
  <S size={14} view={14}>
    <path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
  </S>
);

export const Buzz = () => (
  <S>
    <rect x="6" y="3" width="6" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6" />
    <path d="M3 6.5v5M15 6.5v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
  </S>
);

export const Square = () => (
  <S size={12} view={12}>
    <rect x="2" y="2" width="8" height="8" rx="1.5" fill="currentColor" />
  </S>
);

export const Check = () => (
  <S size={14} view={14}>
    <path d="M2.5 7.5l3 3 6-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  </S>
);

export const Headphones = () => (
  <S>
    <path d="M3 11.5V9a6 6 0 0 1 12 0v2.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
    <rect x="2" y="10.5" width="4" height="5.5" rx="1.5" fill="currentColor" />
    <rect x="12" y="10.5" width="4" height="5.5" rx="1.5" fill="currentColor" />
  </S>
);

export const Share = () => (
  <S>
    <path d="M6.2 7.7l5.6-3.2M6.2 10.3l5.6 3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
    <circle cx="13.5" cy="3.8" r="2.3" fill="currentColor" />
    <circle cx="4.5" cy="9" r="2.3" fill="currentColor" />
    <circle cx="13.5" cy="14.2" r="2.3" fill="currentColor" />
  </S>
);

/** Time signature: a bar of beat lines, the first cut in pieces. */
export const Lines = () => (
  <S>
    <rect x="1.5" y="7.5" width="3" height="3" rx="1" fill="currentColor" />
    <rect x="5.5" y="7.5" width="3" height="3" rx="1" fill="currentColor" />
    <rect x="10" y="7.5" width="7" height="3" rx="1.2" fill="currentColor" />
  </S>
);

export const Chevron = () => (
  <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
    <path d="M1.5 3l2.5 2.5L6.5 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

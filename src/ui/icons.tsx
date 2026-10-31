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

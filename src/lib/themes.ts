export const FABLE = {
  cream: '#fff8f5',
  peach: '#ffdbd2',
  coral: '#FF7956',
  coralHover: '#ee6744',
  burgundy: '#520e33',
  plum: '#33001d',
  ink: '#1e1b18',
  body: '#524348',
  muted: '#857278',
  border: '#e9d7d0',
  borderSoft: '#d7c1c7',
  error: '#a7391c',
  success: '#0d5e30',
} as const;

export const SYSTEM_THEMES = {
  Ubuntu: { id: 'ubuntu', label: 'Ubuntu', color: '#520e33' },
  Ubwiyunge: { id: 'ubwiyunge', label: 'Ubwiyunge', color: '#FF7956' },
  Umuganda: { id: 'umuganda', label: 'Umuganda', color: '#33001d' },
} as const;

export type SystemThemeName = keyof typeof SYSTEM_THEMES;

export const SYSTEM_THEME_NAMES = Object.keys(SYSTEM_THEMES) as SystemThemeName[];

export function themeColor(label?: string | null): string {
  if (!label) return FABLE.muted;
  const key = SYSTEM_THEME_NAMES.find((name) => name.toLowerCase() === label.toLowerCase());
  return key ? SYSTEM_THEMES[key].color : FABLE.muted;
}

export function themeBadgeClass(label?: string | null): string {
  return 'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white';
}

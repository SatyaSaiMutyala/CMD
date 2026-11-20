// Colour tokens: Trustlab's shared web look (as used by TruSentinel / Gatebook),
// with the CMD Approval Hub brand colour #22A991 as the accent. Light only.
export const tokens = {
  bg: '#F4F6F8', // page canvas
  surface: '#FFFFFF',
  sunk: '#EDF1F4', // quiet fills: neutral chips, placeholders
  ink: '#10151C',
  muted: '#4A5763', // secondary text
  faint: '#7E8A96', // hints
  line: '#DDE3E9',
  line2: '#EDF1F4', // hairlines: table rows, sub-dividers
  accent: '#22A991', // brand: primary actions, focus, active states
  accentHover: '#1C917C',
  accentDark: '#157A69', // brand-coloured text on white
  accentInk: '#FFFFFF',
  accentSoft: '#E6F6F2',
  gold: '#FFC81F',
  goldDark: '#E0A800',
  head: '#157A69', // panel title bars
  headRule: '#F4C430', // 2px rule under panel titles
  colRule: '#F94C8E', // rule under table column labels
  rail: '#0E3529', // sidebar / phone app bar (solid fallback of RAIL_BG)
  railInk: '#E2EDE8',
  railMuted: '#8FB0A5',
  ok: '#1E7A45',
  okSoft: '#E7F3EC',
  warn: '#B4700B',
  warnSoft: '#FCF1DF',
  bad: '#B3261E',
  badSoft: '#FBEAE9',
  info: '#1B5E9E',
  infoSoft: '#E8F1F9',
}

/** Sidebar / phone app bar background. */
export const RAIL_BG =
  'radial-gradient(125% 46% at 0% 100%, rgba(34,169,145,.28) 0%, rgba(34,169,145,0) 64%), ' +
  'linear-gradient(172deg, #0A2620 0%, #0E3529 28%, #134A38 66%, #1A6249 100%)'

export const fonts = {
  body: '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
}

export const SHADOW = '0 1px 2px rgba(16,21,28,.06), 0 4px 12px rgba(16,21,28,.05)'
export const MENU_SHADOW = '0 10px 28px rgba(16,21,28,.16)'

/** Shell breakpoint: phone layout below 861px. Used as the theme's `md` breakpoint. */
export const DESKTOP_MIN = 861
/** Sidebar width: expanded / collapsed to icons. */
export const RAIL_WIDTH = 258
export const RAIL_COLLAPSED = 66
export const TOPBAR_HEIGHT = 60

// ─── DiabEasy Theme Colours ───────────────────────────────────────────────────

export const COLORS = {
  light: {
    // Brand
    red:        '#EC5557',
    redDark:    '#c94042',

    // Backgrounds
    bg:         '#ffffff',
    bgSecondary:'#fafafa',
    bgCard:     '#fafafa',

    // Borders
    border:     '#e0e0e0',
    borderLight:'#f0f0f0',

// Text
    text:       '#222222',
    textMuted:  '#666666',
    textFaint:  '#aaaaaa',

    // Status colours
    low:        '#EC5557',
    normal:     '#2e7d32',
    high:       '#ef6c00',

    // Status backgrounds
    lowBg:      '#fff5f5',
    normalBg:   '#f1f8f1',
    highBg:     '#fff8f0',

    // Input
    inputBg:    '#ffffff',
    placeholder:'#aaaaaa',

    // Tab bar
    tabBar:     '#ffffff',
    tabInactive:'#888888',

    // Misc
    divider:    '#ececec',
    shadow:     '#000000',
    white:      '#ffffff',
    overlay:    'rgba(0,0,0,0.35)',
  },

  dark: {
    // Brand — darker reds for dark mode
    red:        '#c44244',
    redDark:    '#993133',

    // Backgrounds
    bg:         '#121212',
    bgSecondary:'#1e1e1e',
    bgCard:     '#2a2a2a',

    // Borders
    border:     '#2c2c2c',
    borderLight:'#2a2a2a',

    // Text
    text:       '#f0f0f0',
    textMuted:  '#a0a0a0',
    textFaint:  '#666666',

    // Status colours
    low:        '#c24648',
    normal:     '#43a047',
    high:       '#efa300',

    // Status backgrounds — darker tints
    lowBg:      '#2a1515',
    normalBg:   '#152a15',
    highBg:     '#2a1e10',

    // Input
    inputBg:    '#2a2a2a',
    placeholder:'#888888',

    // Tab bar
    tabBar:     '#1a1a1a',
    tabInactive:'#666666',

    // Misc
    divider:    '#2c2c2c',
    shadow:     '#000000',
    white:      '#2a2a2a',
    overlay:    'rgba(0,0,0,0.6)',
  },
} as const;

export type ColorScheme = { [K in keyof typeof COLORS.light]: string };

/* and all I did I did it for her */


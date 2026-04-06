# DiabEasy 2.0 — Design Tokens

## Colors

### Brand
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| colors.red | #EC5557 | #9c2522 | Buttons, active tabs, accents, borders |
| colors.redDark | #c94042 | #7a1c1a | Hover states, pressed states |

### Backgrounds
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| colors.bg | #ffffff | #121212 | Screen background |
| colors.bgSecondary | #fafafa | #1e1e1e | Subtle section backgrounds |
| colors.bgCard | #fafafa | #2a2a2a | Cards, section cards |
| colors.inputBg | #ffffff | #2a2a2a | TextInput backgrounds |
| colors.tabBar | #ffffff | #1a1a1a | Bottom tab bar background |

### Text
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| colors.text | #222222 | #f0f0f0 | Primary text |
| colors.textMuted | #666666 | #a0a0a0 | Secondary text, labels, hints |
| colors.textFaint | #aaaaaa | #666666 | Placeholder-like text, disclaimers |
| colors.placeholder | #aaaaaa | #888888 | TextInput placeholder text |
| colors.tabInactive | #888888 | #666666 | Inactive tab icons and labels |

### Borders
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| colors.border | #e0e0e0 | #2c2c2c | Card borders, input borders, dividers |
| colors.borderLight | #f0f0f0 | #2a2a2a | Subtle row separators |
| colors.divider | #ececec | #2c2c2c | Horizontal divider lines |

### Status Colors
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| colors.low | #e53935 | #9c2522 | Low glucose text |
| colors.normal | #2e7d32 | #43a047 | Normal glucose text |
| colors.high | #ef6c00 | #ef6c00 | High glucose text |
| colors.lowBg | #fff5f5 | #2a1515 | Low glucose background tint |
| colors.normalBg | #f1f8f1 | #152a15 | Normal glucose background tint |
| colors.highBg | #fff8f0 | #2a1e10 | High glucose background tint |

### Misc
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| colors.white | #ffffff | #2a2a2a | Replaces hardcoded white |
| colors.overlay | rgba(0,0,0,0.35) | rgba(0,0,0,0.6) | Modal backdrop |

---

## Typography

| Style | Size | Weight | Usage |
|-------|------|--------|-------|
| Screen title | 18px | 600 | "Medication", "Past Measurements" |
| Section title | 10px | 700 | Uppercase label above card sections |
| Body | 13–14px | 400 | General content text |
| Body bold | 13–14px | 700 | Emphasized content |
| Label | 11–12px | 600 | Field labels above inputs |
| Caption | 10–11px | 400–500 | Hints, disclaimers, stat labels |
| Button | 13–15px | 600–700 | All button text |
| Stat number | 16–22px | 800 | QuickStats numbers, dose numbers |
| Logo | 22px | bold | Header DiabEasy text |

---

## Spacing

| Usage | Value |
|-------|-------|
| Screen horizontal padding | 16px |
| Screen bottom padding | 32–48px |
| Card padding | 14px |
| Card margin bottom | 12px |
| Input vertical padding (iOS) | 9px |
| Input vertical padding (Android) | 7px |
| Input horizontal padding | 12px |
| Gap between filter buttons | 12px |
| Gap between pills | 8–10px |

---

## Border Radius

| Element | Radius |
|---------|--------|
| Section cards | 12px |
| Buttons (primary) | 8px |
| Buttons (small/pill) | 6px |
| Pills / type toggles | 6px |
| Inputs | 6px |
| Avatar circle | 50% (half of width/height) |
| Emergency call card | 14px |
| Reminder cards | 10px |
| Popup / modal card | 16px |
| Stat/summary boxes | 8px |
| Symptom chips | 6px |

---

## Border Widths

| Usage | Width |
|-------|-------|
| Card border | 1px |
| Input border (default) | 1.5px |
| Input border (focused) | 1.5px (color changes to red) |
| Tab bar border | 1.5px |
| Active pill border | 1.5px |
| Emergency call card | 2px |
| Popup card | 2px |
| See Help / Close buttons | 2px |

---

## Shadows (Android elevation)

| Element | Elevation |
|---------|-----------|
| Fasting option rows | 2 |
| Popup / modal card | 10 |

---

## Component Patterns

### Primary Button
- Background: `colors.red`
- Text: `#ffffff`, 14–15px, bold
- Border radius: 8px
- Padding: 11–12px vertical, 28px horizontal

### Outline Button
- Background: transparent
- Border: 1.5px `colors.red`
- Text: `colors.red`, 14px, 600
- Border radius: 8px

### Pill / Toggle
- Inactive: border 1.5px `colors.border`, text `colors.textMuted`
- Active: background `colors.red`, border `colors.red`, text `#ffffff`

### Section Card
- Background: `colors.bgCard`
- Border: 1px `colors.border`
- Border radius: 12px
- Padding: 14px
- Margin bottom: 12px

### Text Input
- Background: `colors.inputBg`
- Border: 1.5px `colors.border` → `colors.red` on focus
- Border radius: 6px
- Text: `colors.text`
- Placeholder: `colors.placeholder`

### Tab Bar (3-segment)
- Container border: 1.5px `colors.red`, radius 8px, overflow hidden
- Active tab: background `colors.red`, text `#ffffff`
- Inactive tab: background `colors.bgCard`, text `colors.red`
/**
 * Shared shadow utilities for DiabEasy.
 * All shadow styles avoid `elevation` on buttons (prevents Android gray bg).
 * Cards CAN use elevation since they always have a background.
 */

/** Hard offset shadow for filled (red) buttons — iOS only, intentional */
export function primaryBtnShadow(shadowColor = '#7a1010') {
  return {
    shadowColor,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 0,
  };
}

/** Soft floating shadow for cards */
export function floatingCardShadow(isDark: boolean) {
  return {
    shadowColor: isDark ? '#000' : '#6070a0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.35 : 0.1,
    shadowRadius: 18,
    elevation: isDark ? 6 : 5,
  };
}

/** Neumorphic raised shadow for cards (light mode directional, dark mode deep) */
export function raisedCardShadow(isDark: boolean) {
  return isDark
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 3, height: 5 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
        elevation: 6,
      }
    : {
        shadowColor: '#8090b0',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
        elevation: 4,
      };
}

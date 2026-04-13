/**
 * insulinUtils.ts
 *
 * Biexponential IOB model — same approach used by Loop / OpenAPS / AndroidAPS.
 *
 * Reference: Dragan Maksimovic, "Insulin Action Curve" parameterisation.
 *   tp  = time to peak activity (hours)
 *   DIA = Duration of Insulin Action (hours)
 *   tau = derived shape parameter
 *   S   = derived scale parameter
 *   IOB fraction at elapsed time t = 1 - S·t²·(1 - t/2DIA)
 */

import type { InsulinEntry } from '../store/glucoseStore';
import type { InsulinAnalogType, LongActingInsulinType } from '../store/glucoseStore';

// ─── Analog catalogue ──────────────────────────────────────────────────────────

export const INSULIN_ANALOGS: {
  value:      InsulinAnalogType;
  label:      string;          // short name shown on pills
  sublabel:   string;          // brand examples shown in log / reminders
  tp:         number;          // time to peak in hours
  defaultDia: number;          // recommended default DIA in hours
}[] = [
  {
    value:      'standard',
    label:      'Standard',
    sublabel:   'Humalog, NovoRapid',
    tp:         75 / 60,   // 1.25 h
    defaultDia: 5,
  },
  {
    value:      'ultra-rapid',
    label:      'Ultra-rapid',
    sublabel:   'Fiasp, Lyumjev',
    tp:         55 / 60,   // 0.917 h
    defaultDia: 4,
  },
  {
    value:      'inhaled',
    label:      'Inhaled',
    sublabel:   'Afrezza',
    tp:         17 / 60,   // 0.283 h
    defaultDia: 2,
  },
];

export function getAnalogByType(type: InsulinAnalogType) {
  return INSULIN_ANALOGS.find(a => a.value === type) ?? INSULIN_ANALOGS[0];
}

// ─── Long-acting catalogue ────────────────────────────────────────────────────

export const LONG_ACTING_INSULINS: {
  value:    LongActingInsulinType;
  label:    string;
  sublabel: string;   // brand names
  duration: string;   // approximate action duration shown in UI
}[] = [
  {
    value:    'glargine-u100',
    label:    'Glargine U-100',
    sublabel: 'Lantus, Basaglar, Semglee',
    duration: '~24 h',
  },
  {
    value:    'glargine-u300',
    label:    'Glargine U-300',
    sublabel: 'Toujeo',
    duration: '~36 h',
  },
  {
    value:    'detemir',
    label:    'Detemir',
    sublabel: 'Levemir',
    duration: '~18–22 h',
  },
  {
    value:    'degludec',
    label:    'Degludec',
    sublabel: 'Tresiba',
    duration: '~42 h',
  },
  {
    value:    'nph',
    label:    'NPH',
    sublabel: 'Humulin N, Insulatard',
    duration: '~12–18 h',
  },
];

export function getLongActingByType(type: LongActingInsulinType) {
  return LONG_ACTING_INSULINS.find(a => a.value === type) ?? LONG_ACTING_INSULINS[0];
}

// ─── Core IOB formula ─────────────────────────────────────────────────────────

/**
 * Returns the fraction of a single dose still active at `t` hours post-injection.
 * Uses the biexponential (Loop/OpenAPS) model.
 */
function iobFraction(t: number, tp: number, dia: number): number {
  if (t <= 0)   return 1;
  if (t >= dia) return 0;
  // The formula requires tp < dia/2; guard against bad user-entered DIA values.
  const safeTp = Math.min(tp, dia / 2 - 0.01);
  const tau    = safeTp * (1 - safeTp / dia) / (1 - 2 * safeTp / dia);
  const S      = 1 / (tau * dia * (1 - 2 * tau / dia));
  return Math.max(0, 1 - S * t * t * (1 - t / (2 * dia)));
}

// ─── Public helpers ───────────────────────────────────────────────────────────

/**
 * Total rapid-acting insulin still on board (units).
 * Only entries with a stored ISO `timestamp` are counted; legacy entries
 * (logged before this feature was added) are safely skipped.
 */
export function calculateIOB(
  insulinEntries: InsulinEntry[],
  insulinAnalogType: InsulinAnalogType,
  dia: number,
): number {
  const { tp } = getAnalogByType(insulinAnalogType);
  const now    = Date.now();
  return insulinEntries
    .filter(e => e.type === 'Rapid-acting' && Boolean(e.timestamp))
    .reduce((total, entry) => {
      const elapsedHours = (now - new Date(entry.timestamp!).getTime()) / 3_600_000;
      return total + entry.units * iobFraction(elapsedHours, tp, dia);
    }, 0);
}

/**
 * Raw correction dose in units (positive = need more insulin, negative = BG below target).
 */
export function calcCorrectionDose(
  currentMgDl: number,
  targetMgDl:  number,
  isf:         number,
): number {
  return (currentMgDl - targetMgDl) / isf;
}

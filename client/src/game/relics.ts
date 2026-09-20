/** Night Shift design reminder: reclaimed relics are permanent, rule-changing memories — not scoring loot. */
import type { NightShiftProfile } from "./ProgressStore";

export interface RunModifiers {
  /** Extra seconds added to each sector timer. */
  extraTime: number;
  /** Multiplier for noise dissipation (1 = baseline, >1 = quieter). */
  noiseRelax: number;
  /** How many fewer access passes the exit requires (never below 3). */
  passDiscount: number;
  /** Extra multiplier on the quiet-extraction grade bonus. */
  quietBonus: number;
  /** Cosmetic breadcrumb for the diary panel. */
  activeRelics: string[];
}

export const RELIC_INFO: Record<string, string> = {
  "Часы отца": "Напоминают, что время принадлежит вам: +15 секунд к каждой ночи.",
  "Памятная ручка": "Шум рассеивается на четверть быстрее — преследователи теряют след.",
  "Ключ от дома": "Выходу нужно на один пропуск меньше.",
  "Фото близких": "Тихий выход оценивается на четверть дороже.",
};

const DEFAULT_MODIFIERS: RunModifiers = {
  extraTime: 0,
  noiseRelax: 1,
  passDiscount: 0,
  quietBonus: 0,
  activeRelics: [],
};

/** Persisted relics from previous nights become passive rules for the next night. */
export function relicModifiers(profile: NightShiftProfile): RunModifiers {
  const relics = profile.relics ?? [];
  const has = (name: string) => relics.includes(name);
  return {
    extraTime: (has("Часы отца") ? 1 : 0) * 15,
    noiseRelax: has("Памятная ручка") ? 1.28 : 1,
    passDiscount: has("Ключ от дома") ? 1 : 0,
    quietBonus: has("Фото близких") ? 0.25 : 0,
    activeRelics: Object.keys(RELIC_INFO).filter((name) => has(name)),
  };
}

export { DEFAULT_MODIFIERS };
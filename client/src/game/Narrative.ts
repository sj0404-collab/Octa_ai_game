/** Prism Relay design reminder: choices are crisp diagnostic contracts, not generic dialogue menus. */
import type { ShellId } from "./types";

export type FactionId = "guide" | "core" | "market";
export type EventChoiceId = "guide" | "core" | "roulette";
export interface RunLedger { guide: number; core: number; market: number; debt: number; relics: string[]; choices: string[]; }
export interface EventChoice { id: EventChoiceId; label: string; detail: string; tone: "mint" | "violet" | "amber"; }
export interface RunEvent { id: string; kicker: string; title: string; body: string; choices: EventChoice[]; }
export interface Epilogue { title: string; body: string; ledger: string; }

export function createLedger(): RunLedger { return { guide: 0, core: 0, market: 0, debt: 0, relics: [], choices: [] }; }

export function createTerminalEvent(kind: "story" | "roulette", seed: number, sector: number): RunEvent {
  const sequence = Math.abs((seed * 31 + sector * 17) % 3);
  if (kind === "roulette") return {
    id: `roulette-${sector}-${seed}`, kicker: "ЧЁРНАЯ БУХГАЛТЕРИЯ // ЛОТЕРЕЙНЫЙ УЗЕЛ", title: "КОНВЕРТ БЕЗ ПОДПИСИ", body: "Внутренний автомат предлагает маршрут, редкий инструмент или новый долг перед фирмой. Денег он не просит — платой станет следующая смена.",
    choices: [
      { id: "roulette", label: "ВСКРЫТЬ КОНВЕРТ", detail: "Награда или долг", tone: "amber" },
      { id: "guide", label: "ОСТАВИТЬ ЗАПИСКУ КОЛЛЕГЕ", detail: "Тихий маршрут", tone: "mint" },
      { id: "core", label: "ПОДПИСАТЬ ПРИКАЗ ФИРМЫ", detail: "Защита за лояльность", tone: "violet" },
    ],
  };
  const entries = [
    ["НЕОТПРАВЛЕННОЕ ПИСЬМО", "В черновиках лежит письмо близким, которое вы не успели дописать. Его можно спрятать, сдать службе безопасности или обменять на доступ."],
    ["КАРТОЧКА УЧЁТА ВРЕМЕНИ", "Архив показывает годы без выходных. Можно передать копию коллегам, стереть запись по приказу или использовать её как пропуск в хранилище."],
    ["КЛЮЧ ОТ СВОЕГО СТОЛА", "В коробке лежит ключ, который фирма считала своим. Его можно забрать, обменять на спокойствие или открыть запретный маршрут."],
  ][sequence];
  return {
    id: `story-${sector}-${seed}`, kicker: "СЮЖЕТНЫЙ ТЕРМИНАЛ // ВЫБОР", title: entries[0], body: entries[1],
    choices: [
      { id: "guide", label: "СОХРАНИТЬ ДЛЯ СВОИХ", detail: "ЭХО · тише", tone: "mint" },
      { id: "core", label: "ОТДАТЬ В ОТДЕЛ КАДРОВ", detail: "БАСТИОН · защита", tone: "violet" },
      { id: "roulette", label: "ОБМЕНЯТЬ НА ДОСТУП", detail: "ПРИЗМА ИЛИ ДОЛГ", tone: "amber" },
    ],
  };
}

export function resolveEvent(ledger: RunLedger, event: RunEvent, choice: EventChoiceId, seed: number): { message: string; shell?: ShellId; health: number } {
  ledger.choices.push(`${event.id}:${choice}`);
  if (choice === "guide") { ledger.guide += 2; ledger.relics.push("тихий маршрут"); return { message: "КОЛЛЕГИ ОТКРЫЛИ ТИХИЙ МАРШРУТ — РЕЖИМ ЭХО", shell: "echo", health: 1 }; }
  if (choice === "core") { ledger.core += 2; ledger.relics.push("служебный пропуск"); return { message: "ФИРМА ЗАКРЫЛА ОДИН УДАР — РЕЖИМ БАСТИОН", shell: "bastion", health: 2 }; }
  const roll = Math.abs((seed * 1103515245 + ledger.choices.length * 12345) >>> 0) % 3;
  ledger.market += 2;
  if (roll === 0) { ledger.relics.push("ключ от хранилища"); return { message: "КОНВЕРТ: КЛЮЧ ОТ ХРАНИЛИЩА — РЕЖИМ ПРИЗМА", shell: "prism", health: 1 }; }
  if (roll === 1) { ledger.relics.push("запасной заряд"); return { message: "КОНВЕРТ: ЗАРЯД БЛАСТЕРА УСИЛЕН — ШУМ ВЫШЕ", health: 2 }; }
  ledger.debt += 1; return { message: "КОНВЕРТ: ДОЛГ ЗАПИСАН — СТЕНЫ ПЕРЕСТРОЕНЫ", health: -1 };
}

export function composeEpilogue(ledger: RunLedger, seed: number): Epilogue {
  const dominant: FactionId = ledger.guide >= ledger.core && ledger.guide >= ledger.market ? "guide" : ledger.core >= ledger.market ? "core" : "market";
  const titles = { guide: ["ЗАПИСКА НА ДВЕРИ ДОМА", "ТИХИЙ ВЫХОД", "ВРЕМЯ ВЕРНУЛОСЬ"], core: ["ЕЩЁ ОДИН РАБОЧИЙ ДЕНЬ", "ПОДПИСЬ ВНИЗУ ЛИСТА", "ДВЕРЬ В ОТДЕЛ КАДРОВ"], market: ["ЦЕНА СВЕРХУРОЧНЫХ", "СЛУЧАЙНАЯ ЗАРПЛАТА", "КОНВЕРТ БЕЗ КОНЦА"] };
  const index = Math.abs(seed + ledger.debt + ledger.relics.length) % titles[dominant].length;
  const premise = dominant === "guide" ? "НОЧНАЯ СМЕНА ОСТАВИЛА СВЕТ К ВЫХОДУ." : dominant === "core" ? "ФИРМА ТРЕБУЕТ ВАШЕГО ВОЗВРАТА." : "БУХГАЛТЕРИЯ НЕ ЗАКРЫЛА СЧЁТ.";
  const debt = ledger.debt > 0 ? ` ДОЛГ: ${ledger.debt}. ОФИС ПРОДОЛЖАЕТ ПОИСК.` : "ДОЛГ НЕ ДОГНАЛ ВАС ДО ДВЕРИ.";
  const relic = ledger.relics.length ? ` ДНЕВНИК: ${ledger.relics.slice(-2).join(", ")}.` : "ДНЕВНИК: МАРШРУТ СОХРАНЁН.";
  return { title: titles[dominant][index], body: `${premise}${debt}${relic}`, ledger: `КОЛЛЕГИ ${ledger.guide} · ФИРМА ${ledger.core} · БУХГАЛТЕРИЯ ${ledger.market} · ДОЛГ ${ledger.debt}` };
}

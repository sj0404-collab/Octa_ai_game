/** Prism Relay design reminder: each sector escalates threat while keeping its rule readable at a glance. */
import type { Point2 } from "./types";

export interface SectorConfig {
  id: number;
  codeName: string;
  objective: string;
  chargesRequired: number;
  duration: number;
  patrolSpeed: number;
  chaseSpeed: number;
  visionRange: number;
  exit: Point2;
}

export const SECTORS: SectorConfig[] = [
  {
    id: 1,
    codeName: "ПОДВАЛ // ОТДЕЛ ПОДДЕРЖКИ",
    objective: "СОБЕРИТЕ ПРОПУСКА И НАЙДИТЕ ПОЖАРНЫЙ ВЫХОД",
    chargesRequired: 5,
    duration: 180,
    patrolSpeed: 1.58,
    chaseSpeed: 3.15,
    visionRange: 4.75,
    exit: { x: 9, z: 0.8 },
  },
  {
    id: 2,
    codeName: "ЛИФТ // АРХИВНЫЙ ЭТАЖ",
    objective: "ВСКРОЙТЕ АРХИВ И ОБОЙДИТЕ УСИЛЕННЫЙ ПАТРУЛЬ",
    chargesRequired: 6,
    duration: 195,
    patrolSpeed: 1.9,
    chaseSpeed: 3.75,
    visionRange: 5.1,
    exit: { x: -9.1, z: -3.8 },
  },
  {
    id: 3,
    codeName: "ЧЕРДАК // ХРАНИЛИЩЕ ЗАРПЛАТ",
    objective: "ОПУСТОШИТЕ ХРАНИЛИЩЕ И УЙДИТЕ ДО ПРОБУЖДЕНИЯ",
    chargesRequired: 7,
    duration: 210,
    patrolSpeed: 2.12,
    chaseSpeed: 4.2,
    visionRange: 5.45,
    exit: { x: 7.7, z: -4.9 },
  },
];

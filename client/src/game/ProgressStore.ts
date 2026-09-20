/** Night Shift design reminder: durable progress is a reclaimed record of the worker’s life, never a disposable score. */
export interface CasualCheckpoint { sectorIndex: number; runSeed: number; x: number; z: number; passes: number; charges: number; secondsLeft: number; }
export interface NightShiftProfile { money: number; rations: number; relics: string[]; achievements: string[]; completedRuns: number; checkpoint: CasualCheckpoint | null; }
const KEY = "ai-core-night-shift-profile-v1";
const EMPTY: NightShiftProfile = { money: 0, rations: 0, relics: [], achievements: [], completedRuns: 0, checkpoint: null };

export class ProgressStore {
  private state: NightShiftProfile;
  constructor() {
    try { this.state = { ...EMPTY, ...JSON.parse(window.localStorage.getItem(KEY) ?? "{}") }; }
    catch { this.state = { ...EMPTY }; }
  }
  get profile() { return this.state; }
  addMoney(amount: number) { this.state.money += Math.max(0, amount); this.save(); }
  buyRation(cost = 40) { if (this.state.money < cost) return false; this.state.money -= cost; this.state.rations += 1; this.save(); return true; }
  consumeRation() { if (this.state.rations < 1) return false; this.state.rations -= 1; this.save(); return true; }
  addRelic(relic: string) { if (!this.state.relics.includes(relic)) { this.state.relics.push(relic); this.save(); return true; } return false; }
  award(id: string) { if (!this.state.achievements.includes(id)) { this.state.achievements.push(id); this.save(); return true; } return false; }
  completeRun() { this.state.completedRuns += 1; this.save(); }
  saveCheckpoint(checkpoint: CasualCheckpoint) { this.state.checkpoint = checkpoint; this.save(); }
  clearCheckpoint() { this.state.checkpoint = null; this.save(); }
  private save() { window.localStorage.setItem(KEY, JSON.stringify(this.state)); }
}

/** 跨宠物的档案存档：金币 / 进化图鉴 / 统计 / 成就 / 装饰。
 *  与宠物存档(SaveManager)相互独立：离家出走清档时这里保留,养成成果"沉淀"下来。
 *  JSON schema 逐字段校验 + 钳制,键 = pixelpet.profile.v1。 */

import { SPECIES, formOf, type PetForm } from "../config";
import type { PetSave } from "./SaveManager";

export interface ProfileStats {
  /** 累计孵化只数 */
  hatched: number;
  /** 累计离家出走只数 */
  departed: number;
  fed: number;
  cleaned: number;
  patted: number;
  /** 小游戏场次 / 胜场 */
  games: number;
  wins: number;
}

export interface PetProfile {
  version: number;
  coins: number;
  /** 已见形态,键 = `${speciesId}-${form}` */
  dex: string[];
  stats: ProfileStats;
  /** 已达成成就 id */
  achievements: string[];
  /** 已购装饰 id */
  ownedDecor: string[];
}

const KEY = "pixelpet.profile.v1";
const VERSION = 1;

export function defaultProfile(): PetProfile {
  return {
    version: VERSION,
    coins: 0,
    dex: [],
    stats: { hatched: 0, departed: 0, fed: 0, cleaned: 0, patted: 0, games: 0, wins: 0 },
    achievements: [],
    ownedDecor: [],
  };
}

/** 合法图鉴键集合：species × 6 形态 */
const VALID_DEX_KEYS = new Set(
  SPECIES.flatMap((s) => {
    const forms: PetForm[] = ["s1", "s2", "s3", "s4", "s5good", "s5bad"];
    return forms.map((f) => `${s.id}-${f}`);
  }),
);

export function dexKeyOf(pet: PetSave): string {
  return `${pet.speciesId}-${formOf(pet.stage, pet.branch)}`;
}

function clampCount(v: unknown, fallback = 0): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.max(0, Math.floor(v));
}

function clampCoins(v: unknown): number {
  const n = clampCount(v);
  return Math.min(999999, n);
}

function clampStrArray(v: unknown, valid?: Set<string>): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== "string") continue;
    if (valid && !valid.has(item)) continue;
    if (!out.includes(item)) out.push(item);
  }
  return out;
}

function clampStats(v: unknown): ProfileStats {
  const raw = typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
  const d = defaultProfile().stats;
  return {
    hatched: clampCount(raw.hatched, d.hatched),
    departed: clampCount(raw.departed, d.departed),
    fed: clampCount(raw.fed, d.fed),
    cleaned: clampCount(raw.cleaned, d.cleaned),
    patted: clampCount(raw.patted, d.patted),
    games: clampCount(raw.games, d.games),
    wins: clampCount(raw.wins, d.wins),
  };
}

export class ProfileStore {
  static load(): PetProfile {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultProfile();
      const p: unknown = JSON.parse(raw);
      if (typeof p !== "object" || p === null) return defaultProfile();
      const r = p as Record<string, unknown>;
      return {
        version: VERSION,
        coins: clampCoins(r.coins),
        dex: clampStrArray(r.dex, VALID_DEX_KEYS),
        stats: clampStats(r.stats),
        achievements: clampStrArray(r.achievements),
        ownedDecor: clampStrArray(r.ownedDecor),
      };
    } catch {
      return defaultProfile();
    }
  }

  static save(profile: PetProfile): void {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...profile, version: VERSION }));
    } catch {
      // 隐私模式等存储不可用场景：静默降级
    }
  }

  static update(mutate: (profile: PetProfile) => void): PetProfile {
    const profile = ProfileStore.load();
    mutate(profile);
    ProfileStore.save(profile);
    return profile;
  }

  /** 记录已见形态;返回 true = 图鉴新收录 */
  static markSeenForm(key: string): boolean {
    if (!VALID_DEX_KEYS.has(key)) return false;
    let added = false;
    ProfileStore.update((p) => {
      if (!p.dex.includes(key)) {
        p.dex.push(key);
        added = true;
      }
    });
    return added;
  }

  static addCoins(amount: number): void {
    if (amount === 0) return;
    ProfileStore.update((p) => {
      p.coins = clampCoins(p.coins + amount);
    });
  }
}

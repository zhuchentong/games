/** 宠物存档：JSON schema 逐字段校验 + 钳制，防手改/旧档脏数据流入运行时。 */

import {
  BOND_MAX,
  DAY_MS,
  GAME_HEIGHT,
  GAME_WIDTH,
  MAX_STAGE,
  NEGLECT_LIMIT_SEC,
  PERSONALITY,
  POOP_MAX,
  SPECIES_BY_ID,
  WEIGHT_MAX,
  WEIGHT_START,
  stageOfAge,
  type Branch,
  type Personality,
} from "../config";

export interface PoopSpot {
  x: number;
  y: number;
}

export interface PetSave {
  version: number;
  speciesId: string;
  /** 配色变体 0 | 1 */
  variant: number;
  personality: Personality;
  /** 孵化时刻（epoch ms） */
  bornAt: number;
  /** 上次保存时刻（epoch ms） */
  lastSeen: number;
  hunger: number;
  happy: number;
  energy: number;
  clean: number;
  weight: number;
  /** 照顾分 0-100，决定成年期进化分支 */
  care: number;
  /** 亲密度 0-999，摸头/喂食/玩耍胜利/清洁积累 */
  bond: number;
  sick: boolean;
  asleep: boolean;
  /** 成长阶段 1-5 */
  stage: number;
  branch: Branch;
  /** 疏忽累计（秒），达阈值离家出走 */
  neglectSec: number;
  poops: PoopSpot[];
}

const KEY = "pixelpet.save.v1";
const PERSONALITIES = Object.values(PERSONALITY) as string[];

/** 旧版幻想种 → 常见动物的物种迁移（保留成长阶段与照顾分） */
const SPECIES_MIGRATION: Record<string, string> = {
  fire: "cat",
  water: "rabbit",
  grass: "dog",
  elec: "chick",
};

/** 新孵化宠物初始状态 */
export function defaultPet(speciesId: string, variant: number, personality: Personality): PetSave {
  const now = Date.now();
  return {
    version: 1,
    speciesId,
    variant,
    personality,
    bornAt: now,
    lastSeen: now,
    hunger: 80,
    happy: 80,
    energy: 90,
    clean: 100,
    weight: WEIGHT_START,
    care: 70,
    bond: 0,
    sick: false,
    asleep: false,
    stage: 1,
    branch: "good",
    neglectSec: 0,
    poops: [],
  };
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function clampBool(v: unknown): boolean {
  return v === true;
}

function isPetShape(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** 阶段字段迁移：旧档为 baby/child/adult 字符串 → 按出生时间换算为 1-5 数值阶段 */
function migrateStage(raw: unknown, bornAt: number): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return clampNum(raw, 1, MAX_STAGE, 1);
  }
  const legacy = String(raw);
  if (legacy === "baby") return 1;
  if (legacy === "child") return 2;
  const ageDays = Math.max(0, Date.now() - bornAt) / DAY_MS;
  return stageOfAge(ageDays);
}

export class SaveManager {
  /** 无档或档损坏返回 null */
  static load(): PetSave | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const p: unknown = JSON.parse(raw);
      if (!isPetShape(p)) return null;
      let speciesId = typeof p.speciesId === "string" ? p.speciesId : "";
      speciesId = SPECIES_MIGRATION[speciesId] ?? speciesId;
      if (!(speciesId in SPECIES_BY_ID)) return null;
      const now = Date.now();
      const bornAt = clampNum(p.bornAt, 0, Number.MAX_SAFE_INTEGER, now);
      const poops: PoopSpot[] = Array.isArray(p.poops)
        ? p.poops.slice(0, POOP_MAX).map((raw2) => {
            const spot = isPetShape(raw2) ? raw2 : {};
            return {
              x: clampNum(spot.x, 0, GAME_WIDTH, 120),
              y: clampNum(spot.y, 0, GAME_HEIGHT, 500),
            };
          })
        : [];
      return {
        version: 1,
        speciesId,
        variant: clampNum(p.variant, 0, 1, 0),
        personality: (PERSONALITIES.includes(p.personality as Personality)
          ? p.personality
          : PERSONALITY.Lively) as Personality,
        bornAt,
        lastSeen: clampNum(p.lastSeen, bornAt, Number.MAX_SAFE_INTEGER, now),
        hunger: clampNum(p.hunger, 0, 100, 80),
        happy: clampNum(p.happy, 0, 100, 80),
        energy: clampNum(p.energy, 0, 100, 90),
        clean: clampNum(p.clean, 0, 100, 100),
        weight: clampNum(p.weight, 5, WEIGHT_MAX, WEIGHT_START),
        care: clampNum(p.care, 0, 100, 70),
        bond: clampNum(p.bond, 0, BOND_MAX, 0),
        sick: clampBool(p.sick),
        asleep: clampBool(p.asleep),
        stage: migrateStage(p.stage, bornAt),
        branch: p.branch === "bad" ? "bad" : "good",
        neglectSec: clampNum(p.neglectSec, 0, NEGLECT_LIMIT_SEC, 0),
        poops,
      };
    } catch {
      return null;
    }
  }

  static save(data: PetSave): void {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...data, lastSeen: Date.now() }));
    } catch {
      // 隐私模式等存储不可用场景：静默降级为不存档
    }
  }

  static update(mutate: (data: PetSave) => void): PetSave | null {
    const data = SaveManager.load();
    if (!data) return null;
    mutate(data);
    SaveManager.save(data);
    return data;
  }

  /** 清空宠物（离家出走 / 重新养育）；静音偏好为独立键不受影响 */
  static clearPet(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // 忽略
    }
  }
}

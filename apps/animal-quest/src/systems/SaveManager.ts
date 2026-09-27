import { isCharacterId, type SaveData } from "../types";
import { LEVEL_SCENE_KEYS } from "../scenes/levelKeys";

const KEY = "adl_save_v1";
/** 评分档白名单（与 ResultScene.RANK 对应） */
const GRADES = ["S", "A", "B", "C"];
/** 升级轨最高等级 = 价格档数 */
const MAX_UPGRADE_LEVEL = 3;

/** 工厂而非常量：upgrades 嵌套对象必须每次全新，避免多份存档共享引用互串 */
function defaultSave(): SaveData {
  return {
    version: 1,
    lastCharacter: null,
    cleared: false,
    bestGrade: null,
    coins: 0,
    level: 1,
    checkpointX: null,
    upgrades: { hp: 0, atk: 0, agi: 0 },
  };
}

/** 整数钳制：非有限数回退默认值，越界收敛到边界（防手改/旧档脏数据流入运行时） */
function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

/** 有限数或 null（检查点坐标），其他一律 null */
function finiteOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export class SaveManager {
  /** 读取并做 schema 校验：所有字段钳制到合法域，缺省/非法回默认 */
  static load(): SaveData {
    const data = defaultSave();
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return data;
      const p = JSON.parse(raw) as Partial<SaveData>;
      data.lastCharacter = isCharacterId(p.lastCharacter) ? p.lastCharacter : null;
      data.cleared = p.cleared === true;
      data.bestGrade =
        typeof p.bestGrade === "string" && GRADES.includes(p.bestGrade) ? p.bestGrade : null;
      data.coins = clampInt(p.coins, 0, 1e9, 0);
      data.level = clampInt(p.level, 1, LEVEL_SCENE_KEYS.length, 1);
      data.checkpointX = finiteOrNull(p.checkpointX);
      data.upgrades = {
        hp: clampInt(p.upgrades?.hp, 0, MAX_UPGRADE_LEVEL, 0),
        atk: clampInt(p.upgrades?.atk, 0, MAX_UPGRADE_LEVEL, 0),
        agi: clampInt(p.upgrades?.agi, 0, MAX_UPGRADE_LEVEL, 0),
      };
      return data;
    } catch {
      return defaultSave();
    }
  }

  static save(data: SaveData): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // 隐私模式等存储不可用场景：静默降级为不存档
    }
  }

  static update(mutate: (data: SaveData) => void): SaveData {
    const data = SaveManager.load();
    mutate(data);
    SaveManager.save(data);
    return data;
  }

  /** 清空存档：进度（关卡/检查点/评分/齿轮币/角色/升级）全部恢复默认，音频设置（独立键）不受影响 */
  static clear(): void {
    SaveManager.save(defaultSave());
  }
}

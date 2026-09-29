/** 全局常量：种族表 / 属性模型 / 进化阈值 / 布局与存档键。 */

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 720;

/** 主色板（卡通高饱和） */
export const C = {
  hudPanel: 0x2f3640,
  dockPanel: 0x3d4450,
  btnFace: 0xfdebd3,
  btnBorder: 0x8a5a3b,
  btnText: "#5b3a21",
  textMain: "#ffffff",
  textDim: "#c8d6e5",
  textTip: "#ffe9a8",
  barBack: 0x1f2630,
  good: 0x2ed573,
  mid: 0xf9ca24,
  bad: 0xff6b6b,
  sleepOverlay: 0x0a1030,
} as const;

// —— 布局 ——
export const HUD_H = 92;
export const ROOM_Y = HUD_H;
export const ROOM_H = 476;
/** 宠物脚底基准线（房间地板上） */
export const FLOOR_Y = ROOM_Y + 438;
export const DOCK_Y = ROOM_Y + ROOM_H;
export const DOCK_H = GAME_HEIGHT - DOCK_Y;

export const PET_SCALE = 3;
export const PET_TEX = 48; // 宠物纹理画布边长（1px = 1px，显示时 ×PET_SCALE）

export const BTN_W = 104;
export const BTN_H = 48;
export const BTN_CX = [68, 182, 298, 412] as const;
export const BTN_CY = DOCK_Y + 54;

// —— 物种标签与种族 ——
export const TAG = { Cat: "cat", Dog: "dog", Rabbit: "rabbit", Chick: "chick" } as const;
export type Tag = (typeof TAG)[keyof typeof TAG];

export const TAG_LABEL: Record<Tag, string> = {
  cat: "猫咪",
  dog: "狗狗",
  rabbit: "兔兔",
  chick: "鸡仔",
};

export const TAG_COLOR: Record<Tag, number> = {
  cat: 0xf0932b,
  dog: 0xc0563a,
  rabbit: 0xff9fb0,
  chick: 0xffd32a,
};

export interface Palette {
  main: number;
  dark: number;
  light: number;
  belly: number;
  accent: number;
}

export interface SpeciesDef {
  id: string;
  tag: Tag;
  /** 配色变体（每种 2 套，孵化候选池 = 4 种 × 2 变体） */
  palettes: [Palette, Palette];
  /** 五阶段名：阶段 1-4 + 最终形态（按照顾分分支） */
  names: { stages: [string, string, string, string]; finalGood: string; finalBad: string };
}

export const SPECIES: SpeciesDef[] = [
  {
    id: "cat",
    tag: "cat",
    palettes: [
      { main: 0xf0932b, dark: 0xc9701a, light: 0xffc46b, belly: 0xfff1d6, accent: 0xff6b81 },
      { main: 0xaab4c4, dark: 0x7d8896, light: 0xd7dfe9, belly: 0xf4f7fb, accent: 0x54a0ff },
    ],
    names: {
      stages: ["小花猫", "云纹猫", "虎斑猫", "小白虎"],
      finalGood: "邪谋白虎",
      finalBad: "打盹猫",
    },
  },
  {
    id: "dog",
    tag: "dog",
    palettes: [
      { main: 0xdd9440, dark: 0xb06d24, light: 0xf2c084, belly: 0xfff3e0, accent: 0xe0413e },
      { main: 0xefe0c8, dark: 0xc2a97f, light: 0xfdf6ea, belly: 0xfffbf2, accent: 0x54a0ff },
    ],
    names: {
      stages: ["轻微狼王", "草原小狼", "月牙狼", "银月狼"],
      finalGood: "君威狼王",
      finalBad: "野狗",
    },
  },
  {
    id: "rabbit",
    tag: "rabbit",
    palettes: [
      { main: 0xf3ede4, dark: 0xcfc3b4, light: 0xffffff, belly: 0xffffff, accent: 0xff9fb0 },
      { main: 0xb8b0a7, dark: 0x8f8880, light: 0xded7cf, belly: 0xf2efe9, accent: 0xa29bfe },
    ],
    names: {
      stages: ["小白兔", "长耳兔", "望月兔", "捣药玉兔"],
      finalGood: "神龙",
      finalBad: "困困兔",
    },
  },
  {
    id: "chick",
    tag: "chick",
    palettes: [
      { main: 0xffd32a, dark: 0xe1a800, light: 0xffe98a, belly: 0xfff6d8, accent: 0xff7946 },
      { main: 0xffe9b8, dark: 0xe3c47e, light: 0xfffaea, belly: 0xfffbf0, accent: 0xf2a15a },
    ],
    names: {
      stages: ["毛茸茸", "小黄鸡", "锦鸡", "火雏"],
      finalGood: "凤凰",
      finalBad: "懒趴鸡",
    },
  },
];

export const SPECIES_BY_ID: Record<string, SpeciesDef> = Object.fromEntries(
  SPECIES.map((s) => [s.id, s]),
);

// —— 成长阶段（5 阶段依次进化） ——
export type Branch = "good" | "bad";
export const BRANCHES: Branch[] = ["good", "bad"];

export const MAX_STAGE = 5;
/** 进入第 2/3/4/5 阶段所需的年龄阈值（游戏日） */
export const AGE_STAGE_DAYS = [1, 2, 4, 6] as const;

export function stageOfAge(ageDays: number): number {
  let stage = 1;
  for (const threshold of AGE_STAGE_DAYS) {
    if (ageDays >= threshold) stage++;
  }
  return stage;
}

/** 纹理形态：阶段 1-4 线性，第 5 阶段按分支分立（神兽形态 / 疏忽形态） */
export type PetForm = "s1" | "s2" | "s3" | "s4" | "s5good" | "s5bad";

export function formOf(stage: number, branch: Branch): PetForm {
  if (stage < MAX_STAGE) return `s${stage}` as PetForm;
  return branch === "good" ? "s5good" : "s5bad";
}

/** 阶段名：第 5 阶段按分支取名 */
export function stageName(species: SpeciesDef, stage: number, branch: Branch): string {
  if (stage < MAX_STAGE) return species.names.stages[stage - 1];
  return branch === "good" ? species.names.finalGood : species.names.finalBad;
}

/** 宠物纹理键：pet-<species>-<form>-<variant>-<frame> */
export function petTexKey(
  speciesId: string,
  form: PetForm,
  variant: number,
  frame: number,
): string {
  return `pet-${speciesId}-${form}-${variant}-${frame}`;
}

// —— 性格 ——
export const PERSONALITY = {
  Lively: "lively",
  Calm: "calm",
  Glutton: "glutton",
  Clingy: "clingy",
} as const;
export type Personality = (typeof PERSONALITY)[keyof typeof PERSONALITY];

export const PERSONALITY_LABEL: Record<Personality, string> = {
  lively: "活泼",
  calm: "安静",
  glutton: "贪吃",
  clingy: "黏人",
};

/** 性格修正：衰减/收益倍率（1 = 无修正） */
export const PERSONALITY_MOD: Record<
  Personality,
  {
    happyDecay: number;
    hungerDecay: number;
    energyDecay: number;
    playGain: number;
    bondGain: number;
  }
> = {
  lively: { happyDecay: 1.15, hungerDecay: 1, energyDecay: 1.1, playGain: 1.25, bondGain: 1 },
  calm: { happyDecay: 0.95, hungerDecay: 1, energyDecay: 0.8, playGain: 1, bondGain: 1 },
  glutton: { happyDecay: 1, hungerDecay: 1.25, energyDecay: 1, playGain: 1, bondGain: 1 },
  clingy: { happyDecay: 0.9, hungerDecay: 1, energyDecay: 1, playGain: 1, bondGain: 1.5 },
};

/** 性格对漫游动作的偏好倍率（乘在心情权重上） */
export const PERSONALITY_MOVE: Record<
  Personality,
  Partial<Record<"idle" | "walk" | "hop" | "roll" | "sit", number>>
> = {
  lively: { hop: 1.8, roll: 1.6, walk: 1.2, idle: 0.7 },
  calm: { sit: 1.8, idle: 1.5, hop: 0.5, roll: 0.5 },
  glutton: { walk: 1.6, idle: 1.2, hop: 0.8 },
  clingy: { idle: 1.6, sit: 1.4, walk: 0.7 },
};

// —— 亲密度：摸头/喂食/玩耍胜利/清洁积累，决定羁绊等级与最终形态光环 ——
export const BOND_MAX = 999;
/** 羁绊等级 1-5 的亲密度下限 */
export const BOND_LV_MIN = [0, 25, 60, 120, 200] as const;
export const BOND_GAIN = { pat: 1, feed: 1, playWin: 2, clean: 1 } as const;
/** 摸头加亲密度的冷却（秒），防止连点刷满 */
export const BOND_PAT_COOLDOWN_SEC = 8;

export function bondLevelOf(bond: number): number {
  let lv = 1;
  for (let i = 1; i < BOND_LV_MIN.length; i++) {
    if (bond >= BOND_LV_MIN[i]) lv = i + 1;
  }
  return lv;
}

export function randomOf<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 孵化候选：8 个（种族 × 变体），抽 4 个不重复 */
export interface EggCandidate {
  speciesId: string;
  variant: 0 | 1;
  personality: Personality;
}

export function allEggs(): EggCandidate[] {
  const eggs: EggCandidate[] = [];
  for (const s of SPECIES) {
    for (const variant of [0, 1] as const) {
      eggs.push({
        speciesId: s.id,
        variant,
        personality: randomOf(Object.values(PERSONALITY)),
      });
    }
  }
  return eggs;
}

export function pickEggCandidates(count: number): EggCandidate[] {
  const pool = allEggs();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

// —— 时间与成长 ——
/** 1 游戏日 = 4 现实分钟 */
export const DAY_MS = 240_000;
/** 照顾分 ≥ 此值进化神兽形态 */
export const CARE_GOOD_THRESHOLD = 60;

export function branchOfCare(care: number): Branch {
  return care >= CARE_GOOD_THRESHOLD ? "good" : "bad";
}

// —— 属性衰减 / 互动收益（每秒）——
const SEC_PER_DAY = DAY_MS / 1000;
export const DECAY = {
  hungerPerSec: (100 / SEC_PER_DAY) * 0.85,
  happyPerSec: (100 / SEC_PER_DAY) * 0.7,
  energyPerSecAwake: (100 / SEC_PER_DAY) * 0.55,
  /** 负值 = 睡觉回复，约 1/3 游戏日睡满 */
  energyPerSecSleep: -(100 / SEC_PER_DAY) * 3.0,
  cleanPerPoopPerSec: 1.6,
  cleanBasePerSec: 0.05,
  sickHappyExtra: 1.2,
} as const;

export const GAIN = {
  mealHunger: 35,
  mealHappy: 4,
  mealWeight: 2,
  snackHunger: 12,
  snackHappy: 14,
  snackWeight: 4,
  deluxeHunger: 60,
  deluxeHappy: 10,
  deluxeWeight: 1,
  cakeHunger: 15,
  cakeHappy: 25,
  cakeWeight: 3,
  playWinHappy: 30,
  playLoseHappy: 10,
  playEnergyCost: 15,
  playWeightLoss: 3,
  sleepWakeSadThreshold: 50,
  sleepWakeSadHappy: -5,
} as const;

// —— 商店 ——
export type PremiumFoodKind = "deluxe" | "cake";
export interface ShopFoodDef {
  kind: PremiumFoodKind;
  label: string;
  desc: string;
  price: number;
  icon: string;
}
export const SHOP_FOODS: ShopFoodDef[] = [
  { kind: "deluxe", label: "豪华便当", desc: "饱腹大餐", price: 8, icon: "rice" },
  { kind: "cake", label: "小蛋糕", desc: "心情加倍", price: 5, icon: "pudding" },
];
export interface ShopDecorDef {
  id: string;
  label: string;
  price: number;
}
export const SHOP_DECOR: ShopDecorDef[] = [
  { id: "art", label: "装饰画", price: 15 },
  { id: "bed", label: "小窝", price: 20 },
];
/** 小游戏金币:胜利 3+阶段,参与 1 */
export const COIN_WIN_BASE = 3;
export const COIN_PLAY_LOSE = 1;

export const WEIGHT_START = 20;
export const WEIGHT_MAX = 99;

// —— 便便 / 生病 / 离家出走 ——
export const POOP_MAX = 4;
export const POOP_INTERVAL_MIN_SEC = 80;
export const POOP_INTERVAL_MAX_SEC = 150;
/** 进食后第一次排便的提前量（秒） */
export const POOP_AFTER_MEAL_SEC = 45;
export const POOP_SPOTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 120, y: FLOOR_Y - 4 },
  { x: 336, y: FLOOR_Y - 2 },
  { x: 208, y: FLOOR_Y + 8 },
  { x: 396, y: FLOOR_Y + 6 },
];

export const SICK_CHECK_SEC = 5;
export const SICK_CHANCE_PER_RISK = 0.05;

/** 疏忽值（秒）：饱食与心情同时归零时累计，或生病未治半速累计；达到阈值离家出走 */
export const NEGLECT_LIMIT_SEC = (2 * DAY_MS) / 1000;
export const NEGLECT_WARN_AT = [0.4, 0.7] as const;

// —— 离线 ——
export const OFFLINE_CAP_MS = 8 * 3600_000;
/** 离线衰减速率（相对在线的倍率，需 < 1 温和处理） */
export const OFFLINE_DECAY_RATE = 0.4;
/** 离线多久以上显示“欢迎回来” */
export const OFFLINE_NOTICE_MIN_MS = 3 * 60_000;
/** 离线每小时可能有便便（封顶 POOP_MAX） */
export const OFFLINE_POOP_PER_HOUR = 1.5;

// —— 猜方向小游戏 ——
export const GUESS_ROUNDS = 3;
export const GUESS_WIN_NEEDED = 2;
export const GUESS_REVEAL_MS = 900;

// —— 拍便便小游戏 ——
export const WHACK_POPS = 6;
export const WHACK_HITS_TO_WIN = 3;

// —— 存档键 ——
export const SAVE_KEY = "pixelpet.save.v1";
export const MUTE_KEY = "pixelpet.muted";

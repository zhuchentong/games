/** 台词库：按状态优先级挑选闲聊台词，性格/物种/羁绊决定风味。全部短句以适配气泡宽度。 */

import { randomOf, type Personality, type Tag } from "./config";

export interface ChatterCtx {
  tag: Tag;
  personality: Personality;
  happy: number;
  hunger: number;
  energy: number;
  clean: number;
  sick: boolean;
  /** 羁绊等级 1-5 */
  bondLv: number;
}

/** 不适状态台词：优先级从高到低逐项检查 */
const SICK_LINES = ["咳咳…不舒服…", "没力气玩了…", "呜呜…难受…"];
const HUNGRY_LINES = ["肚子咕咕叫了…", "好饿好饿…", "想吃饭饭~"];
const SLEEPY_LINES = ["眼皮好重…", "困困…", "打了个大哈欠~"];
const DIRTY_LINES = ["身上黏黏的…", "想洗澡澡…", "房间好乱呀…"];
const LONELY_LINES = ["陪我玩嘛…", "好无聊哇…", "你在哪里呀？"];

/** 心情尚可时的闲聊池 */
const HAPPY_LINES = ["今天超开心！", "最喜欢你啦！", "嘿嘿，心情超好~", "要一直在一起哦"];
const NEUTRAL_LINES = ["发一会儿呆~", "房间里真舒服", "你在看我吗？", "哼哼~哼哼~"];

const PERSONALITY_LINES: Record<Personality, string[]> = {
  lively: ["蹦蹦跳跳！", "要跑一圈吗？", "无聊！来玩！", "冲呀——"],
  calm: ["安静待着就好", "晒晒太阳…", "慢悠悠~", "这样就很治愈"],
  glutton: ["想吃布丁了…", "还有吃的吗？", "闻到饭香了！", "吃货的快乐~"],
  clingy: ["摸摸我嘛~", "别走嘛…", "最喜欢贴贴", "你去哪我也去"],
};

/** 羁绊等级 ≥3 才会说的心里话 */
const BOND_LINES = ["和你在一起真好", "羁绊满满的一天！", "你是我最重要的人", "会一直陪着你哦"];

/** 羁绊等级 5 的私房话 */
const BOND_MAX_LINES = ["这辈子都要在一起哦", "我们的羁绊是独一无二的！", "永远做你的小伙伴！"];

/** ♥5 时点地板召唤过来会说的话 */
export const COME_LINES = ["来啦来啦！", "叫我就是这点好~", "哒哒哒——来了！"];

/** 天气台词(切换到对应天气时偶尔说) */
export const WEATHER_LINES = {
  rain: ["窗外下雨了…", "雨声好催眠~", "下雨天和你在家"],
  snow: ["下雪了！", "窗外白茫茫的！", "雪花飘下来啦~"],
} as const;

export type Weather = keyof typeof WEATHER_LINES;

/** 孵化初见 / 每次进屋的问候 */
export const PERSONALITY_INTRO: Record<Personality, string> = {
  lively: "我超爱玩，陪我玩！",
  calm: "嗯…请多关照~",
  glutton: "那个…有吃的吗？",
  clingy: "要常常摸摸我哦",
};
export const ENTRY_LINES = ["今天也要好好照顾我哦", "嘿嘿，你来啦", "在家里等你好久啦"];
export const WELCOME_LINES = ["你回来啦！", "等你好久了~"];

/** 互动反应台词 */
export const PAT_LINES = ["好舒服~", "再摸摸嘛", "嘿嘿~"];
export const PAT_SICK_LINES = ["生病了…快治治我"];
export const FEED_LINES = ["好好吃！", "还要还要~"];
export const CLEAN_LINES = ["亮晶晶~", "清清爽爽！"];
export const WIN_LINES = ["赢啦！你好厉害", "最棒的主人！"];
export const LOSE_LINES = ["输了也没关系", "下次再一起玩"];
export const EVOLVE_LINES = ["变强了！", "新的我，请多指教！"];

/** 物种语气词：偶尔缀在句尾 */
const SPECIES_TICK: Record<Tag, string[]> = {
  cat: ["喵~", "喵？"],
  dog: ["汪！", "汪汪！"],
  rabbit: ["（蹦蹦）", "（抖胡须）"],
  chick: ["叽！", "叽叽"],
};

/** 闲聊挑选：不适状态优先，心情好时混入性格/羁绊台词 */
export function pickChatter(ctx: ChatterCtx): string {
  if (ctx.sick) return maybeTick(ctx, randomOf(SICK_LINES));
  if (ctx.hunger < 25) return maybeTick(ctx, randomOf(HUNGRY_LINES));
  if (ctx.energy < 15) return maybeTick(ctx, randomOf(SLEEPY_LINES));
  if (ctx.clean < 35) return maybeTick(ctx, randomOf(DIRTY_LINES));
  if (ctx.happy < 30) return maybeTick(ctx, randomOf(LONELY_LINES));
  const roll = Math.random();
  if (ctx.bondLv >= 5 && roll < 0.3) return randomOf(BOND_MAX_LINES);
  if (ctx.bondLv >= 3 && roll < 0.5) return randomOf(BOND_LINES);
  if (roll < 0.75) return maybeTick(ctx, randomOf(PERSONALITY_LINES[ctx.personality]));
  if (ctx.happy >= 75) return maybeTick(ctx, randomOf(HAPPY_LINES));
  return maybeTick(ctx, randomOf(NEUTRAL_LINES));
}

/** 35% 概率缀上物种语气词 */
function maybeTick(ctx: ChatterCtx, line: string): string {
  if (Math.random() >= 0.35) return line;
  return `${line}${randomOf(SPECIES_TICK[ctx.tag])}`;
}

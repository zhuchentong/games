import type { CharacterId } from "../types";
import type { BossMK1 } from "../entities/BossMK1";
import type { Enemy } from "../entities/Enemy";
import type { LavaGiant } from "../entities/LavaGiant";
import type { Player } from "../entities/Player";
import type { VineTreant } from "../entities/VineTreant";

export interface BossMoveDef<B extends Enemy = BossMK1> {
  name: string;
  cooldownMs: number;
  /** 执行招式，返回招式占用时长 ms（期间不选择下一个招式） */
  exec: (boss: B, player: Player) => number;
}

export interface BossPhaseDef<B extends Enemy = BossMK1> {
  /** 该阶段覆盖的 hp 比例上限（1 / 0.66 / 0.33） */
  until: number;
  /** 阶段内两个招式之间的基础间隔 */
  globalCooldownMs: number;
  moves: BossMoveDef<B>[];
}

/** Boss 入场对话一行：机体台词（全体共用）或玩家方台词（按选中角色分声线） */
export type BossDialogueLine =
  | { who: "boss"; text: string }
  | { who: "player"; lines: Record<CharacterId, string> };

/** 机体定义：马克系列共用 BossMK1 行为库；熔岩巨人走 LavaGiant 行为库（kind 区分） */
export interface BossDef {
  name: string;
  maxHp: number;
  x: number;
  /** 精灵中心 y（一/三型 500-56=444；巨人 120 高为 500-60=440） */
  y: number;
  texture: string;
  contactDamage: number;
  /** 背部核心弱点伤害倍率 */
  coreMultiplier: number;
  room: { x0: number; x1: number };
  /** 门前警示小字（buildDecor） */
  doorNote: string;
  /** 核心拾取飘字 */
  victoryText: string;
  /** 拾取核心即写入通关存档（最终关 true；前置关 false 只推进关卡存档） */
  clearsGame: boolean;
  /** Boss 种类：mark=马克机甲（默认）；lavaGiant=熔岩巨人；vineTreant=古藤树怪 */
  kind?: "mark" | "lavaGiant" | "vineTreant";
  /** 入场对话：出场演出落地后、开战前播放（E/J/跳 推进，Q/ESC 跳过） */
  dialogue: BossDialogueLine[];
  /** 招式阶段表（mark 系专用；巨人的表在 LAVA_GIANT_PHASES） */
  phases?: BossPhaseDef[];
}

export const BOSS: BossDef = {
  name: "马克一型机器人",
  maxHp: 800,
  x: 5780,
  y: 444,
  texture: "boss",
  contactDamage: 18,
  coreMultiplier: 2,
  room: { x0: 5200, x1: 6120 },
  doorNote: "马克一型机器人 · 戒备",
  victoryText: "第一关通过！",
  clearsGame: false,

  // 入场对话：老哨戒机体按程序办事，机械口吻；玩家方五声线
  dialogue: [
    { who: "boss", text: "警告。检测到未登记生物体——此地为机龙领地，速离。" },
    {
      who: "player",
      lines: {
        tiger: "想赶我走？先接下森林之王这一拳！",
        wolf: "机器也谈领地？正好，我要借道——从你身上踏过去。",
        frog: "呱！铁皮大个子守着破大门，齿轮都生锈啦。",
        bird: "锈脑袋，扇个翅膀都冒烟，也配拦我的路？",
        rabbit: "对、对不起啦……可是路被堵住了，我们只好硬闯了！",
      },
    },
    { who: "boss", text: "指令升级：清除。战斗形态展开——开始锈化处理。" },
    {
      who: "player",
      lines: {
        tiger: "岩石护盾都懒得开，接招吧铁罐头！",
        wolf: "废话真多。核心在哪，三秒内自己交出来。",
        frog: "呱呱——拆机器我最拿手，咔啦咔啦～",
        bird: "呼——风已经准备好了，放马过来吧！",
        rabbit: "兔子急了也是会踹人的哦！",
      },
    },
  ],

  // 三阶段招式表（PLAN 决策 #4：配置驱动，禁行为树）
  // P1 横扫/冲撞/齿轮弹 → P2 追加召唤/激光 → P3 狂暴：间隔缩短 + 震地/扇形弹幕 + 核心常驻暴露
  phases: [
    {
      until: 1,
      globalCooldownMs: 1500,
      moves: [
        { name: "sweep", cooldownMs: 2500, exec: (b) => b.sweep() },
        { name: "dash", cooldownMs: 4200, exec: (b, p) => b.dash(p) },
        { name: "gear", cooldownMs: 3200, exec: (b, p) => b.gearShot(p) },
      ],
    },
    {
      until: 0.66,
      globalCooldownMs: 1300,
      moves: [
        { name: "sweep", cooldownMs: 2500, exec: (b) => b.sweep() },
        { name: "dash", cooldownMs: 4200, exec: (b, p) => b.dash(p) },
        { name: "gear", cooldownMs: 3200, exec: (b, p) => b.gearShot(p) },
        { name: "summon", cooldownMs: 8000, exec: (b) => b.summonDrones() },
        { name: "laser", cooldownMs: 5200, exec: (b, p) => b.laser(p) },
      ],
    },
    {
      until: 0.33,
      globalCooldownMs: 900,
      moves: [
        { name: "sweep", cooldownMs: 2000, exec: (b) => b.sweep() },
        { name: "dash", cooldownMs: 3000, exec: (b, p) => b.dash(p) },
        { name: "gear", cooldownMs: 2200, exec: (b, p) => b.gearShot(p) },
        { name: "laser", cooldownMs: 4200, exec: (b, p) => b.laser(p) },
        { name: "shock", cooldownMs: 3600, exec: (b) => b.shockwave() },
        { name: "fan", cooldownMs: 3200, exec: (b, p) => b.fanSpread(p) },
        { name: "summon", cooldownMs: 9000, exec: (b) => b.summonSwarm() },
      ],
    },
  ] as BossPhaseDef[],
};

/** 第二关 Boss：熔岩巨人「炉心」——盘踞熔火机厂深处的远古岩浆守卫，胸口熔核即是它的心脏 */
export const BOSS2: BossDef = {
  name: "熔岩巨人 · 炉心",
  maxHp: 1000,
  x: 5900,
  y: 440,
  texture: "lava-giant",
  contactDamage: 22,
  coreMultiplier: 2,
  room: { x0: 5400, x1: 6280 },
  doorNote: "熔岩巨人 · 高温警报",
  victoryText: "第二关通过！",
  clearsGame: false,
  kind: "lavaGiant",

  // 入场对话：沉睡亿年的岩浆守卫被脚步吵醒，古老而缓慢的怒意
  dialogue: [
    { who: "boss", text: "……轰、轰。大地在颤。谁允许你们，踏进炉心的熔床？" },
    {
      who: "player",
      lines: {
        tiger: "好大的块头！正好，让我看看石头肚子里装的是什么！",
        wolf: "浑身是裂缝，火从里面漏出来——你撑不了多久了。",
        frog: "呱！好烫好烫……巨型暖炉成精啦！",
        bird: "连熔炉都装不下你，可惜——天空更装不下我！",
        rabbit: "对、对不起啦……但这扇门后面，是我们必须走的路！",
      },
    },
    { who: "boss", text: "亿年的沉睡，被你们的小爪子吵醒。那就——把你们，一起烧成灰。" },
    {
      who: "player",
      lines: {
        tiger: "来吧！拳头对岩石，看谁先碎！",
        wolf: "吵醒了就要付出代价。跪下吧，巨人。",
        frog: "呱呱——水克火，我可是有备而来的哦！",
        bird: "你的火再旺，也烧不到天上的风！",
        rabbit: "兔子急了也是会咬人的……巨人也一样哦！",
      },
    },
  ],
};

/** 熔岩巨人三阶段招式表（与机体系同样配置驱动；exec 绑定 LavaGiant） */
export const LAVA_GIANT_PHASES: BossPhaseDef<LavaGiant>[] = [
  {
    until: 1,
    globalCooldownMs: 1400,
    moves: [
      { name: "slam", cooldownMs: 2400, exec: (g, p) => g.slam(p) },
      { name: "lob", cooldownMs: 3000, exec: (g, p) => g.lob(p) },
      { name: "stomp", cooldownMs: 3600, exec: (g) => g.stomp() },
    ],
  },
  {
    until: 0.66,
    globalCooldownMs: 1150,
    moves: [
      { name: "slam", cooldownMs: 2200, exec: (g, p) => g.slam(p) },
      { name: "lob", cooldownMs: 2600, exec: (g, p) => g.lob(p) },
      { name: "stomp", cooldownMs: 3200, exec: (g) => g.stomp() },
      { name: "eruption", cooldownMs: 4600, exec: (g, p) => g.eruption(p) },
      { name: "breath", cooldownMs: 4200, exec: (g, p) => g.breath(p) },
    ],
  },
  {
    until: 0.33,
    globalCooldownMs: 950,
    moves: [
      { name: "slam", cooldownMs: 1900, exec: (g, p) => g.slam(p) },
      { name: "lob", cooldownMs: 2300, exec: (g, p) => g.lob(p) },
      { name: "stomp", cooldownMs: 2800, exec: (g) => g.stomp() },
      { name: "eruption", cooldownMs: 3800, exec: (g, p) => g.eruption(p) },
      { name: "breath", cooldownMs: 3400, exec: (g, p) => g.breath(p) },
      { name: "rain", cooldownMs: 5600, exec: (g, p) => g.rain(p) },
    ],
  },
];

/** 第三关 Boss：古藤树怪「棘心」——黑暗森林的意志本体，胸口树心即是它的心脏，全阶段节奏最快 */
export const BOSS3: BossDef = {
  name: "古藤树怪 · 棘心",
  maxHp: 1250,
  x: 5900,
  y: 440,
  texture: "vine-treant",
  contactDamage: 24,
  coreMultiplier: 2,
  room: { x0: 5400, x1: 6280 },
  doorNote: "古藤树怪 · 林地禁域",
  victoryText: "黑森林净化！",
  clearsGame: true,
  kind: "vineTreant",

  // 入场对话：最终守卫=黑暗森林的意志本体，先行试诱同化、被拒后荆棘加冠，最终战份量最重（六行）
  dialogue: [
    { who: "boss", text: "……咳、咔。小东西，你们踩响的每一根枯枝，都是我在数你们的脚步。" },
    { who: "boss", text: "机器替我看守过这片林子，后来朽了、倒了、成了我的肥料。你们也会一样。" },
    {
      who: "player",
      lines: {
        tiger: "吹吧！森林之王的拳头，专治成精的老树！",
        wolf: "把森林勒得只剩黑暗的，也配叫守林人？",
        frog: "呱！整片林子又暗又闷，都是你干的吧！",
        bird: "叶子遮住了天空——那我就劈开一条缝出来！",
        rabbit: "大家都好怕你哦……但是，对不起啦，今天必须过去！",
      },
    },
    { who: "boss", text: "过去？森林需要一颗新的心脏，而你们，正好送上门来。" },
    {
      who: "player",
      lines: {
        tiger: "想吞我？先问问这块岩石护盾答不答应！",
        wolf: "心？你的心长在胸口外头——倒省得我找了。",
        frog: "呱呱——树心呀……做成盆栽一定很可爱！",
        bird: "借你的心一用，让森林重新透进光！",
        rabbit: "森林的心，应该跳给森林听，而不是跳给黑暗！",
      },
    },
    { who: "boss", text: "冥顽不灵……那就根须缠身，荆棘加冠——黑森林，永不需要黎明！" },
  ],
};

/** 古藤树怪三阶段招式表（与机体系/巨人同样配置驱动；exec 绑定 VineTreant） */
export const VINE_TREANT_PHASES: BossPhaseDef<VineTreant>[] = [
  {
    until: 1,
    globalCooldownMs: 1400,
    moves: [
      { name: "whip", cooldownMs: 2400, exec: (t, p) => t.whip(p) },
      { name: "mortar", cooldownMs: 3000, exec: (t, p) => t.mortar(p) },
      { name: "roots", cooldownMs: 5200, exec: (t, p) => t.roots(p) },
    ],
  },
  {
    until: 0.66,
    globalCooldownMs: 1150,
    moves: [
      { name: "whip", cooldownMs: 2200, exec: (t, p) => t.whip(p) },
      { name: "mortar", cooldownMs: 2600, exec: (t, p) => t.mortar(p) },
      { name: "roots", cooldownMs: 4400, exec: (t, p) => t.roots(p) },
      { name: "breath", cooldownMs: 4200, exec: (t, p) => t.breath(p) },
      { name: "entangle", cooldownMs: 4800, exec: (t, p) => t.entangle(p) },
    ],
  },
  {
    until: 0.33,
    globalCooldownMs: 950,
    moves: [
      { name: "whip", cooldownMs: 1900, exec: (t, p) => t.whip(p) },
      { name: "mortar", cooldownMs: 2300, exec: (t, p) => t.mortar(p) },
      { name: "roots", cooldownMs: 3800, exec: (t, p) => t.roots(p) },
      { name: "breath", cooldownMs: 3400, exec: (t, p) => t.breath(p) },
      { name: "entangle", cooldownMs: 4000, exec: (t, p) => t.entangle(p) },
      { name: "rain", cooldownMs: 5600, exec: (t, p) => t.rain(p) },
    ],
  },
];

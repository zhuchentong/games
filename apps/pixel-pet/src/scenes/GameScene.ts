/** 主养成场景：房间与属性、四项互动、睡觉、便便、生病、小游戏结算、分支进化与离家出走。
 *  小游戏 / 房间物件 / 台词气泡分别拆在 MiniGames / RoomObjects / SpeechBubble。 */

import Phaser from "phaser";
import {
  BOND_GAIN,
  BOND_MAX,
  BOND_PAT_COOLDOWN_SEC,
  BTN_CX,
  BTN_CY,
  C,
  COIN_PLAY_LOSE,
  COIN_WIN_BASE,
  DAY_MS,
  DECAY,
  DOCK_H,
  DOCK_Y,
  FLOOR_Y,
  GAIN,
  GAME_HEIGHT,
  GAME_WIDTH,
  HUD_H,
  MAX_STAGE,
  NEGLECT_LIMIT_SEC,
  NEGLECT_WARN_AT,
  OFFLINE_CAP_MS,
  OFFLINE_DECAY_RATE,
  OFFLINE_NOTICE_MIN_MS,
  OFFLINE_POOP_PER_HOUR,
  PERSONALITY_LABEL,
  PERSONALITY_MOD,
  PERSONALITY_MOVE,
  POOP_AFTER_MEAL_SEC,
  POOP_INTERVAL_MAX_SEC,
  POOP_INTERVAL_MIN_SEC,
  POOP_MAX,
  POOP_SPOTS,
  ROOM_Y,
  SICK_CHECK_SEC,
  SICK_CHANCE_PER_RISK,
  SHOP_DECOR,
  SHOP_FOODS,
  SPECIES_BY_ID,
  WEIGHT_MAX,
  bondLevelOf,
  branchOfCare,
  formOf,
  petTexKey,
  randomOf,
  stageName,
  stageOfAge,
  type Personality,
  type ShopDecorDef,
  type ShopFoodDef,
  type SpeciesDef,
} from "../config";
import {
  CLEAN_LINES,
  COME_LINES,
  ENTRY_LINES,
  EVOLVE_LINES,
  FEED_LINES,
  LOSE_LINES,
  PAT_LINES,
  PAT_SICK_LINES,
  PERSONALITY_INTRO,
  WELCOME_LINES,
  WEATHER_LINES,
  WIN_LINES,
  pickChatter,
} from "../dialogue";
import {
  isMuted,
  sfxClick,
  sfxCrack,
  sfxEvolve,
  sfxGameLose,
  sfxGameWin,
  sfxGuessRight,
  sfxHatchPop,
  sfxMedicine,
  sfxMunch,
  sfxPat,
  sfxPlop,
  sfxRainPatter,
  sfxRefuse,
  sfxRunaway,
  sfxSick,
  sfxSleepStart,
  sfxSnore,
  sfxSplash,
  sfxWake,
  sfxYum,
  startBgm,
  stopBgm,
  toggleMuted,
  unlockAudio,
} from "../audio";
import { TEX } from "../textures";
import { grantAchievements, type AchievementDef } from "../achievements";
import { SaveManager, type PetSave, type PoopSpot } from "../systems/SaveManager";
import { ProfileStore, dexKeyOf } from "../systems/ProfileStore";
import { clamp, formatAge, randInt, randRange } from "../util";
import { MiniGames } from "./MiniGames";
import { RoomObjects, type WeatherKind } from "./RoomObjects";
import { SpeechBubble } from "./SpeechBubble";
import { gameText, makeButton, setBtnEnabled } from "./widgets";

type RoomWeather = WeatherKind;

interface PoopView {
  spot: PoopSpot;
  sprite: Phaser.GameObjects.Image;
}

type BarKey = "hunger" | "happy" | "energy" | "clean";

type PetMoveState = "idle" | "walk" | "hop" | "roll" | "sit" | "chase";

/** 宠物在地面上可站立的横向范围 */
const PET_X_MIN = 70;
const PET_X_MAX = 410;

export class GameScene extends Phaser.Scene {
  private pet: PetSave | null = null;
  private species: SpeciesDef | null = null;
  private mod!: (typeof PERSONALITY_MOD)[Personality];

  private petSprite: Phaser.GameObjects.Image | null = null;
  private frame = 0;
  private frameTimer = 0;

  // —— 拆分模块 ——
  private bubble!: SpeechBubble;
  private miniGames!: MiniGames;
  private room!: RoomObjects;

  // —— 房间漫游行为 ——
  private moveState: PetMoveState = "idle";
  private moveTimerSec = 2;
  private stateTimeSec = 0;
  private moveTargetX: number | null = null;
  private walkDir = 1;
  private readonly walkSpeedPxSec = 46;
  private critter: Phaser.GameObjects.Image | null = null;
  private critterTimerSec = 14;
  private chaseTarget: "critter" | "ball" | null = null;

  private poopViews: PoopView[] = [];

  // —— 天气与随机房间事件 ——
  /** 当前窗外天气 */
  private weather: RoomWeather = "clear";
  /** 距下次天气翻牌的秒数 */
  private weatherSec = 70;
  private weatherSfxSec = 2;
  private giftImg: Phaser.GameObjects.Image | null = null;
  private giftTimerSec = 120;
  private giftLifeSec = 0;

  // —— 演出状态 ——
  /** 胜利后的连跳余量 */
  private hopChain = 0;
  /** 吃饭咀嚼剩余秒数(坐姿时播放) */
  private chewSec = 0;
  /** ♥5 点地板召唤中 */
  private comeHere = false;

  private barFills: Record<BarKey, Phaser.GameObjects.Rectangle> = {} as Record<
    BarKey,
    Phaser.GameObjects.Rectangle
  >;
  private infoLeft: Phaser.GameObjects.Text | null = null;
  private infoRight: Phaser.GameObjects.Text | null = null;
  private careHearts: Phaser.GameObjects.Image[] = [];
  private muteText: Phaser.GameObjects.Text | null = null;

  private actionBtns: Phaser.GameObjects.Container[] = [];
  private treatBtn: Phaser.GameObjects.Container | null = null;
  private treatPulse: Phaser.Tweens.Tween | null = null;
  private tipText: Phaser.GameObjects.Text | null = null;
  private tipTween: Phaser.Tweens.Tween | null = null;

  private sleepOverlay: Phaser.GameObjects.Rectangle | null = null;
  private zzz1: Phaser.GameObjects.Image | null = null;
  private zzz2: Phaser.GameObjects.Image | null = null;
  private sweatIcon: Phaser.GameObjects.Image | null = null;

  // —— 台词节奏与羁绊 ——
  /** 距下次闲聊的秒数 */
  private chatterSec = 7;
  /** 摸头加亲密度的冷却 */
  private bondPatSec = 0;
  private aura: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private auraSec = 0;

  private feedPanel: Phaser.GameObjects.Container | null = null;
  private feedOpen = false;

  // —— 金币与商店 ——
  private coins = 0;
  private coinText: Phaser.GameObjects.Text | null = null;
  private shopPanel: Phaser.GameObjects.Container | null = null;
  private shopOpen = false;

  private locked = false;
  private gone = false;
  private poopTimerSec = POOP_INTERVAL_MAX_SEC / 2;
  private sickCheckSec = SICK_CHECK_SEC;
  private saveSec = 5;
  private achSec = 5;
  private snoreSec = 4;
  private petCooldownSec = 0;
  private neglectWarned = [false, false];
  private offlineLines: string[] = [];
  private onUnload: (() => void) | null = null;

  constructor() {
    super("game");
  }

  create(): void {
    this.poopViews = [];
    this.careHearts = [];
    this.actionBtns = [];
    this.barFills = {} as Record<BarKey, Phaser.GameObjects.Rectangle>;
    this.locked = false;
    this.gone = false;
    this.feedOpen = false;
    this.frame = 0;
    this.frameTimer = 0;
    this.moveState = "idle";
    this.moveTimerSec = 2;
    this.stateTimeSec = 0;
    this.moveTargetX = null;
    this.critter = null;
    this.critterTimerSec = 14;
    this.chaseTarget = null;
    this.weather = "clear";
    this.weatherSec = 70;
    this.weatherSfxSec = 2;
    this.giftImg = null;
    this.giftTimerSec = 120;
    this.giftLifeSec = 0;
    this.hopChain = 0;
    this.chewSec = 0;
    this.comeHere = false;
    this.poopTimerSec = randRange(POOP_INTERVAL_MIN_SEC, POOP_INTERVAL_MAX_SEC) / 2;
    this.sickCheckSec = SICK_CHECK_SEC;
    this.saveSec = 5;
    this.achSec = 5;
    this.snoreSec = 4;
    this.petCooldownSec = 0;
    this.chatterSec = 7;
    this.bondPatSec = 0;
    this.aura = null;
    this.auraSec = 0;
    this.neglectWarned = [false, false];
    this.offlineLines = [];
    this.tipTween = null;
    this.treatPulse = null;

    const pet = SaveManager.load();
    if (!pet) {
      this.scene.start("title");
      return;
    }
    this.pet = pet;
    this.species = SPECIES_BY_ID[pet.speciesId];
    this.mod = PERSONALITY_MOD[pet.personality];

    // 档案:老玩家补记孵化数;当前形态入图鉴;金币与装饰
    const profile = ProfileStore.update((p) => {
      if (p.stats.hatched === 0) p.stats.hatched = 1;
    });
    ProfileStore.markSeenForm(dexKeyOf(pet));
    this.coins = profile.coins;

    this.applyOffline();

    // 离线期间跨过进化阈值：安静地结算（仪式只在在线时播放）
    const grewOffline = this.applyStageIfDue();
    if (grewOffline) this.offlineLines.push("它偷偷长大了！");

    this.buildRoom();
    this.buildPet();
    this.buildHud();
    this.buildDock();
    this.buildFeedPanel();
    this.miniGames = new MiniGames(this, {
      petSprite: () => this.petSprite,
      stage: () => this.pet?.stage ?? 1,
      burst: (tex, x, y, n) => this.burst(tex, x, y, n),
      finish: (win, winLine, loseLine) => this.finishPlay(win, winLine, loseLine),
      refresh: () => this.refreshActionStates(),
    });
    this.buildSleepOverlay();
    this.bubble = new SpeechBubble(this);
    this.buildAura();

    for (const spot of pet.poops) this.addPoopView(spot);
    if (pet.asleep) this.applySleepVisuals(true);
    this.refreshActionStates();

    this.onUnload = () => this.persist();
    window.addEventListener("beforeunload", this.onUnload);
    this.events.once("shutdown", () => {
      this.persist();
      stopBgm();
      if (this.onUnload) window.removeEventListener("beforeunload", this.onUnload);
    });
    startBgm();

    // 入场问候：刚孵化报性格，否则日常打招呼（有离线弹窗则等关掉再说）
    this.time.delayedCall(900, () => {
      if (this.offlineLines.length === 0) this.greetOnEntry();
    });
    if (this.offlineLines.length > 0) this.showWelcome(this.offlineLines);
    this.checkAchievements();
  }

  /** 检查并提示新解锁的成就(金币已在 grantAchievements 入账) */
  private checkAchievements(): void {
    const unlocked: AchievementDef[] = grantAchievements(this.gone ? null : this.pet);
    if (unlocked.length === 0) return;
    const first = unlocked[0];
    const reward = unlocked.reduce((sum, a) => sum + a.reward, 0);
    // 底部提示条宽度有限(两侧是治疗/商店按钮),文案必须短
    this.showTip(`成就「${first.name}」+${reward}币`, "#ffd32a");
    sfxGameWin();
  }

  private greetOnEntry(): void {
    if (!this.pet || this.pet.asleep || this.gone) return;
    const line =
      this.ageDays() < 0.06 ? PERSONALITY_INTRO[this.pet.personality] : randomOf(ENTRY_LINES);
    this.say(line);
  }

  // ———— 台词与羁绊光环 ————

  private buildAura(): void {
    this.aura = this.add
      .particles(0, 0, TEX.sparkle, {
        speed: { min: 8, max: 36 },
        lifespan: 900,
        scale: { start: 1.1, end: 0.1 },
        alpha: { start: 0.85, end: 0 },
        emitting: false,
      })
      .setDepth(6);
  }

  /** 羁绊光环：神兽最终形态 + 羁绊 ≥4 时周身飘金光 */
  private updateAura(dt: number): void {
    const pet = this.pet;
    if (!this.aura || !this.petSprite || !pet) return;
    const active =
      !pet.asleep &&
      !this.gone &&
      pet.stage === MAX_STAGE &&
      pet.branch === "good" &&
      bondLevelOf(pet.bond) >= 4;
    if (!active) return;
    this.auraSec -= dt;
    if (this.auraSec <= 0) {
      this.auraSec = 1.1;
      this.aura.explode(
        1,
        this.petSprite.x + randRange(-26, 26),
        this.petSprite.y - randRange(30, 120),
      );
    }
  }

  private say(line: string): void {
    if (!this.petSprite) return;
    this.bubble.say(line, this.petSprite.x);
  }

  private hideBubble(): void {
    this.bubble.hide();
  }

  private canChatter(): boolean {
    const pet = this.pet;
    return (
      pet !== null &&
      !pet.asleep &&
      !this.gone &&
      !this.locked &&
      !this.miniGames.isActive() &&
      !this.feedOpen &&
      !this.shopOpen
    );
  }

  /** 气泡跟随宠物 + 按状态优先级定期闲聊 */
  private updateSpeech(dt: number): void {
    const idle = this.bubble.update(dt, this.petSprite?.x ?? 240);
    if (!idle || !this.canChatter() || !this.pet || !this.species) return;
    this.chatterSec -= dt;
    if (this.chatterSec > 0) return;
    this.chatterSec = randRange(10, 18);
    const pet = this.pet;
    this.say(
      pickChatter({
        tag: this.species.tag,
        personality: pet.personality,
        happy: pet.happy,
        hunger: pet.hunger,
        energy: pet.energy,
        clean: pet.clean,
        sick: pet.sick,
        bondLv: bondLevelOf(pet.bond),
      }),
    );
  }

  // ———— 构建 ————

  private buildRoom(): void {
    this.room = new RoomObjects(this, {
      canInteract: () => this.canAct(),
      tip: (msg) => this.showTip(msg),
      burst: (tex, x, y, n) => this.burst(tex, x, y, n),
      onFloorTap: (worldX) => this.onFloorTap(worldX),
      onBallLanded: () => {
        // 球落地：醒着且没生病就去追
        this.chaseTarget = "ball";
        if (this.pet && !this.pet.asleep && !this.gone && !this.locked && !this.pet.sick) {
          this.moveState = "chase";
          this.stateTimeSec = 0;
          this.moveTimerSec = 12;
        }
      },
      onBallReturned: () => {
        if (this.pet) this.pet.happy = clamp(this.pet.happy + 3, 0, 100);
        sfxHatchPop();
        this.burst(TEX.heart, this.petSprite?.x ?? 240, FLOOR_Y - 130, 4);
        this.toIdle(randRange(1.5, 3));
      },
      onPlantBloomed: () => {
        const pet = this.pet;
        if (pet && !pet.asleep) pet.happy = clamp(pet.happy + 2, 0, 100);
      },
    });
    this.room.placeDecor(ProfileStore.load().ownedDecor);
  }

  private buildPet(): void {
    this.petSprite = this.add
      .image(GAME_WIDTH / 2, FLOOR_Y, this.petTex())
      .setOrigin(0.5, 1)
      .setScale(3)
      .setDepth(5)
      .setInteractive({ useHandCursor: true });
    this.petSprite.on("pointerdown", () => this.petPet());
    this.refreshPetTint();
  }

  private buildHud(): void {
    this.add.rectangle(GAME_WIDTH / 2, HUD_H / 2, GAME_WIDTH, HUD_H, C.hudPanel).setDepth(90);
    this.makeBar(TEX.icHunger, 30, 24, "hunger");
    this.makeBar(TEX.heart, 262, 24, "happy");
    this.makeBar(TEX.icEnergy, 30, 56, "energy");
    this.makeBar(TEX.icClean, 262, 56, "clean");

    this.infoLeft = gameText(this, 14, 80, "", 15, "#fdf3e0", {
      originX: 0,
      originY: 0.5,
      depth: 100,
    });
    this.infoRight = gameText(this, 466, 80, "", 15, "#9dd6ff", {
      originX: 1,
      originY: 0.5,
      depth: 100,
    });
    for (let i = 0; i < 3; i++) {
      this.careHearts.push(
        this.add
          .image(238 + i * 15, 80, TEX.heartS)
          .setDepth(100)
          .setScale(1.3),
      );
    }

    this.muteText = gameText(this, 468, 8, isMuted() ? "♪ 已静音" : "♪ 音乐开", 13, "#c8d6e5", {
      originX: 1,
      originY: 0,
      depth: 100,
    });
    this.muteText.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
      unlockAudio();
      toggleMuted();
      this.muteText?.setText(isMuted() ? "♪ 已静音" : "♪ 音乐开");
    });

    // 金币显示(左上角)
    this.add.image(18, 14, TEX.coin).setDepth(100).setScale(1.6);
    this.coinText = gameText(this, 30, 8, String(this.coins), 14, "#ffd32a", {
      originX: 0,
      originY: 0,
      depth: 100,
    });
  }

  private makeBar(icon: string, x: number, y: number, key: BarKey): void {
    this.add
      .image(x - 16, y, icon)
      .setDepth(100)
      .setScale(1.7);
    this.add.rectangle(x, y, 116, 12, C.barBack).setOrigin(0, 0.5).setDepth(100);
    const fill = this.add
      .rectangle(x + 2, y, 112, 8, C.good)
      .setOrigin(0, 0.5)
      .setDepth(101);
    this.barFills[key] = fill;
  }

  private buildDock(): void {
    this.add
      .rectangle(GAME_WIDTH / 2, DOCK_Y + DOCK_H / 2, GAME_WIDTH, DOCK_H, C.dockPanel)
      .setDepth(90);
    const specs = [
      { label: "喂食", icon: TEX.rice, onClick: () => this.openFeed() },
      { label: "玩耍", icon: TEX.note, onClick: () => this.onPlay() },
      { label: "清洁", icon: TEX.bubble, onClick: () => this.onClean() },
      { label: "睡觉", icon: TEX.zzz, onClick: () => this.toggleSleep() },
    ];
    specs.forEach((spec, i) => {
      this.actionBtns.push(makeButton(this, BTN_CX[i], BTN_CY, spec));
    });
    this.treatBtn = makeButton(this, 88, DOCK_Y + 120, {
      label: "治疗",
      icon: TEX.medicine,
      scale: 0.82,
      onClick: () => this.onTreat(),
    });
    this.treatBtn.setVisible(false);
    this.tipText = gameText(this, 240, DOCK_Y + 120, "", 16, "#ffe9a8", {
      originX: 0.5,
      depth: 100,
    });
    makeButton(this, 392, DOCK_Y + 120, {
      label: "商店",
      icon: TEX.coin,
      scale: 0.82,
      onClick: () => this.openShop(),
    });
  }

  // ———— 商店 ————

  private openShop(): void {
    if (!this.canAct()) return;
    if (this.pet!.asleep) {
      this.showTip("睡着时逛不了商店…");
      return;
    }
    this.shopOpen = true;
    this.shopPanel?.destroy();
    this.shopPanel = this.buildShopPanel();
    this.refreshActionStates();
  }

  private closeShop(): void {
    this.shopOpen = false;
    this.shopPanel?.setVisible(false);
    this.refreshActionStates();
  }

  private buildShopPanel(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0).setDepth(130);
    const dim = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55)
      .setInteractive();
    const dialog = this.add.image(GAME_WIDTH / 2, 330, TEX.dialog).setScale(1.25, 1.55);
    const title = gameText(this, GAME_WIDTH / 2, 238, "小商店", 24, "#5b3a21", { depth: 131 });
    const coinLine = gameText(this, GAME_WIDTH / 2, 270, `金币 ${this.coins}`, 16, "#b8860b", {
      depth: 131,
    });
    c.add([dim, dialog, title, coinLine]);

    // 素底长条行:像素按钮拉宽、完整文字居中(避免小按钮塞长标签导致排版挤压)
    const addRow = (y: number, label: string, enabled: boolean, onClick: () => void): void => {
      const bg = this.add.image(GAME_WIDTH / 2, y, TEX.btn).setDisplaySize(310, 34);
      const text = gameText(this, GAME_WIDTH / 2, y, label, 15, enabled ? "#5b3a21" : "#a3927c", {
        depth: 131,
      });
      if (enabled) {
        bg.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
          unlockAudio();
          sfxClick();
          this.tweens.add({ targets: bg, alpha: 0.7, duration: 60, yoyo: true });
          onClick();
        });
      }
      c.add([bg, text]);
    };

    SHOP_FOODS.forEach((def, i) => {
      addRow(302 + i * 36, `${def.label} · ${def.desc}　${def.price}币`, true, () =>
        this.buyFood(def),
      );
    });
    const owned = ProfileStore.load().ownedDecor;
    SHOP_DECOR.forEach((def, i) => {
      const has = owned.includes(def.id);
      addRow(
        302 + (SHOP_FOODS.length + i) * 36,
        has ? `${def.label} · 已拥有` : `${def.label} · ${def.price}币`,
        !has,
        () => this.buyDecor(def),
      );
    });

    addRow(444, "先不买了", true, () => this.closeShop());
    return c;
  }

  private spendCoins(amount: number): void {
    this.coins = Math.max(0, this.coins - amount);
    ProfileStore.update((p) => {
      p.coins = Math.max(0, p.coins - amount);
    });
  }

  private buyFood(def: ShopFoodDef): void {
    if (this.coins < def.price) {
      sfxRefuse();
      this.showTip("金币不够,去玩小游戏吧", "#ff9f9f");
      return;
    }
    if (this.pet!.hunger > 92) {
      sfxRefuse();
      this.showTip("它已经吃不下了…", "#ff9f9f");
      return;
    }
    this.spendCoins(def.price);
    this.doFeed(def.kind);
    // 刷新面板上的金币与行状态
    this.shopPanel?.destroy();
    this.shopPanel = this.buildShopPanel();
  }

  private buyDecor(def: ShopDecorDef): void {
    const owned = ProfileStore.load().ownedDecor;
    if (owned.includes(def.id)) return;
    if (this.coins < def.price) {
      sfxRefuse();
      this.showTip("金币不够,去玩小游戏吧", "#ff9f9f");
      return;
    }
    this.spendCoins(def.price);
    ProfileStore.update((p) => {
      p.ownedDecor.push(def.id);
    });
    this.room.placeDecor([def.id]);
    sfxHatchPop();
    this.burst(TEX.sparkle, GAME_WIDTH / 2, 300, 8);
    this.showTip(`${def.label}买好啦,就在房间里！`);
    this.shopPanel?.destroy();
    this.shopPanel = this.buildShopPanel();
  }

  private buildFeedPanel(): void {
    const c = this.add.container(0, 0).setDepth(130).setVisible(false);
    const dim = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55)
      .setInteractive();
    const dialog = this.add.image(GAME_WIDTH / 2, 330, TEX.dialog);
    const title = gameText(this, GAME_WIDTH / 2, 268, "喂点什么？", 24, "#5b3a21", { depth: 131 });
    const rice = makeButton(this, GAME_WIDTH / 2, 322, {
      label: "饭团 · 饱腹",
      icon: TEX.rice,
      scale: 0.9,
      onClick: () => this.doFeed("meal"),
    });
    const pudding = makeButton(this, GAME_WIDTH / 2, 384, {
      label: "布丁 · 解馋",
      icon: TEX.pudding,
      scale: 0.9,
      onClick: () => this.doFeed("snack"),
    });
    const cancel = makeButton(this, GAME_WIDTH / 2, 442, {
      label: "取消",
      onClick: () => this.closeFeed(),
    });
    c.add([dim, dialog, title, rice, pudding, cancel]);
    this.feedPanel = c;
  }

  private buildSleepOverlay(): void {
    this.sleepOverlay = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, C.sleepOverlay, 0)
      .setDepth(40);
    this.zzz1 = this.add
      .image(GAME_WIDTH / 2 + 40, FLOOR_Y - 150, TEX.zzz)
      .setScale(2.4)
      .setDepth(41)
      .setVisible(false);
    this.zzz2 = this.add
      .image(GAME_WIDTH / 2 + 64, FLOOR_Y - 178, TEX.zzz)
      .setScale(1.6)
      .setDepth(41)
      .setVisible(false);
    this.sweatIcon = this.add
      .image(GAME_WIDTH / 2 + 34, FLOOR_Y - 140, TEX.sweat)
      .setScale(2)
      .setDepth(8)
      .setVisible(false);
  }

  // ———— 数据辅助 ————

  private petTex(): string {
    const pet = this.pet!;
    return petTexKey(pet.speciesId, formOf(pet.stage, pet.branch), pet.variant, this.frame);
  }

  private currentName(): string {
    const pet = this.pet!;
    return stageName(this.species!, pet.stage, pet.branch);
  }

  private ageDays(): number {
    return (Date.now() - this.pet!.bornAt) / DAY_MS;
  }

  private statOf(key: "hunger" | "happy" | "energy" | "clean"): number {
    return this.pet![key];
  }

  private persist(): void {
    if (this.pet && !this.gone) SaveManager.save(this.pet);
  }

  /** 离线流逝：衰减封顶 + 温和速率 + 离线便便/生病/疏忽 */
  private applyOffline(): void {
    const pet = this.pet!;
    const now = Date.now();
    const elapsed = clamp(now - pet.lastSeen, 0, OFFLINE_CAP_MS);
    if (elapsed < 1000) return;
    const rateSec = (elapsed / 1000) * OFFLINE_DECAY_RATE;
    pet.hunger = clamp(pet.hunger - DECAY.hungerPerSec * rateSec * this.mod.hungerDecay, 0, 100);
    pet.happy = clamp(pet.happy - DECAY.happyPerSec * rateSec * this.mod.happyDecay, 0, 100);
    if (pet.asleep) {
      pet.energy = clamp(pet.energy - DECAY.energyPerSecSleep * (elapsed / 1000), 0, 100);
    } else {
      pet.energy = clamp(
        pet.energy - DECAY.energyPerSecAwake * rateSec * this.mod.energyDecay,
        0,
        100,
      );
    }
    pet.clean = clamp(
      pet.clean -
        (DECAY.cleanBasePerSec + pet.poops.length * DECAY.cleanPerPoopPerSec * 0.5) * rateSec,
      0,
      100,
    );
    const target = (pet.hunger + pet.happy + pet.clean) / 3;
    pet.care = clamp(pet.care + (target - pet.care) * 0.3, 0, 100);

    const want = Math.min(POOP_MAX, Math.floor((elapsed / 3600_000) * OFFLINE_POOP_PER_HOUR));
    let added = 0;
    for (let i = 0; i < want && pet.poops.length < POOP_MAX; i++) {
      this.addPoopToState();
      added++;
    }
    if (!pet.sick && (pet.clean < 25 || pet.hunger <= 0) && Math.random() < 0.35) {
      pet.sick = true;
    }
    if (pet.hunger <= 0 && pet.happy <= 0) {
      pet.neglectSec += (elapsed / 1000) * OFFLINE_DECAY_RATE;
    }

    if (elapsed >= OFFLINE_NOTICE_MIN_MS) {
      const mins = Math.floor(elapsed / 60000);
      const timeText =
        mins >= 60 ? `${Math.floor(mins / 60)} 小时 ${mins % 60} 分` : `${mins} 分钟`;
      this.offlineLines.push(`你离开了 ${timeText}`);
      if (pet.hunger < 35) this.offlineLines.push("它饿得咕咕叫了…");
      if (added > 0) this.offlineLines.push("房间里多了几坨便便…");
      if (pet.sick) this.offlineLines.push("它好像生病了！");
    }
  }

  /** 若年龄已越过阶段阈值则推进阶段；离线=true 表示无仪式结算 */
  private applyStageIfDue(): boolean {
    const pet = this.pet!;
    const due = stageOfAge(this.ageDays());
    if (due === pet.stage) return false;
    pet.stage = due;
    if (due === 5) pet.branch = branchOfCare(pet.care);
    return true;
  }

  // ———— 互动 ————

  private canAct(): boolean {
    return (
      !this.locked &&
      !this.feedOpen &&
      !this.shopOpen &&
      !this.miniGames.isActive() &&
      !this.gone &&
      this.pet !== null
    );
  }

  private showTip(msg: string, color = "#ffe9a8"): void {
    this.tipText?.setText(msg).setColor(color).setAlpha(1);
    this.tipTween?.remove();
    this.tipTween = this.tweens.add({
      targets: this.tipText,
      alpha: 0,
      delay: 1800,
      duration: 500,
    });
  }

  private petPet(): void {
    if (!this.canAct()) return;
    const pet = this.pet!;
    if (pet.asleep) {
      this.showTip("睡得正香，别吵醒它…");
      return;
    }
    if (this.petCooldownSec > 0) return;
    this.petCooldownSec = 2;
    pet.happy = clamp(pet.happy + 2, 0, 100);
    sfxPat();
    // ♥3+:蹭手演出(倾斜+更多爱心)
    const bondLv = bondLevelOf(pet.bond);
    this.burst(TEX.heart, this.petSprite!.x, this.petSprite!.y - 120, bondLv >= 3 ? 9 : 5);
    if (bondLv >= 3) {
      this.tweens.add({
        targets: this.petSprite,
        rotation: { from: -0.1, to: 0.1 },
        duration: 90,
        yoyo: true,
        repeat: 2,
      });
    }
    ProfileStore.update((p) => {
      p.stats.patted++;
    });
    if (pet.sick) {
      this.say(randomOf(PAT_SICK_LINES));
      return;
    }
    // 亲密度有独立冷却，防止连点刷满
    if (this.bondPatSec <= 0) {
      this.bondPatSec = BOND_PAT_COOLDOWN_SEC;
      pet.bond = clamp(pet.bond + BOND_GAIN.pat * this.mod.bondGain, 0, BOND_MAX);
      if (Math.random() < 0.5) this.say(randomOf(PAT_LINES));
    }
  }

  private openFeed(): void {
    if (!this.canAct()) return;
    if (this.pet!.asleep) {
      this.showTip("睡着时吃不了东西…");
      return;
    }
    this.feedOpen = true;
    this.feedPanel?.setVisible(true);
    this.refreshActionStates();
  }

  private closeFeed(): void {
    this.feedOpen = false;
    this.feedPanel?.setVisible(false);
    this.refreshActionStates();
  }

  private doFeed(kind: "meal" | "snack" | "deluxe" | "cake"): void {
    const pet = this.pet!;
    if (pet.hunger > 92) {
      sfxRefuse();
      pet.happy = clamp(pet.happy - 2, 0, 100);
      this.showTip("吃不下了，再喂要积食啦", "#ff9f9f");
      this.closeFeed();
      return;
    }
    if (kind === "meal") {
      pet.hunger = clamp(pet.hunger + GAIN.mealHunger, 0, 100);
      pet.happy = clamp(pet.happy + GAIN.mealHappy, 0, 100);
      pet.weight = clamp(pet.weight + GAIN.mealWeight, 5, WEIGHT_MAX);
    } else if (kind === "snack") {
      pet.hunger = clamp(pet.hunger + GAIN.snackHunger, 0, 100);
      pet.happy = clamp(pet.happy + GAIN.snackHappy, 0, 100);
      pet.weight = clamp(pet.weight + GAIN.snackWeight, 5, WEIGHT_MAX);
    } else if (kind === "deluxe") {
      pet.hunger = clamp(pet.hunger + GAIN.deluxeHunger, 0, 100);
      pet.happy = clamp(pet.happy + GAIN.deluxeHappy, 0, 100);
      pet.weight = clamp(pet.weight + GAIN.deluxeWeight, 5, WEIGHT_MAX);
    } else {
      pet.hunger = clamp(pet.hunger + GAIN.cakeHunger, 0, 100);
      pet.happy = clamp(pet.happy + GAIN.cakeHappy, 0, 100);
      pet.weight = clamp(pet.weight + GAIN.cakeWeight, 5, WEIGHT_MAX);
    }
    sfxMunch();
    this.time.delayedCall(360, () => sfxYum());
    this.chewSec = 1.1;
    // 食物飞入动画
    const food = this.add
      .image(
        this.petSprite!.x - 40,
        DOCK_Y - 20,
        kind === "meal" || kind === "deluxe" ? TEX.rice : TEX.pudding,
      )
      .setScale(2.5)
      .setDepth(30);
    this.tweens.add({
      targets: food,
      x: this.petSprite!.x,
      y: this.petSprite!.y - 70,
      scale: 1.2,
      alpha: 0,
      duration: 480,
      ease: "Quad.easeIn",
      onComplete: () => food.destroy(),
    });
    this.poopTimerSec = Math.min(this.poopTimerSec, POOP_AFTER_MEAL_SEC);
    pet.bond = clamp(pet.bond + BOND_GAIN.feed, 0, BOND_MAX);
    ProfileStore.update((p) => {
      p.stats.fed++;
    });
    if (Math.random() < 0.4) this.say(randomOf(FEED_LINES));
    this.closeFeed();
    this.persist();
  }

  private onPlay(): void {
    if (!this.canAct()) return;
    const pet = this.pet!;
    if (pet.asleep) {
      this.showTip("睡得正香，别吵醒它…");
      return;
    }
    if (pet.sick) {
      this.showTip("生病了没有心情玩，先治疗吧", "#ff9f9f");
      return;
    }
    if (pet.energy < 15) {
      this.showTip("太累了，让它睡一会儿吧…", "#ff9f9f");
      return;
    }
    this.miniGames.openSelect();
    this.refreshActionStates();
  }

  private onClean(): void {
    if (!this.canAct()) return;
    if (this.pet!.asleep) {
      this.showTip("等它睡醒再打扫吧");
      return;
    }
    if (this.pet!.poops.length === 0) {
      this.showTip("房间里已经很干净啦");
      return;
    }
    sfxSplash();
    for (const view of this.poopViews) {
      for (let i = 0; i < 3; i++) {
        const bubble = this.add
          .image(view.spot.x + randRange(-14, 14), view.spot.y - 8, TEX.bubble)
          .setScale(1.8)
          .setDepth(30);
        this.tweens.add({
          targets: bubble,
          y: view.spot.y - randRange(50, 110),
          alpha: 0,
          duration: randRange(500, 850),
          onComplete: () => bubble.destroy(),
        });
      }
      view.sprite.destroy();
    }
    this.poopViews = [];
    this.pet!.poops = [];
    this.pet!.clean = 100;
    this.showTip("洗得干干净净！");
    this.pet!.bond = clamp(this.pet!.bond + BOND_GAIN.clean, 0, BOND_MAX);
    ProfileStore.update((p) => {
      p.stats.cleaned++;
    });
    if (Math.random() < 0.4) this.say(randomOf(CLEAN_LINES));
    this.poopTimerSec = randRange(POOP_INTERVAL_MIN_SEC, POOP_INTERVAL_MAX_SEC);
    this.persist();
  }

  private toggleSleep(): void {
    if (this.locked || this.feedOpen || this.shopOpen || this.miniGames.isActive() || this.gone) {
      return;
    }
    if (this.pet!.asleep) this.wakeUp(true);
    else this.fallAsleep(true);
  }

  private fallAsleep(user: boolean): void {
    const pet = this.pet!;
    pet.asleep = true;
    this.hideBubble();
    stopBgm();
    if (user) sfxSleepStart();
    this.despawnCritter();
    this.room.setNight(true);
    this.applySleepVisuals(false);
    this.refreshActionStates();
    this.persist();
  }

  private wakeUp(user: boolean): void {
    const pet = this.pet!;
    if (user && pet.energy < GAIN.sleepWakeSadThreshold) {
      pet.happy = clamp(pet.happy + GAIN.sleepWakeSadHappy, 0, 100);
      this.showTip("被吵醒了，有点不开心…", "#ff9f9f");
      this.flashAnger();
    }
    pet.asleep = false;
    if (user) sfxWake();
    this.room.setNight(false);
    this.applySleepVisuals(true);
    this.refreshActionStates();
    this.persist();
    // 睡觉期间长大了 → 立刻播放进化仪式
    if (this.applyStageIfDue()) this.runEvolution();
  }

  private applySleepVisuals(off: boolean): void {
    if (!this.sleepOverlay || !this.zzz1 || !this.zzz2) return;
    this.tweens.add({ targets: this.sleepOverlay, fillAlpha: off ? 0 : 0.72, duration: 400 });
    this.zzz1.setVisible(!off).setScale(2.4).setAlpha(1);
    this.zzz2.setVisible(!off).setScale(1.6).setAlpha(1);
    if (!off) {
      this.tweens.add({
        targets: [this.zzz1, this.zzz2],
        y: "-=18",
        alpha: 0.15,
        duration: 1500,
        yoyo: false,
        repeat: -1,
      });
    } else {
      this.tweens.killTweensOf([this.zzz1, this.zzz2]);
      this.zzz1.y = FLOOR_Y - 150;
      this.zzz2.y = FLOOR_Y - 178;
    }
    this.refreshPetTint();
  }

  private flashAnger(): void {
    const anger = this.add
      .image(this.petSprite!.x + 30, this.petSprite!.y - 130, TEX.anger)
      .setScale(2)
      .setDepth(30);
    this.tweens.add({
      targets: anger,
      y: "-=16",
      alpha: 0,
      duration: 700,
      onComplete: () => anger.destroy(),
    });
  }

  private onTreat(): void {
    if (this.locked || this.gone || !this.pet!.sick) return;
    this.locked = true;
    sfxMedicine();
    const med = this.add
      .image(this.petSprite!.x, this.petSprite!.y - 170, TEX.medicine)
      .setScale(2.4)
      .setDepth(30);
    this.tweens.add({
      targets: med,
      y: this.petSprite!.y - 90,
      angle: 30,
      duration: 600,
      ease: "Quad.easeIn",
      onComplete: () => med.destroy(),
    });
    this.time.delayedCall(1100, () => {
      const pet = this.pet!;
      pet.sick = false;
      pet.energy = clamp(pet.energy - 5, 0, 100);
      this.locked = false;
      this.refreshPetTint();
      this.showTip("病好啦！又是元气满满的一天");
      this.burst(TEX.sparkle, this.petSprite!.x, this.petSprite!.y - 90, 8);
      this.persist();
    });
  }

  // ———— 小游戏公共结算 ————

  private finishPlay(win: boolean, winLine: string, loseLine: string): void {
    const pet = this.pet!;
    pet.happy = clamp(
      pet.happy + (win ? GAIN.playWinHappy * this.mod.playGain : GAIN.playLoseHappy),
      0,
      100,
    );
    pet.energy = clamp(pet.energy - GAIN.playEnergyCost, 0, 100);
    pet.weight = clamp(pet.weight - GAIN.playWeightLoss, 5, WEIGHT_MAX);
    ProfileStore.update((p) => {
      p.stats.games++;
      if (win) p.stats.wins++;
    });
    // 金币:胜利 3+阶段,参与 1
    const coinReward = win ? COIN_WIN_BASE + pet.stage : COIN_PLAY_LOSE;
    ProfileStore.addCoins(coinReward);
    this.coins += coinReward;
    this.miniGames.closeAll();
    this.refreshActionStates();
    if (win) {
      sfxGameWin();
      this.showTip(`${winLine} +${coinReward}币`);
      this.burst(TEX.heart, GAME_WIDTH / 2, FLOOR_Y - 160, 8);
      pet.bond = clamp(pet.bond + BOND_GAIN.playWin, 0, BOND_MAX);
      if (Math.random() < 0.5) this.say(randomOf(WIN_LINES));
      // 开心连跳
      this.hopChain = 1;
      this.moveState = "hop";
      this.stateTimeSec = 0;
      this.walkDir = Math.random() < 0.5 ? 1 : -1;
    } else {
      sfxGameLose();
      this.showTip(`${loseLine} +${coinReward}币`);
      if (Math.random() < 0.3) this.say(randomOf(LOSE_LINES));
    }
    this.persist();
  }

  // ———— 便便 / 生病 / 进化 / 离家 ————

  private addPoopToState(): void {
    const pet = this.pet!;
    if (pet.poops.length >= POOP_MAX) return;
    const used = pet.poops.map((p) => POOP_SPOTS.findIndex((s) => s.x === p.x && s.y === p.y));
    const free: number[] = [];
    POOP_SPOTS.forEach((_, i) => {
      if (!used.includes(i)) free.push(i);
    });
    if (free.length === 0) return;
    const idx = free[Math.floor(Math.random() * free.length)];
    pet.poops.push({ x: POOP_SPOTS[idx].x, y: POOP_SPOTS[idx].y });
  }

  private addPoopView(spot: PoopSpot): void {
    const tex = this.poopViews.length % 2 === 0 ? TEX.poop0 : TEX.poop1;
    const sprite = this.add
      .image(spot.x, spot.y + 10, tex)
      .setOrigin(0.5, 1)
      .setScale(3)
      .setDepth(3);
    this.poopViews.push({ spot, sprite });
  }

  private becomeSick(): void {
    const pet = this.pet!;
    pet.sick = true;
    sfxSick();
    this.showTip("小家伙生病了，快喂药！", "#ff9f9f");
    this.refreshPetTint();
    this.persist();
  }

  private refreshPetTint(): void {
    const pet = this.pet;
    if (!this.petSprite || !pet) return;
    this.petSprite.setTint(pet.asleep ? 0xb0c4de : pet.sick ? 0xc4e0c4 : 0xffffff);
  }

  private refreshActionStates(): void {
    const pet = this.pet;
    if (!pet) return;
    const asleep = pet.asleep;
    // [喂食, 玩耍, 清洁, 睡觉]
    setBtnEnabled(
      this.actionBtns[0],
      !asleep && !this.feedOpen && !this.miniGames.isActive() && !this.locked,
    );
    setBtnEnabled(
      this.actionBtns[1],
      !asleep && !this.feedOpen && !this.miniGames.isActive() && !this.locked,
    );
    setBtnEnabled(
      this.actionBtns[2],
      !asleep && !this.feedOpen && !this.miniGames.isActive() && !this.locked,
    );
    setBtnEnabled(this.actionBtns[3], !this.feedOpen && !this.miniGames.isActive() && !this.locked);
    if (this.actionBtns[3]) {
      const label = this.actionBtns[3].list[1] as Phaser.GameObjects.Text;
      label.setText(asleep ? "叫醒" : "睡觉");
    }
    if (this.treatBtn) {
      this.treatBtn.setVisible(pet.sick);
      if (pet.sick && !this.treatPulse) {
        this.treatPulse = this.tweens.add({
          targets: this.treatBtn,
          scale: 0.9,
          duration: 420,
          yoyo: true,
          repeat: -1,
        });
      } else if (!pet.sick && this.treatPulse) {
        this.treatPulse.stop();
        this.treatPulse = null;
        this.treatBtn.setScale(0.82);
      }
    }
  }

  private runEvolution(): void {
    const pet = this.pet!;
    if (this.gone) return;
    this.locked = true;
    this.refreshActionStates();
    this.tweens.killTweensOf(this.petSprite!);
    // 定格在地面中央，清掉漫游姿态
    this.moveState = "idle";
    this.moveTargetX = null;
    this.despawnCritter();
    this.petSprite!.setRotation(0);
    this.petSprite!.setScale(3);
    this.petSprite!.y = FLOOR_Y;
    const oldName = this.currentName();
    pet.stage = stageOfAge(this.ageDays());
    if (pet.stage === 5) pet.branch = branchOfCare(pet.care);
    const newName = this.currentName();

    sfxEvolve();
    this.cameras.main.flash(500, 255, 255, 255);
    this.petSprite!.setTint(0x3a3a55);
    this.tweens.add({
      targets: this.petSprite,
      scaleX: 3.5,
      scaleY: 2.7,
      duration: 160,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.frame = 0;
        this.petSprite!.setTexture(this.petTex());
        this.petSprite!.setScale(3);
        this.refreshPetTint();
        this.cameras.main.flash(420, 255, 255, 255);
        sfxHatchPop();
        this.burst(TEX.sparkle, this.petSprite!.x, this.petSprite!.y - 80, 16);
        const banner = gameText(this, GAME_WIDTH / 2, 190, "进化了！", 44, "#ffe9a8", {
          stroke: "#5b3a21",
          strokeThickness: 9,
          depth: 200,
        });
        const sub = gameText(this, GAME_WIDTH / 2, 238, `${oldName} → ${newName}`, 24, "#ffffff", {
          stroke: "#5b3a21",
          strokeThickness: 6,
          depth: 200,
        });
        banner.setScale(0.2);
        this.tweens.add({ targets: banner, scale: 1, duration: 300, ease: "Back.easeOut" });
        this.time.delayedCall(2100, () => {
          banner.destroy();
          sub.destroy();
          this.locked = false;
          this.refreshActionStates();
          this.say(randomOf(EVOLVE_LINES));
          ProfileStore.markSeenForm(dexKeyOf(pet));
          this.checkAchievements();
          this.persist();
        });
      },
    });
  }

  private runAway(): void {
    if (this.gone) return;
    this.gone = true;
    this.locked = true;
    this.hideBubble();
    stopBgm();
    sfxRunaway();
    sfxCrack();
    this.tweens.killTweensOf(this.petSprite!);
    this.refreshActionStates();
    this.showTip("小家伙收拾行李，离家出走了……", "#ff9f9f");
    this.petSprite!.setFlipX(true);
    this.tweens.add({
      targets: this.petSprite,
      x: -70,
      duration: 2600,
      ease: "Linear",
      onComplete: () => {
        const data = { days: Math.floor(this.ageDays()), finalName: this.currentName() };
        ProfileStore.update((p) => {
          p.stats.departed++;
        });
        SaveManager.clearPet();
        this.scene.start("end", data);
      },
    });
  }

  private showWelcome(lines: string[]): void {
    this.locked = true;
    const c = this.add.container(0, 0).setDepth(140);
    const dim = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setInteractive();
    const dialog = this.add.image(GAME_WIDTH / 2, 320, TEX.dialog);
    const title = gameText(this, GAME_WIDTH / 2, 258, "欢迎回来", 26, "#5b3a21", { depth: 141 });
    const body = gameText(this, GAME_WIDTH / 2, 336, lines.join("\n"), 18, "#5b3a21", {
      depth: 141,
    });
    const ok = makeButton(this, GAME_WIDTH / 2, 446, {
      label: "继续照顾",
      onClick: () => {
        c.destroy();
        this.locked = false;
        this.refreshActionStates();
        this.say(randomOf(WELCOME_LINES));
      },
    });
    ok.setDepth(141);
    c.add([dim, dialog, title, body, ok]);
  }

  private burst(texture: string, x: number, y: number, count: number): void {
    this.add
      .particles(0, 0, texture, {
        speed: { min: 60, max: 190 },
        angle: { min: 200, max: 340 },
        gravityY: 160,
        lifespan: 900,
        scale: { start: 1.6, end: 0.2 },
        emitting: false,
      })
      .setDepth(30)
      .explode(count, x, y);
  }

  // ———— 房间漫游行为 ————

  /** 点击地板：宠物走到落点（睡觉/演出/弹窗时忽略）;♥5 召唤有奖励演出 */
  private onFloorTap(worldX: number): void {
    if (!this.pet || !this.petSprite || this.pet.asleep || this.gone || this.locked) return;
    const tx = clamp(worldX, PET_X_MIN, PET_X_MAX);
    if (Math.abs(tx - this.petSprite.x) < 14) return;
    this.moveState = "walk";
    this.moveTargetX = tx;
    this.stateTimeSec = 0;
    this.moveTimerSec = 6;
    this.walkDir = tx > this.petSprite.x ? 1 : -1;
    this.comeHere = bondLevelOf(this.pet.bond) >= 5;
    // 落点提示气泡
    const ping = this.add
      .image(tx, FLOOR_Y + 2, TEX.bubble)
      .setScale(1.3)
      .setAlpha(0.85)
      .setDepth(2);
    this.tweens.add({
      targets: ping,
      y: FLOOR_Y - 28,
      alpha: 0,
      duration: 620,
      onComplete: () => ping.destroy(),
    });
  }

  private resetPetPose(): void {
    if (!this.petSprite) return;
    this.petSprite.y = FLOOR_Y;
    this.petSprite.setScale(3);
    this.petSprite.setRotation(0);
  }

  private toIdle(idleSec: number): void {
    this.resetPetPose();
    this.moveState = "idle";
    this.moveTargetX = null;
    this.stateTimeSec = 0;
    this.moveTimerSec = idleSec;
  }

  /** 弹窗(喂食/小游戏)期间安静坐下，不干扰演示 */
  private enterSit(): void {
    this.resetPetPose();
    this.moveState = "sit";
    this.stateTimeSec = 0;
    this.moveTimerSec = 2.2;
    this.petSprite?.setScale(3, 2.8);
  }

  /** 按心情/健康挑一个下一个动作：越开心越爱蹦跶，生病只想坐着，性格再修正偏好 */
  private pickNextMove(): void {
    const pet = this.pet!;
    const entries: Array<[PetMoveState, number]> = pet.sick
      ? [
          ["sit", 5],
          ["idle", 4],
          ["walk", 1.2],
        ]
      : pet.happy >= 65
        ? [
            ["idle", 2],
            ["walk", 3],
            ["hop", 2.5],
            ["roll", 2],
            ["sit", 1.2],
          ]
        : [
            ["idle", 3],
            ["walk", 3],
            ["hop", 1.2],
            ["sit", 2],
            ["roll", 0.8],
          ];
    if (!pet.sick) {
      const moveMod = PERSONALITY_MOVE[pet.personality];
      for (let i = 0; i < entries.length; i++) {
        const [state, w] = entries[i];
        entries[i] = [state, w * (moveMod[state as keyof typeof moveMod] ?? 1)];
      }
    }
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = Math.random() * total;
    let choice: PetMoveState = "idle";
    for (const [key, w] of entries) {
      roll -= w;
      if (roll <= 0) {
        choice = key;
        break;
      }
    }
    this.moveState = choice;
    this.stateTimeSec = 0;
    switch (choice) {
      case "idle":
        this.moveTimerSec = randRange(1.4, 3.4);
        break;
      case "sit":
        this.petSprite?.setScale(3, 2.8);
        this.moveTimerSec = randRange(2.2, 4.5);
        break;
      case "walk":
        this.moveTargetX = randRange(PET_X_MIN + 10, PET_X_MAX - 10);
        this.moveTimerSec = 6;
        break;
      case "hop":
      case "roll":
        this.walkDir = Math.random() < 0.5 ? 1 : -1;
        this.moveTimerSec = 1;
        break;
      case "chase":
        this.moveTimerSec = 8;
        break;
    }
  }

  private updateWander(dt: number): void {
    const sprite = this.petSprite;
    if (!sprite || !this.pet) return;
    const pet = this.pet;

    // 睡觉 / 演出 / 离家：定格并复位姿态(睡觉带轻轻呼吸)
    if (pet.asleep || this.gone || this.locked) {
      this.resetPetPose();
      if (pet.asleep) {
        sprite.setScale(3, 3 + Math.sin(this.stateTimeSec * 1.8) * 0.045);
      }
      this.moveState = "idle";
      this.moveTimerSec = Math.min(this.moveTimerSec, 1);
      return;
    }
    // 弹窗期间安静坐下
    if ((this.miniGames.isActive() || this.feedOpen || this.shopOpen) && this.moveState !== "sit") {
      this.enterSit();
    }

    this.stateTimeSec += dt;
    switch (this.moveState) {
      case "idle": {
        // 轻轻呼吸起伏
        sprite.y = FLOOR_Y - (Math.sin(this.stateTimeSec * 2.4) * 1.6 + 1.6);
        this.moveTimerSec -= dt;
        if (this.moveTimerSec <= 0) this.pickNextMove();
        break;
      }
      case "sit": {
        sprite.y = FLOOR_Y;
        if (this.chewSec > 0) {
          // 吃饭咀嚼:一鼓一鼓
          this.chewSec -= dt;
          sprite.setScale(3, 2.8 + Math.abs(Math.sin(this.stateTimeSec * 16)) * 0.16);
        } else if (pet.sick) {
          // 病蔫:轻轻晃
          sprite.setScale(3, 2.8);
          sprite.setRotation(Math.sin(this.stateTimeSec * 1.6) * 0.04);
        } else {
          sprite.setScale(3, 2.8 + Math.sin(this.stateTimeSec * 2.2) * 0.06);
        }
        this.moveTimerSec -= dt;
        if (this.moveTimerSec <= 0) this.pickNextMove();
        break;
      }
      case "walk": {
        const target = this.moveTargetX;
        if (target === null) {
          this.toIdle(randRange(1.2, 3));
          break;
        }
        const dx = target - sprite.x;
        if (Math.abs(dx) < 6) {
          // ♥5 召唤抵达:爱心+台词+跳一下
          if (this.comeHere) {
            this.comeHere = false;
            this.burst(TEX.heart, sprite.x, sprite.y - 130, 6);
            this.say(randomOf(COME_LINES));
            this.hopChain = 1;
          }
          this.toIdle(randRange(1.2, 3));
          break;
        }
        this.walkDir = dx > 0 ? 1 : -1;
        sprite.setFlipX(this.walkDir < 0);
        const speed = this.walkSpeedPxSec * (pet.sick ? 0.5 : 1);
        sprite.x = clamp(sprite.x + this.walkDir * speed * dt, PET_X_MIN, PET_X_MAX);
        // 小碎步的颠簸
        sprite.y = FLOOR_Y - Math.abs(Math.sin(this.stateTimeSec * 9)) * 2.5;
        break;
      }
      case "hop": {
        const progress = this.stateTimeSec / 0.55;
        if (progress >= 1) {
          // 连跳(胜利/召唤奖励)
          if (this.hopChain > 0 && !pet.sick) {
            this.hopChain--;
            this.stateTimeSec = 0;
            break;
          }
          this.toIdle(randRange(1, 2.6));
          break;
        }
        const arc = Math.sin(Math.PI * progress);
        sprite.y = FLOOR_Y - arc * 30;
        sprite.setScale(3, 3 + arc * 0.28);
        sprite.x = clamp(sprite.x + this.walkDir * 26 * dt, PET_X_MIN, PET_X_MAX);
        break;
      }
      case "roll": {
        const progress = this.stateTimeSec / 0.8;
        if (progress >= 1) {
          this.toIdle(randRange(1, 2.6));
          break;
        }
        sprite.setRotation(this.walkDir * progress * Math.PI * 2);
        sprite.y = FLOOR_Y - Math.sin(Math.PI * progress) * 10;
        break;
      }
      case "chase": {
        const tx = this.chaseTarget === "ball" ? this.room.ballX() : (this.critter?.x ?? null);
        if (tx === null) {
          this.chaseTarget = null;
          this.toIdle(randRange(1, 2));
          break;
        }
        const dx = tx - sprite.x;
        this.walkDir = dx >= 0 ? 1 : -1;
        sprite.setFlipX(this.walkDir < 0);
        sprite.x = clamp(
          sprite.x + this.walkDir * this.walkSpeedPxSec * 1.4 * dt,
          PET_X_MIN,
          PET_X_MAX,
        );
        sprite.y = FLOOR_Y - Math.abs(Math.sin(this.stateTimeSec * 10)) * 3;
        if (Math.abs(dx) < 36) {
          if (this.chaseTarget === "ball") {
            // 追上球：拱它玩
            const outcome = this.room.nudge(this.walkDir);
            if (outcome === "gone") {
              this.chaseTarget = null;
              this.toIdle(randRange(1, 2));
              break;
            }
            pet.happy = clamp(pet.happy + 1, 0, 100);
            sfxGuessRight();
            this.burst(TEX.sparkle, this.room.ballX(), this.room.ballY() - 16, 3);
            if (outcome === "done") this.chaseTarget = null; // 庆祝在 onBallReturned
          } else {
            // 追上星光小精灵！
            this.burst(TEX.sparkle, sprite.x, sprite.y - 70, 6);
            pet.happy = clamp(pet.happy + 3, 0, 100);
            sfxGuessRight();
            this.despawnCritter();
            this.toIdle(randRange(1, 2));
          }
        }
        break;
      }
    }
  }

  /** 偶尔有一颗星光小精灵飘过房间，宠物会追着玩 */
  private updateCritter(dt: number): void {
    if (this.critter) return;
    const pet = this.pet;
    if (
      !pet ||
      pet.asleep ||
      this.gone ||
      this.locked ||
      pet.sick ||
      this.miniGames.isActive() ||
      this.feedOpen ||
      this.shopOpen
    ) {
      return;
    }
    this.critterTimerSec -= dt;
    if (this.critterTimerSec <= 0) {
      this.critterTimerSec = randRange(16, 30);
      this.spawnCritter();
    }
  }

  private spawnCritter(): void {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const y = FLOOR_Y - randRange(40, 95);
    // 三成概率是蝴蝶(飞得摇曳),其余是星光小精灵
    const butterfly = Math.random() < 0.3;
    this.critter = this.add
      .image(dir === 1 ? -20 : GAME_WIDTH + 20, y, butterfly ? TEX.butterfly : TEX.sparkle)
      .setScale(butterfly ? 2.4 : 1.6)
      .setDepth(4);
    this.tweens.add({
      targets: this.critter,
      x: dir === 1 ? GAME_WIDTH + 20 : -20,
      duration: randRange(3800, 5200),
      onComplete: () => this.despawnCritter(),
    });
    if (butterfly) {
      this.tweens.add({
        targets: this.critter,
        y: y + randRange(-18, 18),
        duration: randRange(500, 800),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
    // 心情还行就追上去
    if (this.pet && !this.pet.sick && this.pet.happy >= 35) {
      this.chaseTarget = "critter";
      this.moveState = "chase";
      this.stateTimeSec = 0;
      this.moveTimerSec = 8;
    }
  }

  private despawnCritter(): void {
    this.critter?.destroy();
    this.critter = null;
  }

  // ———— 天气与随机房间事件 ————

  /** 天气每 90~180 秒翻牌一次:晴/雨/雪;切换时宠物偶尔感慨 */
  private updateWeather(dt: number): void {
    if (this.gone) return;
    // 雨声:下雨时定期轻响
    if (this.weather === "rain") {
      this.weatherSfxSec -= dt;
      if (this.weatherSfxSec <= 0) {
        this.weatherSfxSec = 2.6;
        if (this.pet && !this.pet.asleep) sfxRainPatter();
      }
    }
    this.weatherSec -= dt;
    if (this.weatherSec > 0) return;
    this.weatherSec = randRange(90, 180);
    const roll = Math.random();
    const next: RoomWeather = roll < 0.5 ? "clear" : roll < 0.75 ? "rain" : "snow";
    this.weather = next;
    this.room.setWeather(next);
    if (
      next !== "clear" &&
      this.pet &&
      !this.pet.asleep &&
      this.canChatter() &&
      Math.random() < 0.5
    ) {
      this.say(randomOf([...WEATHER_LINES[next]]));
    }
  }

  /** 偶尔从天而降一个礼物盒,点了给金币 */
  private updateGift(dt: number): void {
    const pet = this.pet;
    if (!pet || this.gone) return;
    if (this.giftImg) {
      this.giftLifeSec -= dt;
      if (this.giftLifeSec <= 0) {
        this.giftImg.destroy();
        this.giftImg = null;
        this.giftTimerSec = randRange(150, 300);
      }
      return;
    }
    if (pet.asleep || this.locked || this.miniGames.isActive()) return;
    this.giftTimerSec -= dt;
    if (this.giftTimerSec > 0) return;
    const x = randRange(110, 370);
    this.giftLifeSec = 12;
    this.giftImg = this.add
      .image(x, ROOM_Y + 40, TEX.gift)
      .setScale(3)
      .setDepth(6)
      .setInteractive({ useHandCursor: true });
    this.giftImg.on("pointerdown", () => this.onGiftTap());
    this.tweens.add({
      targets: this.giftImg,
      y: FLOOR_Y - 18,
      duration: 900,
      ease: "Bounce.easeOut",
    });
  }

  private onGiftTap(): void {
    if (!this.giftImg || !this.pet || this.pet.asleep || this.gone || this.locked) return;
    const coins = randInt(3, 6);
    ProfileStore.addCoins(coins);
    this.coins += coins;
    sfxHatchPop();
    this.burst(TEX.sparkle, this.giftImg.x, this.giftImg.y - 10, 10);
    this.showTip(`礼物盒里有 ${coins} 金币！`);
    this.giftImg.destroy();
    this.giftImg = null;
    this.giftTimerSec = randRange(150, 300);
  }

  private refreshHud(): void {
    const pet = this.pet!;
    const keys: Array<"hunger" | "happy" | "energy" | "clean"> = [
      "hunger",
      "happy",
      "energy",
      "clean",
    ];
    for (const key of keys) {
      const fill = this.barFills[key];
      const v = this.statOf(key);
      fill.scaleX = Math.max(0.001, v / 100);
      fill.fillColor = v > 55 ? C.good : v > 25 ? C.mid : C.bad;
    }
    this.infoLeft?.setText(
      `${this.currentName()} · ${PERSONALITY_LABEL[pet.personality]} · ♥${bondLevelOf(pet.bond)}`,
    );
    this.infoRight?.setText(`${formatAge(this.ageDays())} · ${pet.weight.toFixed(1)}kg`);
    const filled = pet.care >= 66 ? 3 : pet.care >= 33 ? 2 : pet.care >= 12 ? 1 : 0;
    this.careHearts.forEach((h, i) => h.setTexture(i < filled ? TEX.heartS : TEX.heartS0));
    this.coinText?.setText(String(this.coins));
    if (this.sweatIcon && this.petSprite) {
      this.sweatIcon.setPosition(this.petSprite.x + 36, this.petSprite.y - 140);
      this.sweatIcon.setVisible(pet.sick && !pet.asleep);
    }
  }

  update(_time: number, delta: number): void {
    const pet = this.pet;
    if (!pet || !this.petSprite) return;
    const dt = delta / 1000;

    if (this.gone) return;

    // —— 房间漫游、小精灵、小游戏、台词 ——
    this.updateWander(dt);
    this.updateCritter(dt);
    this.miniGames.update(dt);
    this.updateSpeech(dt);
    this.updateAura(dt);
    this.updateWeather(dt);
    this.updateGift(dt);
    this.bondPatSec = Math.max(0, this.bondPatSec - dt);

    // 两帧动画：走动/追赶时切换更快
    this.frameTimer += dt;
    const frameDur = this.moveState === "walk" || this.moveState === "chase" ? 0.22 : 0.55;
    if (this.frameTimer >= frameDur) {
      this.frameTimer = 0;
      this.frame = 1 - this.frame;
      this.petSprite.setTexture(this.petTex());
    }

    // —— 属性衰减 ——
    if (pet.asleep) {
      pet.energy = clamp(pet.energy - DECAY.energyPerSecSleep * dt, 0, 100);
    } else {
      pet.energy = clamp(pet.energy - DECAY.energyPerSecAwake * dt * this.mod.energyDecay, 0, 100);
      pet.hunger = clamp(pet.hunger - DECAY.hungerPerSec * dt * this.mod.hungerDecay, 0, 100);
      pet.happy = clamp(
        pet.happy -
          (DECAY.happyPerSec * this.mod.happyDecay + (pet.sick ? DECAY.sickHappyExtra : 0)) * dt,
        0,
        100,
      );
    }
    pet.clean = clamp(
      pet.clean - (DECAY.cleanBasePerSec + pet.poops.length * DECAY.cleanPerPoopPerSec) * dt,
      0,
      100,
    );

    // 照顾分向当前状态收敛（决定进化分支）
    const careTarget = (pet.hunger + pet.happy + pet.clean) / 3;
    pet.care = clamp(pet.care + (careTarget - pet.care) * dt * 0.02, 0, 100);

    // 自动入睡 / 睡醒
    if (!pet.asleep && pet.energy <= 0) {
      this.fallAsleep(false);
      this.showTip("累得直接睡着了…");
    } else if (pet.asleep && pet.energy >= 100) {
      this.wakeUp(false);
      this.showTip("睡饱啦，精神满满！");
    }

    // —— 定时器 ——
    this.petCooldownSec = Math.max(0, this.petCooldownSec - dt);
    if (pet.asleep) {
      this.snoreSec -= dt;
      if (this.snoreSec <= 0) {
        this.snoreSec = randRange(3.5, 5.5);
        sfxSnore();
      }
    } else {
      this.poopTimerSec -= dt;
      if (this.poopTimerSec <= 0) {
        this.poopTimerSec = randRange(POOP_INTERVAL_MIN_SEC, POOP_INTERVAL_MAX_SEC);
        if (pet.poops.length < POOP_MAX) {
          this.addPoopToState();
          const latest = pet.poops[pet.poops.length - 1];
          if (latest) {
            this.addPoopView(latest);
            sfxPlop();
          }
        }
      }
      this.sickCheckSec -= dt;
      if (this.sickCheckSec <= 0) {
        this.sickCheckSec = SICK_CHECK_SEC;
        if (!pet.sick) {
          const risk =
            (pet.clean < 25 ? 1 : 0) + (pet.hunger <= 0 ? 1 : 0) + (pet.weight >= 85 ? 1 : 0);
          if (risk > 0 && Math.random() < risk * SICK_CHANCE_PER_RISK) this.becomeSick();
        }
      }
    }

    // —— 疏忽度与离家出走 ——
    if (pet.hunger <= 0 && pet.happy <= 0) {
      pet.neglectSec += dt;
    } else if (pet.sick) {
      pet.neglectSec += dt * 0.5;
    } else {
      pet.neglectSec = Math.max(0, pet.neglectSec - dt * 0.1);
    }
    NEGLECT_WARN_AT.forEach((frac, i) => {
      if (!this.neglectWarned[i] && pet.neglectSec >= NEGLECT_LIMIT_SEC * frac) {
        this.neglectWarned[i] = true;
        this.showTip("小家伙很伤心，快照顾它！", "#ff9f9f");
      }
    });
    if (pet.neglectSec >= NEGLECT_LIMIT_SEC) {
      this.runAway();
      return;
    }

    // —— 进化检查（在线跨越阈值 → 播放仪式） ——
    if (!pet.asleep && !this.locked) {
      const due = stageOfAge(this.ageDays());
      if (due !== pet.stage) this.runEvolution();
    }

    // —— 自动存档与 HUD ——
    this.saveSec -= dt;
    if (this.saveSec <= 0) {
      this.saveSec = 5;
      this.persist();
    }
    this.achSec -= dt;
    if (this.achSec <= 0) {
      this.achSec = 5;
      this.checkAchievements();
    }
    this.refreshHud();
  }
}

import Phaser from "phaser";
import { CHARACTERS } from "../data/characters";
import type { LevelConfig } from "../data/levels";
import { UPGRADE_TRACKS, type UpgradeId } from "../data/upgrades";
import { BossMK1 } from "../entities/BossMK1";
import { LavaGiant } from "../entities/LavaGiant";
import { VineTreant } from "../entities/VineTreant";
import type { Conveyor } from "../entities/Conveyor";
import type { FadingPlatform } from "../entities/FadingPlatform";
import type { LaserGate } from "../entities/LaserGate";
import { Merchant } from "../entities/Merchant";
import type { MovPlatform } from "../entities/MovPlatform";
import type { Saw } from "../entities/Saw";
import type { Updraft } from "../entities/Updraft";
import { Player } from "../entities/Player";
import { CombatSystem } from "../systems/CombatSystem";
import { floatText, slashArc } from "../systems/Fx";
import { InputManager } from "../systems/InputManager";
import type { MusicTrack } from "../systems/Music";
import { Music } from "../systems/Music";
import {
  ambientEmitter,
  dustLand,
  explosion,
  trackAmbient,
  type AmbientKind,
} from "../systems/Particles";
import { SaveManager } from "../systems/SaveManager";
import { Sfx } from "../systems/Sfx";
import { ShopController } from "../systems/ShopController";
import { castSkill } from "../systems/SkillSystem";
import { fadeIn, fadeTo } from "../systems/Transitions";
import { GAME, isCharacterId, type CharacterId, type RunStats } from "../types";
import {
  buildBackdrop,
  buildCoins,
  buildDecor,
  buildMechanisms,
  buildMerchants,
  buildTerrain,
  spawnEnemies,
} from "./LevelBuild";
import { ResultScene } from "./ResultScene";
import { TitleScene } from "./TitleScene";
import { UIScene } from "./UIScene";

const FALL_Y = 620;

/** 关卡描述符：子类只声明"哪一关"，流程代码全部在 BaseLevelScene */
export interface LevelDescriptor {
  /** 关卡序号（存档 level 字段 / HUD 与结算标题用） */
  id: number;
  L: LevelConfig;
  music: MusicTrack;
  /** 环境氛围粒子种类（视觉层） */
  ambient: AmbientKind;
  /** 通关后前往的场景 key；null = 最终关，进结算 */
  nextKey: string | null;
}

/** 关卡主场景基类：只负责流程（出生/重生/Boss 触发/通关去向），静态搭建见 LevelBuild，技能见 SkillSystem，商店见 ShopController。
 * 一/二/三关全部玩法逻辑同构，新增关卡 = 一个数据文件 + 一个薄壳子类 */
export abstract class BaseLevelScene extends Phaser.Scene {
  /** 公开字段：window.__game / E2E 断言用 */
  player!: Player;
  readonly combat = new CombatSystem();
  /** 当前 Boss（马克机体系 | 熔岩巨人 | 古藤树怪），UIScene/E2E 直接读取 */
  boss: BossMK1 | LavaGiant | VineTreant | null = null;
  checkpointX = 150;
  coins = 0;
  /** 5 秒窗口内连拾金币枚数（音高递增用），E2E 可断言 */
  coinCombo = 0;
  /** 商店状态：购买扣本局齿轮币；升级等级随存档跨关保留，清档归零 */
  shopOpen = false;
  shopIndex = 0;
  /** Boss 入场对话播放中：物理暂停、Boss 待命（E2E 断言用） */
  dialogueOpen = false;
  /** 暂停中：物理/时钟/tween 全挂起（E2E 断言用；P 切换，T 回标题保留存档） */
  pauseOpen = false;
  /** 本次进入后是否已播过 Boss 对话（死亡重试不再重播） */
  private bossDialogueSeen = false;
  /** 三轨升级等级：create 时从存档恢复（跨关/续玩保留），购买就地累加并落盘 */
  upgradeLevels: Record<UpgradeId, number> = { hp: 0, atk: 0, agi: 0 };
  /** 机关（E2E 结构断言用：movers/lasers/updrafts/fading 数量） */
  readonly movers: MovPlatform[] = [];
  readonly lasers: LaserGate[] = [];
  readonly updrafts: Updraft[] = [];
  readonly fading: FadingPlatform[] = [];
  private readonly conveyors: Conveyor[] = [];
  private readonly saws: Saw[] = [];
  private merchants: Merchant[] = [];
  private lastCoinAt = 0;
  private inputMgr!: InputManager;
  private shop!: ShopController;
  private bossSpawned = false;
  /** Boss 房封墙：物理区 + 可见屏障（暗柱 + 内缘警戒线），通关拆右墙、重试全拆 */
  private bossWalls: {
    zone: Phaser.GameObjects.Zone;
    bar: Phaser.GameObjects.Rectangle;
    line: Phaser.GameObjects.Rectangle;
  }[] = [];
  private parallaxLayers: Phaser.GameObjects.TileSprite[] = [];
  /** 关卡氛围粒子发射器（update 随镜头贴边） */
  private ambient: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private doorWarn: Phaser.GameObjects.Text | null = null;
  private runStartAt = 0;
  private hitsTaken = 0;
  private runFinished = false;
  /** 通关已触发（拾取核心）但转场尚未完成：窗口内禁止 ESC 清档，防清档后被转场存档覆盖"复活" */
  private victoryPending = false;

  constructor(key: string) {
    super(key);
  }

  /** 子类声明关卡描述符（数据 + 音乐 + 通关去向） */
  protected abstract get desc(): LevelDescriptor;

  /** 关卡序号（HUD「第 N 关」显示用） */
  get levelId(): number {
    return this.desc.id;
  }

  /** 本关配置（LevelBuild/UIScene 共用） */
  get L(): LevelConfig {
    return this.desc.L;
  }

  /** 地面顶 y（血包掉落等实体经场景字段读取，替代对具体关卡的依赖） */
  get groundTop(): number {
    return this.desc.L.groundTop;
  }

  create(): void {
    const L = this.desc.L;
    const c = CHARACTERS[this.resolveCharacterId()];
    Music.play(this.desc.music);

    // 玩家出生：?x= 调试参数 > 存档检查点 > 默认（先建玩家，地形碰撞体才能挂接）
    // config 深拷贝：补给机升级直接改副本，共享的 CHARACTERS 数据表不受污染
    const cfg = { ...c, skill: { ...c.skill } };
    const debugSpawnX = this.game.registry.get("debugSpawnX") as number | null;
    const save = SaveManager.load();
    this.checkpointX = debugSpawnX ?? save.checkpointX ?? 150;
    this.player = new Player(this, this.checkpointX, L.groundTop - 120, cfg);
    this.player.onSkill = (p, skill) => castSkill(this, p, skill);
    // 恢复已购升级：等级随存档跨关保留，把累积加成重新套到本关的 config 副本上
    // （Player 每帧读 config.speed/jumpVelocity，构造后补应用即生效，与商店内购买同路径）
    this.upgradeLevels = { ...save.upgrades };
    for (const track of UPGRADE_TRACKS) {
      for (let i = 0; i < save.upgrades[track.id]; i++) track.apply(this.player);
    }

    this.parallaxLayers = buildBackdrop(this, L);
    buildTerrain(this, this.player, L);
    buildMechanisms(
      this,
      this.player,
      L,
      {
        conveyors: this.conveyors,
        saws: this.saws,
        movers: this.movers,
        lasers: this.lasers,
        updrafts: this.updrafts,
        fading: this.fading,
      },
      (x) => {
        this.checkpointX = x;
        SaveManager.update((d) => {
          d.checkpointX = x;
        });
      },
    );
    this.doorWarn = buildDecor(this, L);
    buildCoins(this, this.player, L, () => this.registerCoin());
    spawnEnemies(this, this.combat, L.spawns);
    this.merchants = buildMerchants(this, L);

    this.events.on("player-death", () => {
      // 死亡爆裂：白红碎屑 + 上升黑烟（坐标先取，重生会移动玩家）
      const px = this.player.x;
      const py = this.player.y - 14;
      explosion(this, px, py, {
        tints: [0xffffff, 0xff6b5e, 0xff9f1a],
        count: 16,
        speed: [60, 200],
        life: [360, 680],
      });
      explosion(this, px, py, {
        tints: [0x4a4a52, 0x6a6a72],
        count: 5,
        speed: [14, 40],
        angle: [250, 290],
        life: [500, 850],
        gravityY: -70,
        alpha: 0.55,
        scale: 1.6,
      });
      this.respawnAtCheckpoint();
    });
    this.events.on("player-damaged", () => {
      this.hitsTaken += 1;
    });
    this.events.on("boss-defeated", () => this.onBossDefeated());
    // 大落差落地：闷响 + 三扇尘土（小跳不触发，阈值按下落速度）
    this.events.on("player-land", (fallVy: number) => {
      if (fallVy < 520) return;
      Sfx.land();
      dustLand(this, this.player.x, this.player.y);
    });

    this.runStartAt = this.time.now;
    this.combat.attach(this);
    this.scene.launch(UIScene.KEY);
    fadeIn(this);

    this.cameras.main.setBounds(0, 0, L.worldWidth, GAME.height);
    // 像素化：zoom 2 渲染，可视世界 480×270，纹理 1 像素呈 2×2 硬边块
    this.cameras.main.setZoom(GAME.zoom);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    // 环境氛围粒子：镜头就位后预推进一个最长寿命，开场即满屏
    this.ambient = ambientEmitter(this, this.desc.ambient);
    trackAmbient(this.ambient, this.cameras.main.worldView);
    this.ambient.fastForward(11000);

    this.inputMgr = new InputManager(this);
    this.shop = new ShopController(this, this.inputMgr);
    this.events.on("player-attack", (p: Player) => this.showAttackSwing(p));

    const kb = this.input.keyboard;
    if (kb) {
      // P：暂停/继续（商店与对话中不响应）；暂停面板内 T 回标题保留存档
      kb.on("keydown-P", () => {
        if (this.shopOpen || this.dialogueOpen) return;
        if (this.pauseOpen) this.resumeGame();
        else this.pauseGame();
      });
      kb.on("keydown-T", () => {
        if (!this.pauseOpen) return;
        this.resumeGame();
        this.scene.stop(UIScene.KEY);
        fadeTo(this, TitleScene.KEY);
      });
      // ESC：暂停中忽略（面板出口是 P/T）；对话中仅跳过；商店开启时仅关闭；
      // 通关转场窗口内忽略（防清档被随后的转场存档覆盖）；否则清空存档并回标题
      kb.on("keydown-ESC", () => {
        if (this.pauseOpen || this.victoryPending) return;
        // 对话中 ESC 仅跳过对话（避免误清档回标题）
        if (this.dialogueOpen) {
          this.closeBossDialogue();
          return;
        }
        if (this.shopOpen) {
          this.shop.close();
          return;
        }
        SaveManager.clear();
        floatText(this, this.player.x, this.player.y - 56, "存档已清空", {
          color: "#ff6b5e",
          size: 15,
          duration: 400,
          rise: 16,
        });
        this.scene.stop(UIScene.KEY);
        fadeTo(this, TitleScene.KEY);
      });
    }
  }

  /** 本局用时（UIScene 计时显示用） */
  get elapsedMs(): number {
    return this.time.now - this.runStartAt;
  }

  /** 金币计数与连击窗口（拾取视觉在 LevelBuild.buildCoins） */
  private registerCoin(): void {
    this.coins += 1;
    this.coinCombo = this.time.now - this.lastCoinAt < 5000 ? this.coinCombo + 1 : 0;
    this.lastCoinAt = this.time.now;
    Sfx.coinCombo(this.coinCombo);
  }

  /** 是否处于任一补给机交互半径（±70）内 */
  nearMerchant(): boolean {
    return this.merchants.some((m) => Math.abs(this.player.x - m.x0) < 70);
  }

  // ---- 暂停 ----

  /** P 暂停：物理 + 时钟（delayedCall 全停）+ tween 三层挂起；Clock 暂停期间 now 不走，计时天然不含暂停时长 */
  private pauseGame(): void {
    this.pauseOpen = true;
    this.physics.world.pause();
    this.time.paused = true;
    this.tweens.pauseAll();
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    Sfx.pauseOpen();
    this.hud.showPause(true);
  }

  private resumeGame(): void {
    if (!this.pauseOpen) return;
    this.pauseOpen = false;
    this.hud.showPause(false);
    this.physics.world.resume();
    this.time.paused = false;
    this.tweens.resumeAll();
    Sfx.pauseClose();
  }

  // ---- Boss 入场对话 ----

  /** 对话中由 update 转发：Q/ESC 跳过（ESC 在 keydown 分流），E/J/跳 推进 */
  private handleDialogueInput(): void {
    if (this.inputMgr.cancelJustDown()) {
      this.closeBossDialogue();
      return;
    }
    if (
      this.inputMgr.interactJustDown() ||
      this.inputMgr.attackJustDown() ||
      this.inputMgr.jumpJustDown()
    ) {
      if (this.hud.dialogue.advance()) Sfx.dialogBlip();
      else this.closeBossDialogue();
    }
  }

  /** Boss 落地待命后打开对话面板（物理暂停；面板显隐/推进在 DialogueBox，流程在此） */
  private openBossDialogue(): void {
    if (this.runFinished || !this.boss) return;
    this.bossDialogueSeen = true;
    this.dialogueOpen = true;
    this.physics.world.pause();
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.hud.dialogue.start(this.desc.L.boss.dialogue, {
      bossName: this.desc.L.boss.name,
      playerName: this.player.config.name,
      charId: this.player.config.id,
    });
    Sfx.dialogBlip();
  }

  /** 收面板：恢复物理并放行 Boss 开战 */
  private closeBossDialogue(): void {
    if (!this.dialogueOpen) return;
    this.dialogueOpen = false;
    this.hud.dialogue.hide();
    this.physics.world.resume();
    this.boss?.beginBattle();
  }

  update(time: number, delta: number): void {
    const L = this.desc.L;
    if (this.pauseOpen) {
      // 暂停：物理/时钟/tween 已全挂起，无任何玩法处理
    } else if (this.shopOpen) {
      // 商店中：物理已暂停，只处理商店菜单（防 Boss 战/敌人伤害的"无敌购物"——补给机均在安全凹角）
      this.shop.handleInput();
    } else if (this.dialogueOpen) {
      // 对话中：物理已暂停，只处理推进/跳过
      this.handleDialogueInput();
    } else {
      if (this.nearMerchant() && this.inputMgr.interactJustDown()) this.shop.open();
      this.player.tick(this.inputMgr, time);
      for (const belt of this.conveyors) belt.apply(this.player, delta);
      for (const saw of this.saws) saw.tick(this.player, time);
      for (const mover of this.movers) mover.tick(time);
      for (const laser of this.lasers) laser.tick(this.player, time);
      for (const updraft of this.updrafts) updraft.tick(this.player, delta);
      this.combat.update(this.player, time, delta);
      if (!this.bossSpawned && this.player.x > L.doorX + 40) this.spawnBoss();
      if (this.player.y > FALL_Y) this.respawnAtCheckpoint();
    }
    // 视差层：世界锚定贴相机可视区（zoom 下 scrollFactor(0) 会被缩放，改用 worldView 逐帧贴边）
    const view = this.cameras.main.worldView;
    if (this.parallaxLayers[0]) {
      this.parallaxLayers[0].setPosition(view.x, view.bottom - 240);
      this.parallaxLayers[0].tilePositionX = view.x * 0.25;
    }
    if (this.parallaxLayers[1]) {
      this.parallaxLayers[1].setPosition(view.x, view.bottom - 130);
      this.parallaxLayers[1].tilePositionX = view.x * 0.5;
    }
    // 氛围发射区贴边当前可视区
    if (this.ambient) trackAmbient(this.ambient, view);
  }

  // ---- 补给机商店（行为在 ShopController，此处只暴露宿主接口成员） ----

  /** 商店面板所在 HUD 层（ShopHost 接口成员） */
  get hud(): UIScene {
    return this.scene.get(UIScene.KEY) as UIScene;
  }

  /** ?char= 调试参数优先（E2E 直达），其次选角传参，最后存档 */
  private resolveCharacterId(): CharacterId {
    const debugChar = this.game.registry.get("debugChar");
    if (isCharacterId(debugChar)) return debugChar;
    const data = this.scene.settings.data as { characterId?: CharacterId } | undefined;
    if (data && isCharacterId(data.characterId)) return data.characterId;
    return SaveManager.load().lastCharacter ?? "tiger";
  }

  /** Boss 通关去向：前置关推进存档进入下一关（HUD 存活自动重绑），最终关进结算 */
  private onBossDefeated(): void {
    Music.play("victory");
    // 通关即进入转场窗口：此窗口内 ESC 不清档（否则清档后会被下方转场存档覆盖）
    this.victoryPending = true;
    // 通关开门：拆 Boss 房右墙（物理区 + 屏障视觉）+ 核心区光圈脉冲 + 金色喷泉粒子
    const rightWall = this.bossWalls.pop();
    if (rightWall) {
      rightWall.zone.destroy();
      rightWall.bar.destroy();
      rightWall.line.destroy();
    }
    const ring = this.add
      .circle(this.desc.L.coreX, this.desc.L.groundTop - 12, 20)
      .setStrokeStyle(3, 0xffd23e, 0.8);
    this.tweens.add({
      targets: ring,
      radius: 34,
      alpha: 0.2,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });
    explosion(this, this.desc.L.coreX, this.desc.L.groundTop - 10, {
      tints: [0xffd23e, 0xffe9a0, 0xffffff, 0xff9f1a],
      count: 26,
      speed: [130, 280],
      angle: [235, 305],
      life: [700, 1200],
      gravityY: 440,
    });
    this.time.delayedCall(900, () => {
      if (this.runFinished) return;
      if (this.desc.nextKey) {
        // 前置关：推进存档（关卡序号+1、检查点作废）并直接进入下一关（HUD 存活自动重绑）
        this.runFinished = true;
        SaveManager.update((d) => {
          d.level = this.desc.id + 1;
          d.checkpointX = null;
        });
        fadeTo(this, this.desc.nextKey);
      } else {
        // 最终关：进结算（runFinished 守卫在 finishRun 内）
        this.finishRun();
      }
    });
  }

  /** 通关结算：停 HUD，携带 RunStats 进入结算场景 */
  private finishRun(): void {
    if (this.runFinished) return;
    this.runFinished = true;
    const stats: RunStats = {
      characterId: this.player.config.id,
      levelId: this.desc.id,
      timeMs: this.time.now - this.runStartAt,
      hitsTaken: this.hitsTaken,
      coins: this.coins,
      victory: true,
    };
    this.scene.stop(UIScene.KEY);
    fadeTo(this, ResultScene.KEY, stats);
  }

  /** 死亡/坠落闭环：检查点重生 + 小怪与弹幕全量重置；Boss 战则退出 Boss 房重置 Boss */
  private respawnAtCheckpoint(): void {
    const L = this.desc.L;
    this.combat.resetTimeScale();
    this.combat.clearEnemies();
    this.combat.clearProjectiles();
    spawnEnemies(this, this.combat, L.spawns);
    if (this.bossSpawned) {
      this.bossSpawned = false;
      this.boss = null;
      Music.play(this.desc.music);
      this.cameras.main.setBounds(0, 0, L.worldWidth, GAME.height);
      for (const w of this.bossWalls) {
        w.zone.destroy();
        w.bar.destroy();
        w.line.destroy();
      }
      this.bossWalls = [];
    }
    this.player.reviveAt(this.checkpointX, L.groundTop - 120);
    this.cameras.main.flash(160, 30, 30, 30);
  }

  /** 入场 Boss 房：锁相机 + 封墙 + Boss 空降出场 */
  private spawnBoss(): void {
    const L = this.desc.L;
    this.bossSpawned = true;
    this.doorWarn?.destroy();
    this.doorWarn = null;
    const room = L.boss.room;
    this.cameras.main.setBounds(room.x0, 0, room.x1 - room.x0, GAME.height);
    for (const wx of [room.x0 - 12, room.x1]) {
      const wall = this.add.zone(wx, 0, 12, GAME.height).setOrigin(0);
      this.physics.add.existing(wall, true);
      this.physics.add.collider(this.player, wall);
      // 屏障视觉：墙区在相机界外（左墙 < 相机左界、右墙 > 相机右界），故暗柱/警戒线画在房间内侧
      // 一格内，否则永远不可见，隐形墙在画面边缘会被当成"卡进地形"
      const isRight = wx === room.x1;
      const bar = this.add
        .rectangle(isRight ? room.x1 - 12 : room.x0, 0, 12, GAME.height, 0x0c0e14, 0.72)
        .setOrigin(0)
        .setDepth(-8);
      const line = this.add
        .rectangle(isRight ? room.x1 - 16 : room.x0 + 8, 0, 4, GAME.height, 0xffd23e, 0.55)
        .setOrigin(0)
        .setDepth(-8);
      this.tweens.add({
        targets: line,
        alpha: 0.3,
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
      this.bossWalls.push({ zone: wall, bar, line });
    }
    const boss =
      L.boss.kind === "lavaGiant"
        ? new LavaGiant(this, L.boss.x, L.boss.y, L.boss)
        : L.boss.kind === "vineTreant"
          ? new VineTreant(this, L.boss.x, L.boss.y, L.boss)
          : new BossMK1(this, L.boss.x, L.boss.y, L.boss);
    boss.once(Phaser.GameObjects.Events.DESTROY, () => {
      if (this.boss === boss) this.boss = null;
    });
    this.combat.addEnemy(boss);
    this.boss = boss;
    if (L.boss.dialogue && !this.bossDialogueSeen) {
      // 首次进入：落地待命（Boss 保持 intro 不选招），待命事件就位后开对话，对话结束经 beginBattle 放行。
      // 死亡重试不再重播（bossDialogueSeen），直接开打
      boss.beginIntro(true);
      this.events.once("boss-intro-held", () => this.openBossDialogue());
    } else {
      boss.beginIntro();
    }
    Music.play("boss");
  }

  /** 普攻：大幅月牙斩击扫过 + 近战矩形判定；命中时镜头微震（伤害火花在 Enemy.hit 内统一结算） */
  private showAttackSwing(player: Player): void {
    slashArc(this, player.x + player.facing * 16, player.y - 24, player.facing);

    const box = new Phaser.Geom.Rectangle(
      player.x + (player.facing > 0 ? 6 : -46),
      player.y - 38,
      40,
      36,
    );
    const hits = this.combat.meleeHit(box, player.config.attackDamage);
    if (hits > 0) this.cameras.main.shake(80, 0.005);
  }
}

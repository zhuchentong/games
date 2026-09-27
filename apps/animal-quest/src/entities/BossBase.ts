import Phaser from "phaser";
import type { BossDef, BossPhaseDef } from "../data/boss";
import { BossPhaseMachine } from "../systems/BossPhase";
import { SaveManager } from "../systems/SaveManager";
import { Sfx } from "../systems/Sfx";
import { banner, burst, flashTint, floatText, hitSpark } from "../systems/Fx";
import { DEPTH } from "../types";
import { Enemy } from "./Enemy";
import type { Player } from "./Player";

type BossMode = "intro" | "active" | "stunned" | "dying";

/** 弱点规格：贴图偏移、命中判定窗口、命中飘字（按 Boss 贴图在子类声明） */
export interface BossCoreSpec {
  /** 弱点中心相对精灵中心的横向偏移（随朝向镜像） */
  offsetX: number;
  /** 弱点中心相对精灵中心的纵向偏移 */
  offsetY: number;
  /** 判定为弱点命中的距离窗口 */
  hitWindow: number;
  /** 弱点命中飘字（弱点!/熔核!） */
  label: string;
}

/**
 * Boss 公共框架（CRTP：B 为具体 Boss 类型，供招式表 exec 绑定）：
 * 出场演出/入场对话待命、阶段机与选招、过热虚弱与弱点命中结算、死亡演出与核心掉落。
 * 子类只提供：弱点/几何/配色规格、每帧活跃期行为 doTickActive、招式实现。
 */
export abstract class BossBase<B extends BossBase<B>> extends Enemy {
  protected readonly def: BossDef;
  protected readonly machine: BossPhaseMachine<B>;
  private readonly coreImg: Phaser.GameObjects.Image;
  private readonly moveCd = new Map<string, number>();
  protected mode: BossMode = "intro";
  protected nextPickAt = 0;
  protected coreExposed = false;
  protected stunUntil = 0;
  protected playerRef: Player | null = null;
  private victoryDone = false;

  protected constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    def: BossDef,
    phases: BossPhaseDef<B>[],
  ) {
    super(scene, x, y, def.texture, def.maxHp, def.contactDamage);
    this.def = def;
    this.machine = new BossPhaseMachine<B>(phases);
    this.setDepth(DEPTH.boss);
    this.coreImg = scene.add
      .image(x, y, this.coreTexture)
      .setVisible(false)
      .setDepth(DEPTH.bossCore);
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.coreImg.destroy());
  }

  /** 弱点贴图（机甲/巨人金色核心；异色弱点由子类覆写，如树怪的荧光树心） */
  protected get coreTexture(): string {
    return "boss-core";
  }

  protected abstract get coreSpec(): BossCoreSpec;

  /** 精灵半高（核心掉落贴地等几何换算） */
  protected abstract get halfHeight(): number;

  /** P3 泛光染色 */
  protected abstract get p3Tint(): number;

  /** 死亡碎裂爆闪颜色 */
  protected abstract get deathBurstColor(): number;

  /** 活跃期每帧行为（机甲=冲撞位移；巨人=逼近行走），选招由基类在其后调用 */
  protected abstract doTickActive(player: Player, time: number, delta: number): void;

  /** 死亡时的额外演出（子类钩子，默认无） */
  protected deathExtraFx(): void {}

  get phaseIndex(): number {
    return this.machine.phaseIndex;
  }

  /** 是否处于可交战状态（出场演出/死亡演出期间 false，UIScene Boss 血条用） */
  get engaged(): boolean {
    return this.mode === "active" || this.mode === "stunned";
  }

  /** 出场演出：空降 + 震屏 + 报名；holdForDialogue=true 时落地后待命（入场对话），由 beginBattle 放行 */
  beginIntro(holdForDialogue = false): void {
    const scene = this.scene;
    this.setPosition(this.def.x, -160);
    scene.tweens.add({
      targets: this,
      y: this.def.y,
      duration: 850,
      ease: "Bounce.Out",
      onComplete: () => {
        // 玩家死亡重置会销毁 Boss（tween 随场景存活），此时不再震屏
        if (this.active) scene.cameras.main.shake(280, 0.013);
      },
    });
    // y 340：zoom 像素化后可视世界 y ∈ (270,540)，横幅须落在天际带内
    banner(scene, this.def.x, 340, this.def.name, {
      color: "#ff6b5e",
      size: 34,
      fadeInMs: 300,
      holdMs: 900,
    });
    scene.time.delayedCall(1500, () => {
      if (!this.dead && this.active) {
        if (holdForDialogue) {
          // 待命：模式保持 intro（不交战/不选招/血条不显示），对话结束由场景调 beginBattle
          scene.events.emit("boss-intro-held");
        } else {
          this.mode = "active";
          this.nextPickAt = scene.time.now + 600;
        }
      }
    });
  }

  /** 入场对话结束：Boss 开始行动（仅待命态有效） */
  beginBattle(): void {
    if (this.dead || !this.active || this.mode !== "intro") return;
    this.mode = "active";
    this.nextPickAt = this.scene.time.now + 600;
  }

  tick(player: Player, time: number, delta: number): void {
    if (this.mode === "dying") return;
    this.playerRef = player;
    this.setFlipX(player.x < this.x);
    const coreActive = this.coreExposed || this.machine.phaseIndex === 2;
    this.coreImg.setVisible(coreActive).setPosition(this.coreX(), this.y + this.coreSpec.offsetY);

    if (this.mode === "intro") return;

    // 调试经 __game 直改 hp 也能正确切阶段/触发死亡（正常游玩恒无操作）
    const jumped = this.machine.onHpFraction(this.hp / this.def.maxHp);
    if (jumped > 0) this.onPhaseChange(jumped);
    if (this.hp <= 0 && !this.dead) {
      this.startDeath();
      return;
    }

    if (this.mode === "stunned") {
      if (time >= this.stunUntil) {
        this.coreExposed = false;
        this.mode = "active";
        this.nextPickAt = time + 400;
      }
      return;
    }

    this.doTickActive(player, time, delta);
  }

  /** 命中结算：虚弱/P3 期间打中弱点位置伤害 ×2；跨阈值切阶段；归零走死亡演出 */
  hit(damage: number, fromX?: number): void {
    if (this.dead || this.mode === "intro" || this.mode === "dying") return;

    let dmg = damage;
    const spec = this.coreSpec;
    const coreActive = this.coreExposed || this.machine.phaseIndex === 2;
    const coreHit =
      coreActive && fromX !== undefined && Math.abs(fromX - this.coreX()) < spec.hitWindow;
    if (coreHit) {
      dmg *= this.def.coreMultiplier;
      floatText(this.scene, this.coreX(), this.y - 72, spec.label, {
        color: "#ffd23e",
        size: 16,
        rise: 26,
      });
    }
    this.floatText(`-${dmg}`, coreHit ? "#ffd23e" : "#ffffff");

    this.hp = Math.max(0, this.hp - dmg);
    hitSpark(this.scene, coreHit ? this.coreX() : this.x, this.y - 42, {
      scale: coreHit ? 2 : 1.5,
    });
    flashTint(this, 0xffffff, 60);

    const jumped = this.machine.onHpFraction(this.hp / this.def.maxHp);
    if (jumped > 0) this.onPhaseChange(jumped);

    if (this.hp <= 0) this.startDeath();
  }

  // ---------- 内部 ----------

  protected guard(): boolean {
    return this.active && !this.dead && this.mode !== "dying";
  }

  protected facingDir(): 1 | -1 {
    return this.flipX ? -1 : 1;
  }

  protected coreX(): number {
    return this.flipX ? this.x - this.coreSpec.offsetX : this.x + this.coreSpec.offsetX;
  }

  /** 选招：阶段内就绪招式随机挑一个，执行后登记占用与冷却 */
  protected pickMove(player: Player, time: number): void {
    const phase = this.machine.current;
    const ready = phase.moves.filter((m) => (this.moveCd.get(m.name) ?? 0) <= time);
    if (ready.length === 0) {
      this.nextPickAt = time + 200;
      return;
    }
    const move = ready[Math.floor(Math.random() * ready.length)];
    // CRTP 约定：B 即运行时的具体子类类型，招式表 exec 绑定的正是 this
    const duration = move.exec(this as unknown as B, player);
    this.moveCd.set(move.name, time + duration + move.cooldownMs);
    this.nextPickAt = time + duration + phase.globalCooldownMs;
  }

  private onPhaseChange(index: number): void {
    this.moveCd.clear();
    this.mode = "active";
    this.coreExposed = false;
    this.nextPickAt = this.scene.time.now + 1300;
    Sfx.phase();
    Sfx.bossRoar();
    this.scene.cameras.main.shake(240, 0.01);
    if (index === 2) this.setTint(this.p3Tint);
    banner(this.scene, this.def.x, 330, `警告：阶段 ${index + 1}`, { color: "#ff3b30", size: 26 });
  }

  private startDeath(): void {
    this.mode = "dying";
    this.dead = true;
    this.coreExposed = false;
    this.coreImg.setVisible(false);
    this.clearTint();
    this.scene.cameras.main.shake(500, 0.015);
    for (let i = 0; i < 6; i++) {
      this.scene.time.delayedCall(160 * i, () => {
        if (!this.active) return;
        burst(
          this.scene,
          this.x + Phaser.Math.Between(-48, 48),
          this.y + Phaser.Math.Between(-46, 46),
          {
            count: 1,
            color: this.deathBurstColor,
            size: 9,
            grow: 54,
            duration: 320,
            spreadX: 0,
            spreadY: 0,
          },
        );
      });
    }
    this.deathExtraFx();
    this.scene.time.delayedCall(980, () => {
      if (this.active) {
        this.scene.tweens.add({ targets: this, alpha: 0, duration: 380 });
      }
    });
    this.scene.time.delayedCall(1450, () => {
      this.spawnCorePickup();
      this.destroy();
    });
  }

  /** 掉落核心拾取物（拾取事件交场景决定去向；最终关 clearsGame 写通关存档） */
  private spawnCorePickup(): void {
    // Boss 随后即 destroy，回调一律用捕获的 scene 引用（this.scene 会被置空）
    const scene = this.scene;
    const player = this.playerRef;
    if (!player) return;
    const groundY = this.def.y + this.halfHeight;
    const item = scene.add.image(this.x, groundY - 12, "core-item").setDepth(DEPTH.items);
    scene.tweens.add({
      targets: item,
      y: groundY - 20,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
    const zone = scene.add.zone(this.x, groundY - 30, 46, 70);
    scene.physics.add.existing(zone, true);
    scene.physics.add.overlap(player, zone, () => {
      if (this.victoryDone) return;
      this.victoryDone = true;
      zone.destroy();
      if (this.def.clearsGame) {
        SaveManager.update((d) => {
          d.cleared = true;
        });
      }
      floatText(scene, player.x, player.y - 70, this.def.victoryText, {
        color: "#ffd23e",
        size: 22,
        bold: true,
        depth: DEPTH.overlay,
        duration: 1400,
        rise: 24,
      });
      scene.events.emit("boss-defeated", this);
    });
  }
}

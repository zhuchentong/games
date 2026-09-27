import Phaser from "phaser";
import { Sfx } from "../systems/Sfx";
import { charAnim } from "../systems/Textures";
import { afterimage, burst, flashTint, floatText } from "../systems/Fx";
import { dust } from "../systems/Particles";
import type { InputManager } from "../systems/InputManager";
import { DEPTH, type CharacterConfig, type SkillConfig } from "../types";

/** 技能实现由场景注入（视觉/伤害结算），Player 只负责冷却与触发 */
export type SkillHandler = (player: Player, skill: SkillConfig) => void;

const INVULNERABLE_MS = 1000;
const KNOCKBACK_X = 200;
const KNOCKBACK_Y = -220;
const GLIDE_FALL_MAX = 90;
const DASH_MS = 180;
const DASH_SPEED = 640;
/** 翻滚：时长=无敌窗口，独立冷却防连续无敌 */
const ROLL_MS = 280;
const ROLL_SPEED = 460;
const ROLL_CD_MS = 1000;
/** 翻滚残影间隔 */
const TRAIL_EVERY_MS = 60;
/** 离开平台后仍可起跳的宽限窗口 */
const COYOTE_MS = 100;
/** 落地前按跳的预输入缓存窗口 */
const JUMP_BUFFER_MS = 100;

/** 玩家实体：移动/跳跃/普攻/技能/受击；被动差异全部来自 CharacterConfig */
export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly config: CharacterConfig;
  hp: number;
  /** 公开调试字段：__game / E2E 断言用 */
  jumpCount = 0;
  now = 0;
  nextAttackOkAt = 0;
  nextSkillOkAt = 0;
  readonly rollCooldownMs = ROLL_CD_MS;
  onSkill: SkillHandler | null = null;

  facing: 1 | -1 = 1;
  private dashUntil = 0;
  private rollUntil = 0;
  private rollCdUntil = 0;
  private lastTrailAt = 0;
  private lastDodgeTextAt = -1e9;
  private invulnerableUntil = 0;
  private attackAnimUntil = 0;
  private lastOnFloorAt = -1e9;
  /** 奔跑扬尘限频 */
  private lastRunDustAt = -1e9;
  /** 落地检测：上一帧是否在地面 + 离地期间的下落速度（player-land 事件用） */
  private wasOnFloor = false;
  private lastFallVy = 0;
  private jumpPressedAt = -1e9;
  /** 岩石护盾：期间 damage() 完全格挡 */
  private shieldUntil = 0;
  private shieldFx: Phaser.GameObjects.Arc | null = null;
  private lastBlockAt = -1e9;

  constructor(scene: Phaser.Scene, x: number, y: number, config: CharacterConfig) {
    super(scene, x, y, config.texture);
    this.config = config;
    this.hp = config.hp;
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(18, 30).setOffset(5, 6);
  }

  /** 每帧由场景驱动 */
  tick(input: InputManager, time: number): void {
    this.now = time;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const onFloor = body.blocked.down || body.touching.down;
    if (onFloor) {
      this.jumpCount = 0;
      this.lastOnFloorAt = time;
    }
    if (!onFloor) this.lastFallVy = body.velocity.y;
    if (onFloor && !this.wasOnFloor) this.scene.events.emit("player-land", this.lastFallVy);
    this.wasOnFloor = onFloor;

    const axis = input.axisX();
    if (input.rollJustDown() && time >= this.rollCdUntil && time >= this.dashUntil) {
      this.startRoll(time, axis !== 0 ? (axis > 0 ? 1 : -1) : this.facing);
    }

    if (time < this.rollUntil) {
      // 翻滚中：保持翻滚速度与压扁姿态，间歇残影；跳过操控/跳跃/攻击/技能
      if (time - this.lastTrailAt >= TRAIL_EVERY_MS) {
        this.lastTrailAt = time;
        afterimage(this.scene, this, { tint: 0x9be8ff, alpha: 0.4, duration: 180 });
      }
    } else if (time < this.dashUntil) {
      // 突进中：保持脉冲速度，跳过常规操控
    } else {
      body.setVelocityX(axis * this.config.speed);
      if (axis !== 0) this.facing = axis > 0 ? 1 : -1;
      if (this.scaleX !== 1 || this.scaleY !== 1) this.setScale(1, 1);
      // 奔跑扬尘：地面移动时限频小簇（身后扇形）
      if (axis !== 0 && onFloor && time - this.lastRunDustAt >= 170) {
        this.lastRunDustAt = time;
        dust(this.scene, this.x - this.facing * 6, this.y, 3, [
          this.facing > 0 ? 150 : -30,
          this.facing > 0 ? 210 : 30,
        ]);
      }
    }
    this.setFlipX(this.facing < 0);

    // 跳跃 / 二段跳（蛙）：土狼时间（离地 80ms 内仍可跳）+ 跳跃缓冲（落地前 100ms 按跳缓存）
    if (input.jumpJustDown()) this.jumpPressedAt = time;
    if (time - this.jumpPressedAt <= JUMP_BUFFER_MS) {
      const coyoteOk = time - this.lastOnFloorAt <= COYOTE_MS;
      if (onFloor || (coyoteOk && this.jumpCount === 0)) {
        body.setVelocityY(-this.config.jumpVelocity);
        this.jumpCount = 1;
        this.jumpPressedAt = -1e9;
        dust(this.scene, this.x, this.y, 3, [230, 310]);
        Sfx.jump();
      } else if (this.config.doubleJump && this.jumpCount < 2) {
        body.setVelocityY(-this.config.jumpVelocity * 0.92);
        this.jumpCount = 2;
        this.jumpPressedAt = -1e9;
        dust(this.scene, this.x, this.y - 6, 3, [0, 360]);
        Sfx.jump();
      }
    }

    // 滑翔（鸟）：空中下落时按住跳跃键，钳制下落速度
    if (this.config.glide && !onFloor && body.velocity.y > 0 && input.jumpHeld()) {
      body.setVelocityY(Math.min(body.velocity.y, GLIDE_FALL_MAX));
    }

    if (input.attackJustDown() && time >= this.nextAttackOkAt) {
      this.nextAttackOkAt = time + this.config.attackIntervalMs;
      this.attackAnimUntil = time + 250;
      Sfx.attack();
      this.scene.events.emit("player-attack", this);
    }

    if (input.skillJustDown() && time >= this.nextSkillOkAt && this.onSkill) {
      this.nextSkillOkAt = time + this.config.skill.cooldownMs;
      Sfx.skill();
      this.onSkill(this, this.config.skill);
    }

    this.updateInvulnerabilityVisual(time);
    this.updateShieldVisual(time);
    this.updateAnim(time, onFloor, Math.abs(body.velocity.x) > 20, body.velocity.y < 0);
  }

  /** 岩石护盾：durationMs 内 damage() 完全格挡（不触发无敌帧/击退） */
  applyShield(time: number, durationMs: number): void {
    this.shieldUntil = time + durationMs;
  }

  /** 翻滚：方向短冲刺 + ROLL_MS 无敌窗口 + 压扁姿态；地面/空中均可 */
  private startRoll(time: number, dir: 1 | -1): void {
    this.rollUntil = time + ROLL_MS;
    this.rollCdUntil = time + ROLL_CD_MS;
    this.facing = dir;
    (this.body as Phaser.Physics.Arcade.Body).setVelocityX(dir * ROLL_SPEED);
    this.setScale(1.25, 0.7);
    Sfx.roll();
    burst(this.scene, this.x, this.y, {
      color: 0xc8d2e0,
      count: 5,
      size: 2,
      grow: 5,
      duration: 200,
      spreadX: 8,
      spreadY: 2,
    });
  }

  /** 护盾视觉：金色气泡跟随玩家，临期脉冲；过期销毁 */
  private updateShieldVisual(time: number): void {
    if (time < this.shieldUntil) {
      if (!this.shieldFx) {
        this.shieldFx = this.scene.add
          .circle(this.x, this.y - 18, 26)
          .setFillStyle(0xffd23e, 0.08)
          .setStrokeStyle(3, 0xffd23e, 0.85)
          .setDepth(DEPTH.fx);
      }
      this.shieldFx.setPosition(this.x, this.y - 18);
      this.shieldFx.setAlpha(0.65 + Math.sin(time / 90) * 0.25);
    } else if (this.shieldFx) {
      this.shieldFx.destroy();
      this.shieldFx = null;
    }
  }

  /** 动画状态机：攻击（一次性）> 空中（上升 jump / 下落 fall）> 地面移动（run）> 待机 */
  private updateAnim(time: number, onFloor: boolean, moving: boolean, rising: boolean): void {
    const id = this.config.id;
    if (time < this.attackAnimUntil) {
      this.play(charAnim(id, "atk"), true);
    } else if (!onFloor) {
      this.play(charAnim(id, rising ? "jump" : "fall"), true);
    } else if (moving) {
      this.play(charAnim(id, "run"), true);
    } else {
      this.play(charAnim(id, "idle"), true);
    }
  }

  /** 受击：翻滚闪避 > 护盾格挡 > 无敌帧 + 红闪 + 击退；hp 归零时发 player-death 事件（场景负责重生流程） */
  damage(amount: number, fromX: number): void {
    if (this.hp <= 0) return;
    if (this.now < this.rollUntil) {
      // 翻滚无敌窗口：完全规避（不触发无敌帧/击退）；反馈限频 500ms
      if (this.now - this.lastDodgeTextAt > 500) {
        this.lastDodgeTextAt = this.now;
        burst(this.scene, this.x, this.y - 18, {
          color: 0x8fd9ff,
          count: 3,
          size: 2,
          grow: 7,
          duration: 180,
          spreadX: 6,
          spreadY: 6,
        });
        floatText(this.scene, this.x, this.y - this.displayHeight - 12, "闪避", {
          color: "#8fd9ff",
        });
      }
      return;
    }
    if (this.now < this.shieldUntil) {
      // 护盾格挡：完全免疫；反馈限频 500ms 防触摸重叠每帧刷屏
      if (this.now - this.lastBlockAt > 500) {
        this.lastBlockAt = this.now;
        burst(this.scene, this.x, this.y - 18, {
          color: 0xffd23e,
          count: 3,
          size: 2,
          grow: 7,
          duration: 180,
          spreadX: 6,
          spreadY: 6,
        });
        floatText(this.scene, this.x, this.y - this.displayHeight - 12, "免疫", {
          color: "#ffd23e",
        });
      }
      return;
    }
    if (this.now < this.invulnerableUntil) return;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableUntil = this.now + INVULNERABLE_MS;
    Sfx.hurt();
    const dir = this.x >= fromX ? 1 : -1;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(dir * KNOCKBACK_X, KNOCKBACK_Y);
    flashTint(this, 0xff6b5e, 120);
    floatText(this.scene, this.x, this.y - this.displayHeight - 12, `-${amount}`, {
      color: "#ff8a80",
      bold: true,
    });
    this.scene.events.emit("player-damaged", this);
    if (this.hp <= 0) this.scene.events.emit("player-death", this);
  }

  /** 无敌帧剩余中（UIScene 红闪轮询用） */
  get invulnerable(): boolean {
    return this.now < this.invulnerableUntil;
  }

  /** 死亡/坠落重生：回满血、复位并给予短暂无敌帧 */
  reviveAt(x: number, y: number): void {
    this.hp = this.config.hp;
    (this.body as Phaser.Physics.Arcade.Body).reset(x, y);
    this.clearTint();
    this.setAlpha(1);
    this.setScale(1, 1);
    this.rollUntil = 0;
    this.invulnerableUntil = this.now + 1800;
    this.shieldUntil = 0;
    this.shieldFx?.destroy();
    this.shieldFx = null;
  }

  grantInvulnerability(ms: number): void {
    this.invulnerableUntil = this.now + ms;
  }

  isDashing(time: number): boolean {
    return time < this.dashUntil;
  }

  bounds(): Phaser.Geom.Rectangle {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
  }

  /** 回血（兔），返回实际回复量 */
  heal(amount: number): number {
    const before = this.hp;
    this.hp = Math.min(this.config.hp, this.hp + amount);
    return this.hp - before;
  }

  /** 狼突进：场景技能回调调用；短速度脉冲 + 短暂无敌 */
  applyDash(time: number): void {
    this.dashUntil = time + DASH_MS;
    this.invulnerableUntil = Math.max(this.invulnerableUntil, time + DASH_MS + 120);
    (this.body as Phaser.Physics.Arcade.Body).setVelocityX(this.facing * DASH_SPEED);
  }

  skillCooldownLeft(): number {
    return Math.max(0, this.nextSkillOkAt - this.now);
  }

  rollCooldownLeft(): number {
    return Math.max(0, this.rollCdUntil - this.now);
  }

  private updateInvulnerabilityVisual(time: number): void {
    if (time < this.invulnerableUntil) {
      this.setAlpha(Math.floor(time / 80) % 2 === 0 ? 0.45 : 1);
    } else {
      this.setAlpha(1);
    }
  }
}
